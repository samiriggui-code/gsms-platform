"""Synchronisation CRM → Core.

Le CRM (Camp AI / Eve) est l'outil commercial : sociétés, contacts, affaires. Le Core est l'autorité des
clients, sites et prestations. Le CRM pousse ses événements (``company.created``, ``deal.stage.changed``…)
avec un
instantané de l'enregistrement ; le Core :

- crée ou met à jour le client (``Organization``) et un site par défaut, liés à la société du CRM ;
- crée ou met à jour le contact, lié au contact du CRM ;
- quand une affaire passe à « Gagné », ouvre la prestation : workspace dédié + mission du bon type (appel
  d'offres, audit, commission…) via ``WorkspaceManager``, liée à l'affaire ; il renvoie l'adresse au CRM ;
- pour une affaire déjà liée, publie l'événement sur le workspace (timeline de la prestation).

Tout est idempotent (liaisons ``*ApplicationBinding``, application ``camp_ai``) : un événement rejoué ne
crée rien de plus.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.context.applications import ApplicationId
from gsms_core.context.models import (
    BindingStatus,
    ClientApplicationBinding,
    Contact,
    ContactApplicationBinding,
    WorkspaceApplicationBinding,
)
from gsms_core.context.workspace_manager import WorkspaceManager
from gsms_core.db import utcnow
from gsms_core.events.bus import publish
from gsms_core.events.envelope import EventEnvelope
from gsms_core.identity.models import Organization, OrganizationKind, Site, Workspace
from gsms_core.missions.models import MissionOrigin
from gsms_core.missions.uri import core_uri

APP = ApplicationId.CAMP_AI.value
ACTOR = "service:crm"
WON = "CLOSED_WON"

# Type de mission du CRM (champ « Type de mission ») → type d'engagement du catalogue du Core.
ENGAGEMENT_BY_MISSION = {
    "appel-offres": "tender",
    "audit": "security_audit",
    "commission-securite": "commission_preparation",
    "accompagnement": "consulting",
    "conformite": "compliance",
    "contact": "consulting",
}
DEFAULT_ENGAGEMENT = "consulting"


class CrmSyncError(ValueError):
    pass


@dataclass(frozen=True)
class SyncResult:
    client_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    workspace_id: uuid.UUID | None = None
    workspace_name: str | None = None
    created_workspace: bool = False


def _text(value: Any, limit: int) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text[:limit] or None


def _siren(fields: dict) -> str | None:
    digits = "".join(c for c in str(fields.get("siret") or "") if c.isdigit())
    return digits[:9] if len(digits) >= 9 else None


def _erp_category(value: Any) -> str | None:
    """« 3e catégorie (301 à 700) » → « 3 »."""
    digit = next((c for c in str(value or "") if c.isdigit()), None)
    return digit if digit and digit in "12345" else None


def upsert_company(session: Session, company: dict) -> Organization:
    external_id = _text(company.get("id"), 300)
    name = _text(company.get("name"), 200)
    if not external_id or not name:
        raise CrmSyncError("société : id et nom requis")
    binding = session.scalar(
        select(ClientApplicationBinding).where(
            ClientApplicationBinding.application_id == APP,
            ClientApplicationBinding.external_client_id == external_id,
        )
    )
    fields = company.get("fields") or {}
    org = session.get(Organization, binding.client_id) if binding else None
    if org is None:
        org = Organization(name=name, kind=OrganizationKind.CLIENT, crm_company_ref=external_id)
        session.add(org)
        session.flush()
        session.add(
            ClientApplicationBinding(
                client_id=org.id,
                application_id=APP,
                external_client_id=external_id,
                status=BindingStatus.ACTIVE,
                metadata_={"domain": company.get("domain")},
            )
        )
        record(
            session,
            actor=ACTOR,
            action="client.create",
            subject_uri=core_uri("client", org.id),
            after={"name": name, "crm_company_id": external_id},
        )
    else:
        org.name = name
        org.crm_company_ref = external_id
    org.siren = _siren(fields) or org.siren
    _ensure_site(session, org, company)
    session.flush()
    return org


def _ensure_site(session: Session, org: Organization, company: dict) -> Site:
    site = session.scalar(select(Site).where(Site.organization_id == org.id).order_by(Site.created_at))
    if site is not None:
        return site
    fields = company.get("fields") or {}
    city = _text(company.get("city"), 120)
    site = Site(
        organization_id=org.id,
        name=_text(f"{org.name} — {city}" if city else org.name, 200),
        address=_text(", ".join(p for p in (company.get("city"), company.get("country")) if p), 500),
        erp_type=_text(fields.get("types_dactivit_erp"), 10),
        erp_category=_erp_category(fields.get("cat_gorie_erp")),
    )
    session.add(site)
    session.flush()
    return site


def upsert_contact(session: Session, contact: dict, org: Organization) -> Contact:
    external_id = _text(contact.get("id"), 300)
    if not external_id:
        raise CrmSyncError("contact : id requis")
    binding = session.scalar(
        select(ContactApplicationBinding).where(
            ContactApplicationBinding.application_id == APP,
            ContactApplicationBinding.external_contact_id == external_id,
        )
    )
    row = session.get(Contact, binding.contact_id) if binding else None
    if row is None:
        row = Contact(organization_id=org.id)
        session.add(row)
        session.flush()
        session.add(
            ContactApplicationBinding(contact_id=row.id, application_id=APP, external_contact_id=external_id)
        )
    row.organization_id = org.id
    row.email = _text(contact.get("email"), 320)
    row.first_name = _text(contact.get("firstName"), 120)
    row.last_name = _text(contact.get("lastName"), 120)
    row.phone = _text(contact.get("phone"), 40)
    row.title = _text(contact.get("title"), 200)
    session.flush()
    return row


def _deal_binding(session: Session, deal_id: str) -> WorkspaceApplicationBinding | None:
    return session.scalar(
        select(WorkspaceApplicationBinding).where(
            WorkspaceApplicationBinding.application_id == APP,
            WorkspaceApplicationBinding.external_workspace_id == f"deal:{deal_id}",
        )
    )


def _title(name: Any, client: str) -> str:
    """Titre de la prestation : le nom de l'affaire, sans le nom du client s'il le répète en suffixe."""
    title = _text(name, 300) or "Prestation"
    for sep in (" — ", " - ", " \u2013 "):
        suffix = f"{sep}{client}"
        if title.endswith(suffix) and len(title) > len(suffix):
            return title[: -len(suffix)]
    return title


def handle_deal(session: Session, event_type: str, deal: dict) -> SyncResult:
    deal_id = _text(deal.get("id"), 200)
    company = deal.get("company")
    if not deal_id or not isinstance(company, dict):
        raise CrmSyncError("affaire : id et société requis")
    org = upsert_company(session, company)
    binding = _deal_binding(session, deal_id)
    stage = str(deal.get("stage") or "")
    created = False
    if binding is None and stage == WON:
        site = _ensure_site(session, org, company)
        mission_type = str((deal.get("fields") or {}).get("type_de_mission") or "").strip().lower()
        engagement = ENGAGEMENT_BY_MISSION.get(mission_type, DEFAULT_ENGAGEMENT)
        manager = WorkspaceManager(session)
        made = manager.create_workspace_for_engagement(
            client_id=org.id,
            site_id=site.id,
            engagement_type=engagement,
            title=_title(deal.get("name"), org.name),
            actor=ACTOR,
            origin=MissionOrigin.CRM,
            description=_text(deal.get("description"), 2000),
        )
        binding = manager.attach_application(
            workspace_id=made.workspace_id,
            application_id=APP,
            external_workspace_id=f"deal:{deal_id}",
            mission_id=made.engagement_id,
            metadata={"deal_id": deal_id, "amount": deal.get("amount"), "currency": deal.get("currency")},
        )
        created = True
    if binding is None:
        return SyncResult(client_id=org.id)
    workspace = session.get(Workspace, binding.gsms_workspace_id)
    publish(
        session,
        EventEnvelope(
            type=f"crm.{event_type}",
            source="crm",
            subject=f"crm://deal/{deal_id}",
            workspace_id=binding.gsms_workspace_id,
            mission_id=binding.mission_id,
            actor=ACTOR,
            data={"stage": stage, "name": deal.get("name"), "amount": deal.get("amount")},
        ),
    )
    binding.updated_at = utcnow()
    return SyncResult(
        client_id=org.id,
        workspace_id=binding.gsms_workspace_id,
        workspace_name=workspace.name if workspace else None,
        created_workspace=created,
    )


def handle(session: Session, event_type: str, data: dict) -> SyncResult:
    kind = event_type.split(".", 1)[0]
    if kind == "company":
        return SyncResult(client_id=upsert_company(session, data).id)
    if kind == "contact":
        company = data.get("company")
        if not isinstance(company, dict):
            return SyncResult()  # contact sans société : rien à rattacher côté Core
        org = upsert_company(session, company)
        return SyncResult(client_id=org.id, contact_id=upsert_contact(session, data, org).id)
    if kind == "deal":
        return handle_deal(session, event_type, data)
    raise CrmSyncError(f"type d'événement inconnu : {event_type}")
