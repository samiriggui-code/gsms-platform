"""Moteur de workflows et définitions (WF-REMÉDIATION)."""

from __future__ import annotations

from gsms_core.events.bus import EventBus
from gsms_core.settings import Settings
from gsms_core.workflows.engine import WorkflowEngine


def build_engine(settings: Settings, bus: EventBus) -> WorkflowEngine:
    from gsms_core.workflows.remediation import RemediationWorkflow

    engine = WorkflowEngine(settings=settings)
    engine.register(RemediationWorkflow())
    engine.attach(bus)
    return engine
