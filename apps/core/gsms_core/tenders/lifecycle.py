"""Cycle de vie du dossier de réponse : DRAFT → REVIEW → READY → APPROVED → SUBMITTED.

Le système prépare et contrôle ; seul un humain fait avancer le dossier. Rien n'est déposé
automatiquement : SUBMITTED enregistre un dépôt fait par une personne, avec sa référence.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.events.bus import publish
from gsms_core.events.envelope import EventEnvelope
from gsms_core.identity.models import CONTRIBUTE_ROLES, MANAGE_ROLES, Role, Workspace
from gsms_core.missions.uri import core_uri
from gsms_core.tenders.models import DossierStatus, GoNoGo, TenderCase, TenderStatusChange
from gsms_core.vault.folders import CLIENT_ROLES

S = DossierStatus

STATUS_LABELS: dict[DossierStatus, str] = {
    S.DRAFT: "Brouillon",
    S.REVIEW: "En relecture",
    S.READY: "Prêt",
    S.APPROVED: "Approuvé",
    S.SUBMITTED: "Déposé",
}


@dataclass(frozen=True)
class Transition:
    source: DossierStatus
    target: DossierStatus
    label: str
    roles: frozenset[Role]
    comment_required: bool = False
    requires_go: bool = False


TRANSITIONS: tuple[Transition, ...] = (
    Transition(S.DRAFT, S.REVIEW, "Soumettre à relecture", CONTRIBUTE_ROLES),
    Transition(S.REVIEW, S.DRAFT, "Renvoyer en brouillon", CONTRIBUTE_ROLES, comment_required=True),
    Transition(S.REVIEW, S.READY, "Déclarer prêt", MANAGE_ROLES, requires_go=True),
    Transition(S.READY, S.REVIEW, "Rouvrir la relecture", CONTRIBUTE_ROLES, comment_required=True),
    Transition(
        S.READY, S.APPROVED, "Approuver le dossier", MANAGE_ROLES, comment_required=True, requires_go=True
    ),
    Transition(S.APPROVED, S.REVIEW, "Retirer l'approbation", MANAGE_ROLES, comment_required=True),
    Transition(
        S.APPROVED,
        S.SUBMITTED,
        "Enregistrer le dépôt",
        MANAGE_ROLES,
        comment_required=True,
        requires_go=True,
    ),
)


class LifecycleError(ValueError):
    pass


class LifecycleForbidden(PermissionError):
    pass


def available(case: TenderCase, role: Role) -> list[Transition]:
    """Transitions offertes à ce rôle depuis le statut courant (les gardes métier restent vérifiées)."""
    if role in CLIENT_ROLES:
        return []
    return [t for t in TRANSITIONS if t.source == case.status and role in t.roles]


def _find(source: DossierStatus, target: DossierStatus) -> Transition | None:
    return next((t for t in TRANSITIONS if t.source == source and t.target == target), None)


def change_status(
    session: Session,
    case: TenderCase,
    target: DossierStatus,
    *,
    actor: str,
    role: Role,
    comment: str | None = None,
) -> TenderStatusChange:
    if not actor.startswith("user:"):
        raise LifecycleForbidden("le statut du dossier ne change que sur décision humaine")
    t = _find(case.status, target)
    if t is None:
        raise LifecycleError(f"passage {case.status.value} → {target.value} impossible")
    if role in CLIENT_ROLES or role not in t.roles:
        raise LifecycleForbidden(f"rôle {role.value} insuffisant pour « {t.label} »")
    note = (comment or "").strip() or None
    if t.comment_required and note is None:
        raise LifecycleError("commentaire obligatoire pour cette étape")
    if t.requires_go and case.decision != GoNoGo.GO:
        raise LifecycleError("décision GO requise avant cette étape")

    before = case.status
    case.status = target
    change = TenderStatusChange(
        case_id=case.id,
        workspace_id=case.workspace_id,
        from_status=before,
        to_status=target,
        actor=actor,
        comment=note,
    )
    session.add(change)
    session.flush()

    ws = session.get(Workspace, case.workspace_id)
    reference = ws.reference if ws else None
    uri = core_uri("tender", case.id)
    record(
        session,
        actor=actor,
        action="tender.status.change",
        subject_uri=uri,
        workspace_id=case.workspace_id,
        before={"status": before.value},
        after={"status": target.value, "comment": note},
    )
    data = {"from": before.value, "to": target.value, "comment": note, "reference": reference}
    envelope = EventEnvelope(
        type="tender.status.changed",
        source="core",
        subject=uri,
        workspace_id=case.workspace_id,
        mission_id=case.mission_id,
        actor=actor,
        data=data,
    )
    publish(session, envelope)
    if target == S.SUBMITTED:
        publish(session, envelope.caused(type="tender.submitted", subject=uri, actor=actor, data=data))
    return change


def history(session: Session, case: TenderCase) -> list[TenderStatusChange]:
    return list(
        session.scalars(
            select(TenderStatusChange)
            .where(TenderStatusChange.case_id == case.id)
            .order_by(TenderStatusChange.created_at.desc())
        )
    )
