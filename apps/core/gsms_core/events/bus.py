"""Publication in-process : persistance (event + outbox) dans la transaction courante, puis dispatch
synchrone aux abonnés (moteur de workflows). Les envois sortants passent par l'outbox, drainée par un
worker (Celery, phase ultérieure)."""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.events.envelope import EventEnvelope, type_matches
from gsms_core.events.models import Event, Outbox, OutboxStatus

log = logging.getLogger(__name__)

Handler = Callable[[Session, EventEnvelope], None]

# Routage sortant : type d'événement → destinations de l'outbox.
OUTBOX_ROUTES: dict[str, tuple[str, ...]] = {
    "capa.requested": ("qatrial",),
    "action.closed": ("grace",),
    "intake.request.received": ("crm",),
    "tender.go_no_go.decided": ("crm",),
    "tender.submitted": ("crm",),
}


@dataclass
class EventBus:
    handlers: list[tuple[str, Handler, str | None]] = field(default_factory=list)
    max_depth: int = 8

    def subscribe(self, pattern: str, handler: Handler, group: str | None = None) -> None:
        self.handlers.append((pattern, handler, group))

    def replace_group(self, group: str, handlers: list[tuple[str, Handler]]) -> None:
        self.handlers = [h for h in self.handlers if h[2] != group]
        for pattern, handler in handlers:
            self.subscribe(pattern, handler, group)

    def publish(self, session: Session, envelope: EventEnvelope) -> tuple[Event, bool]:
        """Retourne ``(event, created)`` ; un id déjà connu est ignoré (idempotence des webhooks)."""
        existing = session.get(Event, envelope.id)
        if existing is not None:
            return existing, False
        if envelope.correlation_id is None:
            envelope = envelope.model_copy(update={"correlation_id": envelope.id})
        row = Event(
            id=envelope.id,
            type=envelope.type,
            source=envelope.source,
            subject_uri=envelope.subject,
            workspace_id=envelope.workspace_id,
            mission_id=envelope.mission_id,
            actor=envelope.actor,
            occurred_at=envelope.occurred_at,
            data=envelope.data,
            correlation_id=envelope.correlation_id,
            causation_id=envelope.causation_id,
        )
        session.add(row)
        for pattern, destinations in OUTBOX_ROUTES.items():
            if type_matches(pattern, envelope.type):
                for dest in destinations:
                    session.add(Outbox(event_id=envelope.id, destination=dest))
        session.flush()
        self._dispatch(session, envelope)
        return row, True

    def _dispatch(self, session: Session, envelope: EventEnvelope) -> None:
        depth = session.info.get("event_depth", 0)
        if depth >= self.max_depth:
            log.error("profondeur de dispatch dépassée pour %s", envelope.id)
            return
        session.info["event_depth"] = depth + 1
        try:
            for pattern, handler, _group in list(self.handlers):
                if type_matches(pattern, envelope.type):
                    handler(session, envelope)
        finally:
            session.info["event_depth"] = depth


bus = EventBus()


def publish(session: Session, envelope: EventEnvelope) -> tuple[Event, bool]:
    return bus.publish(session, envelope)


def pending_outbox(session: Session, destination: str | None = None, limit: int = 100) -> list[Outbox]:
    stmt = select(Outbox).where(Outbox.status == OutboxStatus.PENDING)
    if destination:
        stmt = stmt.where(Outbox.destination == destination)
    return list(session.scalars(stmt.order_by(Outbox.id).limit(limit)))
