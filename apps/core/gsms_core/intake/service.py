"""WF-INTAKE minimal : demande publique → org/workspace temporaire → mission DRAFT → event → CRM."""

from __future__ import annotations

import logging
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.connectors.base import CallContext, ConnectorError
from gsms_core.connectors.crm import CrmClient
from gsms_core.events.bus import publish
from gsms_core.events.envelope import EventEnvelope
from gsms_core.identity.models import (
    Organization,
    OrganizationKind,
    Workspace,
    WorkspaceKind,
    WorkspaceStatus,
)
from gsms_core.intake.models import IntakeReceipt
from gsms_core.intake.schemas import IntakeIn, IntakeOut
from gsms_core.missions.models import Mission, MissionOrigin, MissionStatus, MissionType
from gsms_core.missions.uri import core_uri
from gsms_core.settings import Settings

log = logging.getLogger("gsms_core.intake")

_INBOX_WS_NAME = "Inbox commercial"
_TYPE_TO_MISSION: dict[str, MissionType] = {
    "audit": MissionType.AUDIT,
    "ao": MissionType.APPEL_OFFRES,
    "contact": MissionType.AUTRE,
}
_DEFAULT_TITLES: dict[str, str] = {
    "audit": "Demande d'audit de sécurité",
    "ao": "Demande accompagnement AO",
    "contact": "Contact vitrine GSMS",
}


class IntakeError(ValueError):
    pass


def accept_intake(
    session: Session,
    body: IntakeIn,
    *,
    idempotency_key: str,
    settings: Settings,
    crm: CrmClient | None = None,
) -> tuple[IntakeOut, bool]:
    """Retourne ``(out, created)``. Rejoue la réponse si la clé est déjà connue."""
    key = _normalize_key(idempotency_key)
    existing = session.get(IntakeReceipt, key)
    if existing is not None:
        return IntakeOut.model_validate(existing.response), False

    _validate_business(body)

    workspace = _resolve_workspace(session, body)
    mission = Mission(
        workspace_id=workspace.id,
        type=_TYPE_TO_MISSION[body.type],
        title=_mission_title(body),
        status=MissionStatus.DRAFT,
        origin=MissionOrigin.INTAKE,
    )
    session.add(mission)
    session.flush()

    event_id = f"evt_intake_{key[:40]}"
    uri = core_uri("mission", mission.id)
    actor = f"intake:{body.email}"
    data = {
        "type": body.type,
        "email": str(body.email),
        "firstName": body.firstName,
        "lastName": body.lastName,
        "companyName": body.companyName,
        "phone": body.phone,
        "title": body.title,
        "subject": body.subject,
        "message": body.message,
        "etablissement": body.etablissement,
        "echeanceCommission": body.echeanceCommission,
        "referenceAo": body.referenceAo,
        "cta": body.cta,
        "offer": body.offer,
        "source": body.source or "web",
    }
    publish(
        session,
        EventEnvelope(
            id=event_id,
            type="intake.request.received",
            source="core",
            subject=uri,
            workspace_id=workspace.id,
            mission_id=mission.id,
            actor=actor,
            data={k: v for k, v in data.items() if v is not None},
            correlation_id=key,
        ),
    )
    record(
        session,
        actor=actor,
        action="intake.accept",
        subject_uri=uri,
        workspace_id=workspace.id,
        after={"type": body.type, "email": str(body.email), "company": body.companyName},
    )

    crm_ref, status = _relay_crm(session, body, workspace, mission, settings, crm)

    out = IntakeOut(
        id=event_id,
        status=status,
        mission_id=str(mission.id),
        workspace_id=str(workspace.id),
    )
    receipt = IntakeReceipt(
        idempotency_key=key,
        request_type=body.type,
        email=str(body.email),
        company_name=body.companyName,
        workspace_id=workspace.id,
        mission_id=mission.id,
        event_id=event_id,
        status=status,
        crm_ref=crm_ref,
        response=out.model_dump(),
    )
    session.add(receipt)
    session.flush()
    return out, True


