"""WF-REMÉDIATION (§13) : finding → Action (+ CAPA si requise) → preuve → vérification → clôture."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from gsms_core.db import utcnow
from gsms_core.events.envelope import EventEnvelope
from gsms_core.identity.models import User
from gsms_core.settings import Settings
from gsms_core.work import rules
from gsms_core.work.models import (
    Action,
    ActionStatus,
    Deadline,
    DeadlineKind,
    FindingRef,
    Notification,
    Severity,
)
from gsms_core.work.service import action_uri, create_action
from gsms_core.workflows.engine import Run, Transition, WorkflowDefinition

NON_ACTIONABLE_STATUSES = {"conforme", "non_applicable", "closed", "resolved"}


def _action(run: Run) -> Action:
    action = run.session.get(Action, uuid.UUID(run.context["action_id"]))
    assert action is not None and action.workspace_id == run.instance.workspace_id
    return action


def _owner(session: Session, raw: object) -> uuid.UUID | None:
    try:
        uid = uuid.UUID(str(raw))
    except (TypeError, ValueError):
        return None
    return uid if session.get(User, uid) else None


def _link_capa(run: Run) -> None:
    action = _action(run)
    action.capa_uri = str(run.event.data.get("capa_uri") or run.event.subject)
    run.update_context(capa_uri=action.capa_uri)


def _has_version(run: Run) -> bool:
    return bool(run.event.data.get("document_version_id"))


def _to_verification(run: Run) -> None:
    _action(run).status = ActionStatus.VERIFYING


def _reopen(run: Run) -> None:
    _action(run).status = ActionStatus.IN_PROGRESS


def _close(run: Run) -> None:
    action = _action(run)
    action.status = ActionStatus.CLOSED
    action.closed_at = utcnow()
    run.emit(
        "action.closed",
        action_uri(action),
        {"finding_uri": run.context.get("finding_uri"), "verified_by": run.event.actor},
    )


class RemediationWorkflow(WorkflowDefinition):
    name = "WF-REMEDIATION"
    version = 1
    states = frozenset({"open", "verification", "closed"})
    initial = "open"
    final_states = frozenset({"closed"})
    start_on = "finding.created"
    transitions = [
        Transition("open", "capa.created", "open", effect=_link_capa),
        Transition("open", "evidence.added", "verification", guard=_has_version, effect=_to_verification),
        Transition("verification", "capa.created", "verification", effect=_link_capa),
        Transition("verification", "action.rejected", "open", effect=_reopen),
        Transition("verification", "action.verified", "closed", effect=_close),
    ]

    def should_start(self, session: Session, settings: Settings, event: EventEnvelope) -> bool:
        status = str(event.data.get("status", "")).lower()
        if status in NON_ACTIONABLE_STATUSES:
            return False
        severity = rules.normalize_severity(event.data.get("severity"))
        return rules.meets_threshold(severity, Severity(settings.remediation_severity_threshold))

    def on_start(self, run: Run) -> None:
        ev, session = run.event, run.session
        severity = rules.normalize_severity(ev.data.get("severity"))
        occurred: datetime = ev.occurred_at
        due = rules.due_date_for(severity, occurred)
        capa = rules.capa_required(
            severity, explicit=bool(ev.data.get("capa_required")), recurrence=bool(ev.data.get("recurrence"))
        )
        finding = FindingRef(
            workspace_id=ev.workspace_id,
            mission_id=ev.mission_id,
            source_uri=ev.subject,
            severity=severity,
            status=str(ev.data.get("status", "non_conforme")),
            control_ref=ev.data.get("control_ref"),
            title=str(ev.data.get("title") or ev.subject),
        )
        session.add(finding)
        session.flush()
        owner_id = _owner(session, ev.data.get("owner_id"))
        action = create_action(
            session,
            workspace_id=ev.workspace_id,
            mission_id=ev.mission_id,
            actor="service:workflow",
            title=f"Remédier : {finding.title}",
            priority=severity,
            due_at=due,
            owner_id=owner_id,
            finding_ref_id=finding.id,
            capa_required=capa,
            verification_required=bool(ev.data.get("verification_required")),
        )
        uri = action_uri(action)
        session.add(
            Deadline(workspace_id=ev.workspace_id, subject_uri=uri, kind=DeadlineKind.ACTION, due_at=due)
        )
        if owner_id:
            session.add(Notification(user_id=owner_id, event_id=ev.id, title=action.title))
        run.instance.subject_uri = uri
        run.update_context(
            finding_uri=ev.subject, action_id=str(action.id), severity=severity.value, capa_required=capa
        )
        if capa:
            run.emit(
                "capa.requested",
                uri,
                {
                    "action_id": str(action.id),
                    "action_uri": uri,
                    "finding_uri": ev.subject,
                    "severity": severity.value,
                    "title": finding.title,
                    "due_at": due.isoformat(),
                },
            )
