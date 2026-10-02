"""Missions : toute lecture est filtrée par ``workspace_id`` (une mission d'un autre site = introuvable)."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.db import utcnow
from gsms_core.events.bus import publish
from gsms_core.events.envelope import EventEnvelope
from gsms_core.missions.models import ExternalReference, Mission, MissionStatus
from gsms_core.missions.schemas import ExternalRefIn, MissionIn, MissionPatch
from gsms_core.missions.uri import core_uri, parse_uri


class NotFound(LookupError):
    pass


def list_missions(
    session: Session, workspace_id: uuid.UUID, status: MissionStatus | None = None
) -> list[Mission]:
    stmt = select(Mission).where(Mission.workspace_id == workspace_id)
    if status:
        stmt = stmt.where(Mission.status == status)
    return list(session.scalars(stmt.order_by(Mission.opened_at.desc())))


def get_mission(session: Session, workspace_id: uuid.UUID, mission_id: uuid.UUID) -> Mission:
    mission = session.scalar(
        select(Mission).where(Mission.id == mission_id, Mission.workspace_id == workspace_id)
    )
    if mission is None:
        raise NotFound("mission")
    return mission


def _snapshot(m: Mission) -> dict:
    return {
        "title": m.title,
        "status": m.status.value,
        "type": m.type.value,
        "due_at": m.due_at.isoformat() if m.due_at else None,
    }


def create_mission(
    session: Session,
    workspace_id: uuid.UUID,
    data: MissionIn,
    actor: str,
    default_owner: uuid.UUID | None = None,
) -> Mission:
    mission = Mission(
        workspace_id=workspace_id,
        type=data.type,
        title=data.title,
        due_at=data.due_at,
        origin=data.origin,
        owner_id=data.owner_id or default_owner,
    )
    session.add(mission)
    session.flush()
    uri = core_uri("mission", mission.id)
    record(
        session,
        actor=actor,
        action="mission.create",
        subject_uri=uri,
        workspace_id=workspace_id,
        after=_snapshot(mission),
    )
    publish(
        session,
        EventEnvelope(
            type="mission.created",
            source="core",
            subject=uri,
            workspace_id=workspace_id,
            mission_id=mission.id,
            actor=actor,
            data={"type": mission.type.value, "title": mission.title},
        ),
    )
    return mission


def update_mission(session: Session, mission: Mission, patch: MissionPatch, actor: str) -> Mission:
    before = _snapshot(mission)
    for field in patch.model_fields_set:
        setattr(mission, field, getattr(patch, field))
    if mission.status in (MissionStatus.COMPLETED, MissionStatus.CANCELLED) and mission.closed_at is None:
        mission.closed_at = utcnow()
    session.flush()
    uri = core_uri("mission", mission.id)
    record(
        session,
        actor=actor,
        action="mission.update",
        subject_uri=uri,
        workspace_id=mission.workspace_id,
        before=before,
        after=_snapshot(mission),
    )
    if mission.status == MissionStatus.COMPLETED and before["status"] != MissionStatus.COMPLETED.value:
        publish(
            session,
            EventEnvelope(
                type="mission.completed",
                source="core",
                subject=uri,
                workspace_id=mission.workspace_id,
                mission_id=mission.id,
                actor=actor,
            ),
        )
    return mission


def add_external_ref(
    session: Session, mission: Mission, data: ExternalRefIn, actor: str
) -> ExternalReference:
    parsed = parse_uri(data.uri)
    ref = ExternalReference(
        mission_id=mission.id,
        workspace_id=mission.workspace_id,
        uri=str(parsed),
        system=parsed.system,
        kind=parsed.kind,
        external_id=parsed.external_id,
        url=data.url,
        status_snapshot=data.status_snapshot,
        synced_at=utcnow() if data.status_snapshot else None,
    )
    session.add(ref)
    session.flush()
    record(
        session,
        actor=actor,
        action="mission.external_ref.add",
        subject_uri=core_uri("mission", mission.id),
        workspace_id=mission.workspace_id,
        after={"uri": ref.uri},
    )
    return ref


def list_external_refs(session: Session, mission: Mission) -> list[ExternalReference]:
    return list(
        session.scalars(
            select(ExternalReference).where(
                ExternalReference.workspace_id == mission.workspace_id,
                ExternalReference.mission_id == mission.id,
            )
        )
    )
