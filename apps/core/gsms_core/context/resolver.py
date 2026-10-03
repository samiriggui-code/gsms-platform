"""ContextResolver — autorité unique pour reconstruire le contexte métier GSMS."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.context.applications import APPLICATION_REGISTRY, ApplicationId
from gsms_core.context.catalog import SERVICE_CATALOG
from gsms_core.context.models import (
    BindingStatus,
    ClientApplicationBinding,
    Contact,
    ContactApplicationBinding,
    WorkspaceApplicationBinding,
)
from gsms_core.documents.models import Document
from gsms_core.events.models import Event
from gsms_core.identity.models import Organization, Site, Workspace, WorkspaceStatus
from gsms_core.missions.models import Mission
from gsms_core.work.models import Action, ActionStatus


@dataclass
class ResolvedContext:
    tenant_id: uuid.UUID | None
    client_id: uuid.UUID
    client_name: str
    site_id: uuid.UUID | None
    site_name: str | None
    engagement_id: uuid.UUID | None
    engagement_title: str | None
    engagement_type: str | None
    workspace_id: uuid.UUID
    workspace_name: str
    contact_ids: list[uuid.UUID] = field(default_factory=list)
    applications: list[dict[str, Any]] = field(default_factory=list)
    workflow: dict[str, Any] | None = None
    open_tasks: list[dict[str, Any]] = field(default_factory=list)
    documents: list[dict[str, Any]] = field(default_factory=list)
    recent_events: list[dict[str, Any]] = field(default_factory=list)
    permissions: list[str] = field(default_factory=list)

    def headers(self) -> dict[str, str]:
        """Headers à propager vers les apps (et le frontend commun)."""
        h = {
            "X-GSMS-Client-Id": str(self.client_id),
            "X-GSMS-Workspace-Id": str(self.workspace_id),
        }
        if self.tenant_id:
            h["X-GSMS-Tenant-Id"] = str(self.tenant_id)
        if self.site_id:
            h["X-GSMS-Site-Id"] = str(self.site_id)
        if self.engagement_id:
            h["X-GSMS-Engagement-Id"] = str(self.engagement_id)
            h["X-GSMS-Mission-Id"] = str(self.engagement_id)
        return h

    def to_dict(self) -> dict[str, Any]:
        return {
            "tenant_id": str(self.tenant_id) if self.tenant_id else None,
            "client_id": str(self.client_id),
            "client_name": self.client_name,
            "site_id": str(self.site_id) if self.site_id else None,
            "site_name": self.site_name,
            "engagement_id": str(self.engagement_id) if self.engagement_id else None,
            "engagement_title": self.engagement_title,
            "engagement_type": self.engagement_type,
            "workspace_id": str(self.workspace_id),
            "workspace_name": self.workspace_name,
            "contact_ids": [str(c) for c in self.contact_ids],
            "applications": self.applications,
            "workflow": self.workflow,
            "open_tasks": self.open_tasks,
            "documents": self.documents,
            "recent_events": self.recent_events,
            "permissions": self.permissions,
            "headers": self.headers(),
        }


class ContextResolver:
    def __init__(self, session: Session) -> None:
        self.session = session

    def resolve_from_workspace(self, workspace_id: uuid.UUID) -> ResolvedContext:
        ws = self.session.get(Workspace, workspace_id)
        if ws is None or ws.status != WorkspaceStatus.ACTIVE:
            raise LookupError("workspace")
        return self._build(ws)

    def resolve_from_engagement(self, engagement_id: uuid.UUID) -> ResolvedContext:
        mission = self.session.get(Mission, engagement_id)
        if mission is None:
            raise LookupError("engagement")
        return self.resolve_from_workspace(mission.workspace_id)

    def resolve_from_site(self, site_id: uuid.UUID) -> ResolvedContext:
        site = self.session.get(Site, site_id)
        if site is None:
            raise LookupError("site")
        ws = self.session.scalar(
            select(Workspace)
            .where(
                Workspace.site_id == site_id,
                Workspace.status == WorkspaceStatus.ACTIVE,
            )
            .order_by(Workspace.created_at.desc())
            .limit(1)
        )
        if ws is None:
            raise LookupError("workspace pour ce site")
        return self._build(ws)

    def resolve_from_client(self, client_id: uuid.UUID) -> ResolvedContext:
        org = self.session.get(Organization, client_id)
        if org is None:
            raise LookupError("client")
        ws = self.session.scalar(
            select(Workspace)
            .where(
                Workspace.organization_id == client_id,
                Workspace.status == WorkspaceStatus.ACTIVE,
            )
            .order_by(Workspace.created_at.desc())
            .limit(1)
        )
        if ws is None:
            raise LookupError("workspace pour ce client")
        return self._build(ws)

    def _build(self, ws: Workspace) -> ResolvedContext:
        client = self.session.get(Organization, ws.organization_id)
        if client is None:
            raise LookupError("client")
        site = self.session.get(Site, ws.site_id) if ws.site_id else None

        mission: Mission | None = None
        if ws.created_from_mission_id:
            mission = self.session.get(Mission, ws.created_from_mission_id)
        if mission is None:
            mission = self.session.scalar(
                select(Mission)
                .where(Mission.workspace_id == ws.id)
                .order_by(Mission.opened_at.desc())
                .limit(1)
            )

        engagement_type = None
        workflow = None
        if mission is not None:
            for spec in SERVICE_CATALOG.values():
                if spec.mission_type == mission.type:
                    engagement_type = spec.id
                    workflow = {
                        "engagement_type": spec.id,
                        "label": spec.label,
                        "steps": list(spec.workflow_steps),
                        "applications": [a.value for a in spec.applications],
                    }
                    break
            if engagement_type is None:
                engagement_type = mission.type.value.lower()

        contacts = list(
            self.session.scalars(select(Contact).where(Contact.organization_id == client.id))
        )
        bindings = list(
            self.session.scalars(
                select(WorkspaceApplicationBinding).where(
                    WorkspaceApplicationBinding.gsms_workspace_id == ws.id,
                    WorkspaceApplicationBinding.status != BindingStatus.DETACHED,
                )
            )
        )
        applications: list[dict[str, Any]] = []
        for binding in bindings:
            try:
                app_id = ApplicationId(binding.application_id)
                spec = APPLICATION_REGISTRY[app_id]
                label = spec.label
                capabilities = list(spec.capabilities)
            except (ValueError, KeyError):
                label = binding.application_id
                capabilities = []
            applications.append(
                {
                    "application_id": binding.application_id,
                    "label": label,
                    "external_workspace_id": binding.external_workspace_id,
                    "status": binding.status.value,
                    "capabilities": capabilities,
                }
            )

        actions = list(
            self.session.scalars(
                select(Action)
                .where(Action.workspace_id == ws.id)
                .order_by(Action.created_at.desc())
                .limit(20)
            )
        )
        open_tasks = [
            {
                "id": str(a.id),
                "title": a.title,
                "status": a.status.value,
            }
            for a in actions
            if a.status not in {ActionStatus.CLOSED, ActionStatus.CANCELLED}
        ]

        docs = list(
            self.session.scalars(
                select(Document)
                .where(Document.workspace_id == ws.id)
                .order_by(Document.created_at.desc())
                .limit(20)
            )
        )
        documents = [
            {
                "id": str(d.id),
                "title": d.title,
                "doc_type": d.doc_type,
                "status": d.status.value,
            }
            for d in docs
        ]

        events = list(
            self.session.scalars(
                select(Event)
                .where(Event.workspace_id == ws.id)
                .order_by(Event.occurred_at.desc())
                .limit(20)
            )
        )
        recent_events = [
            {
                "id": e.id,
                "type": e.type,
                "occurred_at": e.occurred_at.isoformat() if e.occurred_at else None,
                "subject": e.subject_uri,
            }
            for e in events
        ]

        return ResolvedContext(
            tenant_id=None,  # multi-tenant SaaS pas encore modélisé ; org GSMS ≠ tenant
            client_id=client.id,
            client_name=client.name,
            site_id=site.id if site else None,
            site_name=site.name if site else None,
            engagement_id=mission.id if mission else None,
            engagement_title=mission.title if mission else None,
            engagement_type=engagement_type,
            workspace_id=ws.id,
            workspace_name=ws.name,
            contact_ids=[c.id for c in contacts],
            applications=applications,
            workflow=workflow,
            open_tasks=open_tasks,
            documents=documents,
            recent_events=recent_events,
            permissions=[
                "read_client",
                "read_contacts",
                "read_site",
                "read_engagement",
                "read_documents",
                "read_workflow",
                "create_task",
                "create_note",
            ],
        )


def bind_client_to_app(
    session: Session,
    *,
    client_id: uuid.UUID,
    application_id: str,
    external_client_id: str,
) -> ClientApplicationBinding:
    existing = session.scalar(
        select(ClientApplicationBinding).where(
            ClientApplicationBinding.client_id == client_id,
            ClientApplicationBinding.application_id == application_id,
        )
    )
    if existing:
        existing.external_client_id = external_client_id
        existing.status = BindingStatus.ACTIVE
        session.add(existing)
        session.flush()
        return existing
    row = ClientApplicationBinding(
        client_id=client_id,
        application_id=application_id,
        external_client_id=external_client_id,
    )
    session.add(row)
    session.flush()
    return row


def bind_contact_to_app(
    session: Session,
    *,
    contact_id: uuid.UUID,
    application_id: str,
    external_contact_id: str,
) -> ContactApplicationBinding:
    existing = session.scalar(
        select(ContactApplicationBinding).where(
            ContactApplicationBinding.contact_id == contact_id,
            ContactApplicationBinding.application_id == application_id,
        )
    )
    if existing:
        existing.external_contact_id = external_contact_id
        existing.status = BindingStatus.ACTIVE
        session.add(existing)
        session.flush()
        return existing
    row = ContactApplicationBinding(
        contact_id=contact_id,
        application_id=application_id,
        external_contact_id=external_contact_id,
    )
    session.add(row)
    session.flush()
    return row
