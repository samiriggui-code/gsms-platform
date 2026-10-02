from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.events.bus import publish
from gsms_core.events.envelope import EventEnvelope
from gsms_core.events.models import Event
from gsms_core.events.schemas import IngestIn
from gsms_core.identity.models import Workspace


class UnknownWorkspace(LookupError):
    pass


def ingest(session: Session, source: str, body: IngestIn) -> tuple[Event, bool]:
    if session.get(Workspace, body.workspace_id) is None:
        raise UnknownWorkspace(str(body.workspace_id))
    fields = body.model_dump(exclude_none=True)
    fields.update(source=source, actor=body.actor or f"service:{source}")
    return publish(session, EventEnvelope(**fields))


def list_events(
    session: Session,
    workspace_id: uuid.UUID,
    *,
    type_: str | None = None,
    mission_id: uuid.UUID | None = None,
    subject: str | None = None,
    limit: int = 100,
) -> list[Event]:
    stmt = select(Event).where(Event.workspace_id == workspace_id)
    if type_:
        stmt = stmt.where(Event.type == type_)
    if mission_id:
        stmt = stmt.where(Event.mission_id == mission_id)
    if subject:
        stmt = stmt.where(Event.subject_uri == subject)
    return list(
        session.scalars(stmt.order_by(Event.received_at.desc(), Event.id.desc()).limit(min(limit, 500)))
    )