def _normalize_key(key: str) -> str:
    cleaned = key.strip()
    if not re.fullmatch(r"[\w-]{8,64}", cleaned):
        raise IntakeError("Idempotency-Key invalide (8-64 caractères alphanumériques, _ ou -)")
    return cleaned


def _validate_business(body: IntakeIn) -> None:
    if body.type != "contact" and not (body.companyName and body.companyName.strip()):
        raise IntakeError("Indiquez votre organisation ou établissement.")
    if body.type == "contact" and not (body.message and body.message.strip()):
        raise IntakeError("Le message est requis.")


def _mission_title(body: IntakeIn) -> str:
    if body.title and body.title.strip():
        return body.title.strip()
    if body.subject and body.subject.strip():
        return body.subject.strip()
    company = (body.companyName or "").strip()
    base = _DEFAULT_TITLES[body.type]
    return f"{base} — {company}" if company else base


def _resolve_workspace(session: Session, body: IntakeIn) -> Workspace:
    company = (body.companyName or "").strip()
    if company:
        org = session.scalar(
            select(Organization).where(
                Organization.name == company, Organization.kind == OrganizationKind.CLIENT
            )
        )
        if org is None:
            org = Organization(name=company, kind=OrganizationKind.CLIENT)
            session.add(org)
            session.flush()
        ws = session.scalar(
            select(Workspace).where(
                Workspace.organization_id == org.id,
                Workspace.kind == WorkspaceKind.TEMPORARY,
                Workspace.status == WorkspaceStatus.ACTIVE,
            )
        )
        if ws is None:
            ws = Workspace(
                organization_id=org.id,
                name=f"Demande — {company}"[:200],
                kind=WorkspaceKind.TEMPORARY,
            )
            session.add(ws)
            session.flush()
        return ws

    gsms = session.scalar(select(Organization).where(Organization.kind == OrganizationKind.GSMS))
    if gsms is None:
        gsms = Organization(name="GSMS", kind=OrganizationKind.GSMS)
        session.add(gsms)
        session.flush()
    inbox = session.scalar(
        select(Workspace).where(Workspace.organization_id == gsms.id, Workspace.name == _INBOX_WS_NAME)
    )
    if inbox is None:
        inbox = Workspace(
            organization_id=gsms.id,
            name=_INBOX_WS_NAME,
            kind=WorkspaceKind.TEMPORARY,
        )
        session.add(inbox)
        session.flush()
    return inbox


def _relay_crm(
    session: Session,
    body: IntakeIn,
    workspace: Workspace,
    mission: Mission,
    settings: Settings,
    crm: CrmClient | None,
) -> tuple[str | None, str]:
    """Best-effort : l'échec CRM ne bloque pas la réception Core."""
    if not settings.crm_url or not settings.crm_public_key:
        return None, "received"

    own_client = crm is None
    client = crm or CrmClient(settings.crm_url, public_key=settings.crm_public_key)
    ctx = CallContext(
        workspace_id=workspace.id,
        mission_id=mission.id,
        actor=f"intake:{body.email}",
        correlation_id=str(mission.id),
    )
    try:
        result = client.submit_public_intake(ctx, body.model_dump(exclude_none=True))
        return _extract_crm_ref(result), "relayed"
    except ConnectorError as exc:
        log.warning("relay CRM échoué pour mission %s : %s", mission.id, exc)
        return None, "received"
    finally:
        if own_client:
            client.close()


def _extract_crm_ref(result: Any) -> str | None:
    if not isinstance(result, dict):
        return None
    for key in ("dealId", "deal_id", "id", "activityId"):
        value = result.get(key)
        if value is not None:
            return f"crm://{key}/{value}"
    data = result.get("data")
    if isinstance(data, dict):
        return _extract_crm_ref(data)
    return None
