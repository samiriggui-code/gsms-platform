"""WorkspaceManager — création déterministe workspace + attachements apps pour un engagement."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.context.applications import ApplicationId, get_application
from gsms_core.context.catalog import resolve_engagement_type
from gsms_core.context.models import BindingStatus, WorkspaceApplicationBinding
from gsms_core.db import utcnow
from gsms_core.events.bus import publish
from gsms_core.events.envelope import EventEnvelope
from gsms_core.identity.models import Organization, Site, Workspace, WorkspaceKind, WorkspaceStatus
from gsms_core.missions.models import Mission, MissionOrigin, MissionStatus
from gsms_core.missions.uri import core_uri


class WorkspaceManagerError(RuntimeError):
    pass


@dataclass(frozen=True)
class EngagementWorkspace:
    client_id: uuid.UUID
    site_id: uuid.UUID
    engagement_id: uuid.UUID
    workspace_id: uuid.UUID
    engagement_type: str
    applications: tuple[str, ...]


class WorkspaceManager:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_workspace_for_engagement(
        self,
        *,
        client_id: uuid.UUID,
        site_id: uuid.UUID,
        engagement_type: str,
        title: str,
        actor: str,
        owner_id: uuid.UUID | None = None,
        origin: MissionOrigin = MissionOrigin.MANUAL,
        attach_catalog_apps: bool = True,
        description: str | None = None,
    ) -> EngagementWorkspace:
        """Crée Mission + Workspace (ou réutilise le workspace du site) de façon déterministe.

        Règle : 1 engagement (Mission) → 1 workspace temporaire dédié si le site a déjà
        un workspace permanent, sinon crée le workspace site puis la mission.
        Pour la V1 : un workspace TEMPORARY par engagement, lié au site/client.
        """
        client = self.session.get(Organization, client_id)
        if client is None:
            raise WorkspaceManagerError("client introuvable")
        site = self.session.get(Site, site_id)
        if site is None or site.organization_id != client_id:
            raise WorkspaceManagerError("site introuvable pour ce client")

        spec = resolve_engagement_type(engagement_type)
        workspace = Workspace(
            organization_id=client_id,
            site_id=site_id,
            name=f"{site.name} — {title}"[:200],
            kind=WorkspaceKind.TEMPORARY,
            status=WorkspaceStatus.ACTIVE,
        )
        self.session.add(workspace)
        self.session.flush()

        mission = Mission(
            workspace_id=workspace.id,
            type=spec.mission_type,
            title=title[:300],
            status=MissionStatus.OPEN,
            owner_id=owner_id,
            origin=origin,
        )
        self.session.add(mission)
        self.session.flush()

        workspace.created_from_mission_id = mission.id
        self.session.add(workspace)
        self.session.flush()

        apps: list[str] = []
        if attach_catalog_apps:
            for app_id in spec.applications:
                self.attach_application(
                    workspace_id=workspace.id,
                    application_id=app_id,
                    external_workspace_id=f"pending:{app_id.value}:{mission.id}",
                    mission_id=mission.id,
                    status=BindingStatus.PENDING,
                )
                apps.append(app_id.value)

        subject = core_uri("mission", mission.id)
        record(
            self.session,
            actor=actor,
            action="engagement.create",
            subject_uri=subject,
            workspace_id=workspace.id,
            after={
                "engagement_type": engagement_type,
                "title": title,
                "description": description,
                "applications": apps,
            },
        )
        publish(
            self.session,
            EventEnvelope(
                type="engagement.created",
                source="core",
                subject=subject,
                workspace_id=workspace.id,
                mission_id=mission.id,
                actor=actor,
                data={
                    "client_id": str(client_id),
                    "site_id": str(site_id),
                    "engagement_id": str(mission.id),
                    "workspace_id": str(workspace.id),
                    "engagement_type": engagement_type,
                    "applications": apps,
                },
            ),
        )
        publish(
            self.session,
            EventEnvelope(
                type="workspace.created",
                source="core",
                subject=core_uri("workspace", workspace.id),
                workspace_id=workspace.id,
                mission_id=mission.id,
                actor=actor,
                data={"kind": workspace.kind.value, "site_id": str(site_id)},
            ),
        )
        return EngagementWorkspace(
            client_id=client_id,
            site_id=site_id,
            engagement_id=mission.id,
            workspace_id=workspace.id,
            engagement_type=engagement_type,
            applications=tuple(apps),
        )

    def attach_application(
        self,
        *,
        workspace_id: uuid.UUID,
        application_id: ApplicationId | str,
        external_workspace_id: str,
        mission_id: uuid.UUID | None = None,
        status: BindingStatus = BindingStatus.ACTIVE,
        metadata: dict | None = None,
    ) -> WorkspaceApplicationBinding:
        app = get_application(application_id)
        if not app.bindable:
            raise ValueError(f"{app.label} est un moteur technique : il ne se lie pas à un workspace")
        existing = self.session.scalar(
            select(WorkspaceApplicationBinding).where(
                WorkspaceApplicationBinding.gsms_workspace_id == workspace_id,
                WorkspaceApplicationBinding.application_id == app.id.value,
            )
        )
        if existing is not None:
            existing.external_workspace_id = external_workspace_id
            existing.status = status
            existing.mission_id = mission_id or existing.mission_id
            existing.metadata_ = metadata
            existing.updated_at = utcnow()
            self.session.add(existing)
            self.session.flush()
            return existing

        binding = WorkspaceApplicationBinding(
            gsms_workspace_id=workspace_id,
            application_id=app.id.value,
            external_workspace_id=external_workspace_id,
            status=status,
            mission_id=mission_id,
            metadata_=metadata,
        )
        self.session.add(binding)
        self.session.flush()
        publish(
            self.session,
            EventEnvelope(
                type="application.attached",
                source="core",
                subject=core_uri("workspace", workspace_id),
                workspace_id=workspace_id,
                mission_id=mission_id,
                actor="system:workspace_manager",
                data={
                    "application_id": app.id.value,
                    "external_workspace_id": external_workspace_id,
                    "status": status.value,
                },
            ),
        )
        return binding

    def detach_application(self, *, workspace_id: uuid.UUID, application_id: ApplicationId | str) -> None:
        app = get_application(application_id)
        binding = self.session.scalar(
            select(WorkspaceApplicationBinding).where(
                WorkspaceApplicationBinding.gsms_workspace_id == workspace_id,
                WorkspaceApplicationBinding.application_id == app.id.value,
            )
        )
        if binding is None:
            return
        binding.status = BindingStatus.DETACHED
        binding.updated_at = utcnow()
        self.session.add(binding)
        self.session.flush()

    def resolve_application_workspace(
        self, *, workspace_id: uuid.UUID, application_id: ApplicationId | str
    ) -> WorkspaceApplicationBinding | None:
        app = get_application(application_id)
        return self.session.scalar(
            select(WorkspaceApplicationBinding).where(
                WorkspaceApplicationBinding.gsms_workspace_id == workspace_id,
                WorkspaceApplicationBinding.application_id == app.id.value,
                WorkspaceApplicationBinding.status != BindingStatus.DETACHED,
            )
        )

    def archive_workspace(self, *, workspace_id: uuid.UUID, actor: str) -> Workspace:
        ws = self.session.get(Workspace, workspace_id)
        if ws is None:
            raise WorkspaceManagerError("workspace introuvable")
        ws.status = WorkspaceStatus.ARCHIVED
        self.session.add(ws)
        self.session.flush()
        record(
            self.session,
            actor=actor,
            action="workspace.archive",
            subject_uri=core_uri("workspace", workspace_id),
            workspace_id=workspace_id,
            after={"status": ws.status.value},
        )
        return ws

    def list_bindings(self, workspace_id: uuid.UUID) -> list[WorkspaceApplicationBinding]:
        return list(
            self.session.scalars(
                select(WorkspaceApplicationBinding).where(
                    WorkspaceApplicationBinding.gsms_workspace_id == workspace_id
                )
            )
        )
