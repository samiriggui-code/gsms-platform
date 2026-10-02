from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.documents.service import get_version
from gsms_core.events.bus import publish
from gsms_core.events.envelope import EventEnvelope
from gsms_core.missions.uri import core_uri
from gsms_core.work.models import Action, ActionStatus, Evidence, Severity


class NotFound(LookupError):
    pass


class InvalidTransition(ValueError):
    pass


def action_uri(action: Action) -> str:
    return core_uri("action", action.id)


def _snap(a: Action) -> dict:
    return {
        "title": a.title,
        "status": a.status.value,
        "priority": a.priority.value,
        "due_at": a.due_at.isoformat() if a.due_at else None,
        "capa_uri": a.capa_uri,
    }


def list_actions(
    session: Session,
    workspace_id: uuid.UUID,
    status: ActionStatus | None = None,
    mission_id: uuid.UUID | None = None,
) -> list[Action]:
    stmt = select(Action).where(Action.workspace_id == workspace_id)
    if status:
        stmt = stmt.where(Action.status == status)
    if mission_id:
        stmt = stmt.where(Action.mission_id == mission_id)
    return list(session.scalars(stmt.order_by(Action.due_at.is_(None), Action.due_at)))


def get_action(session: Session, workspace_id: uuid.UUID, action_id: uuid.UUID) -> Action:
    a = session.scalar(select(Action).where(Action.id == action_id, Action.workspace_id == workspace_id))
    if a is None:
        raise NotFound("action")
    return a


def create_action(
    session: Session,
    *,
    workspace_id: uuid.UUID,
    title: str,
    actor: str,
    mission_id: uuid.UUID | None = None,
    priority: Severity = Severity.MINOR,
    due_at=None,
    owner_id: uuid.UUID | None = None,
    finding_ref_id: uuid.UUID | None = None,
    capa_required: bool = False,
    verification_required: bool = False,
) -> Action:
    a = Action(
        workspace_id=workspace_id,
        mission_id=mission_id,
        title=title,
        priority=priority,
        due_at=due_at,
        owner_id=owner_id,
        finding_ref_id=finding_ref_id,
        capa_required=capa_required,
        verification_required=verification_required,
    )
    session.add(a)
    session.flush()
    record(
        session,
        actor=actor,
        action="action.create",
        subject_uri=action_uri(a),
        workspace_id=workspace_id,
        after=_snap(a),
    )
    return a


def set_status(session: Session, action: Action, status: ActionStatus, actor: str) -> None:
    before = _snap(action)
    action.status = status
    session.flush()
    record(
        session,
        actor=actor,
        action=f"action.status.{status.value.lower()}",
        subject_uri=action_uri(action),
        workspace_id=action.workspace_id,
        before=before,
        after=_snap(action),
    )


def add_evidence(session: Session, action: Action, version_id: uuid.UUID, actor: str) -> Evidence:
    version = get_version(session, action.workspace_id, version_id)  # lève NotFound hors workspace
    ev = Evidence(
        workspace_id=action.workspace_id,
        document_version_id=version.id,
        target_uri=action_uri(action),
        by=actor,
    )
    session.add(ev)
    session.flush()
    record(
        session,
        actor=actor,
        action="evidence.add",
        subject_uri=action_uri(action),
        workspace_id=action.workspace_id,
        after={"document_version_id": str(version.id)},
    )
    publish(
        session,
        EventEnvelope(
            type="evidence.added",
            source="core",
            subject=action_uri(action),
            workspace_id=action.workspace_id,
            mission_id=action.mission_id,
            actor=actor,
            data={
                "evidence_id": str(ev.id),
                "document_version_id": str(version.id),
                "target_uri": action_uri(action),
            },
        ),
    )
    return ev


def verify_action(
    session: Session, action: Action, actor: str, *, accepted: bool = True, comment: str | None = None
) -> None:
    """Validation humaine de la preuve : émet ``action.verified`` (ou ``action.rejected``)."""
    if action.status != ActionStatus.VERIFYING:
        raise InvalidTransition(f"action en statut {action.status.value}, vérification impossible")
    publish(
        session,
        EventEnvelope(
            type="action.verified" if accepted else "action.rejected",
            source="core",
            subject=action_uri(action),
            workspace_id=action.workspace_id,
            mission_id=action.mission_id,
            actor=actor,
            data={"comment": comment} if comment else {},
        ),
    )
