"""Moteur de workflows déterministe (§13) : définitions en code, instances en base.

Une instance avance à la réception d'un événement correspondant à une transition de son état courant
(``waiting_for``). Les timers (échéances) seront branchés sur un worker périodique.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, ClassVar

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.events.bus import EventBus, publish
from gsms_core.events.envelope import EventEnvelope, type_matches
from gsms_core.settings import Settings
from gsms_core.workflows.models import WorkflowInstance

log = logging.getLogger(__name__)


@dataclass
class Run:
    """Contexte d'exécution passé aux gardes et effets."""

    session: Session
    instance: WorkflowInstance
    settings: Settings
    event: EventEnvelope

    @property
    def context(self) -> dict[str, Any]:
        return self.instance.context

    def update_context(self, **values: Any) -> None:
        self.instance.context = {**self.instance.context, **values}  # réassignation : JSON non mutable

    def emit(self, type_: str, subject: str, data: dict[str, Any] | None = None) -> None:
        publish(self.session, self.event.caused(type=type_, subject=subject, data=data or {}))


Guard = Callable[[Run], bool]
Effect = Callable[[Run], None]


@dataclass(frozen=True)
class Transition:
    source: str
    on: str
    target: str
    guard: Guard | None = None
    effect: Effect | None = None


class WorkflowDefinition:
    name: ClassVar[str]
    version: ClassVar[int] = 1
    states: ClassVar[frozenset[str]]
    initial: ClassVar[str]
    final_states: ClassVar[frozenset[str]] = frozenset()
    start_on: ClassVar[str]
    transitions: ClassVar[list[Transition]] = []

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        known = cls.states
        assert cls.initial in known, f"{cls.__name__}: état initial inconnu"
        assert cls.final_states <= known, f"{cls.__name__}: état final inconnu"
        for t in cls.transitions:
            assert t.source in known and t.target in known, f"{cls.__name__}: transition {t} invalide"

    # Points d'extension -------------------------------------------------------
    def should_start(self, session: Session, settings: Settings, event: EventEnvelope) -> bool:
        return True

    def on_start(self, run: Run) -> None:
        """Effet initial ; peut changer ``run.instance.subject_uri`` (clé de corrélation)."""

    def correlation_uris(self, event: EventEnvelope) -> set[str]:
        uris = {event.subject}
        for key in ("target_uri", "action_uri", "subject_uri"):
            value = event.data.get(key)
            if isinstance(value, str):
                uris.add(value)
        return uris

    # -------------------------------------------------------------------------
    def waiting_for(self, state: str) -> list[str]:
        return sorted({t.on for t in self.transitions if t.source == state})

    def find_transition(self, run: Run) -> Transition | None:
        for t in self.transitions:
            if (
                t.source == run.instance.state
                and type_matches(t.on, run.event.type)
                and (t.guard is None or t.guard(run))
            ):
                return t
        return None


@dataclass
class WorkflowEngine:
    settings: Settings
    definitions: list[WorkflowDefinition] = field(default_factory=list)

    def register(self, definition: WorkflowDefinition) -> None:
        self.definitions.append(definition)

    def attach(self, bus: EventBus) -> None:
        """Abonne le moteur au bus ; remplace un moteur attaché précédemment (une app = un moteur)."""
        patterns = {d.start_on for d in self.definitions} | {
            t.on for d in self.definitions for t in d.transitions
        }
        bus.replace_group("workflows", [(p, self._handler_for(p)) for p in sorted(patterns)])

    def _handler_for(self, pattern: str) -> Callable[[Session, EventEnvelope], None]:
        def _handle(session: Session, event: EventEnvelope) -> None:
            # Un même événement peut matcher plusieurs motifs : on ne le traite qu'une fois.
            seen: set[str] = session.info.setdefault("wf_seen", set())
            if event.id in seen:
                return
            seen.add(event.id)
            self.handle(session, event)

        _handle.__name__ = f"wf_{pattern}"
        return _handle

    def handle(self, session: Session, event: EventEnvelope) -> list[WorkflowInstance]:
        touched: list[WorkflowInstance] = []
        for d in self.definitions:
            if type_matches(d.start_on, event.type):
                if d.should_start(session, self.settings, event):
                    touched.append(self._start(session, d, event))
                continue
            touched.extend(self._advance(session, d, event))
        return touched

    def _start(self, session: Session, d: WorkflowDefinition, event: EventEnvelope) -> WorkflowInstance:
        inst = WorkflowInstance(
            definition=d.name,
            version=d.version,
            workspace_id=event.workspace_id,
            subject_uri=event.subject,
            state=d.initial,
            context={"started_by": event.id, "history": []},
        )
        session.add(inst)
        session.flush()
        run = Run(session, inst, self.settings, event)
        d.on_start(run)
        inst.waiting_for = d.waiting_for(inst.state)
        session.flush()
        record(
            session,
            actor="service:workflow",
            action=f"workflow.{d.name}.start",
            subject_uri=inst.subject_uri,
            workspace_id=inst.workspace_id,
            after={"instance": str(inst.id), "state": inst.state, "event": event.id},
        )
        return inst

    def _advance(
        self, session: Session, d: WorkflowDefinition, event: EventEnvelope
    ) -> list[WorkflowInstance]:
        uris = d.correlation_uris(event)
        stmt = select(WorkflowInstance).where(
            WorkflowInstance.definition == d.name,
            WorkflowInstance.workspace_id == event.workspace_id,
            WorkflowInstance.subject_uri.in_(uris),
        )
        out = []
        for inst in session.scalars(stmt):
            if inst.state in d.final_states:
                continue
            run = Run(session, inst, self.settings, event)
            t = d.find_transition(run)
            if t is None:
                log.debug("%s/%s : pas de transition pour %s", d.name, inst.state, event.type)
                continue
            before = inst.state
            if t.effect:
                t.effect(run)
            inst.state = t.target
            inst.waiting_for = [] if t.target in d.final_states else d.waiting_for(t.target)
            history = [
                *inst.context.get("history", []),
                {"from": before, "to": t.target, "event": event.id, "type": event.type},
            ]
            run.update_context(history=history)
            session.flush()
            record(
                session,
                actor="service:workflow",
                action=f"workflow.{d.name}.transition",
                subject_uri=inst.subject_uri,
                workspace_id=inst.workspace_id,
                before={"state": before},
                after={"state": t.target, "event": event.id},
            )
            out.append(inst)
        return out
