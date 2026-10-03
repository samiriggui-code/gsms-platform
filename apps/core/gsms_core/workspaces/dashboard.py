"""Tableau de bord workspace — agrégat léger pour ``GET /workspaces/{ws}/dashboard``."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.db import utcnow
from gsms_core.events.models import Event
from gsms_core.missions.models import Mission, MissionStatus
from gsms_core.work.models import Action, ActionStatus, Deadline, FindingRef, Severity

_OPEN_ACTIONS = frozenset({ActionStatus.OPEN, ActionStatus.IN_PROGRESS, ActionStatus.VERIFYING})
_ACTIVE_MISSIONS = frozenset({MissionStatus.OPEN, MissionStatus.ON_HOLD, MissionStatus.DRAFT})
_CLOSED_FINDINGS = frozenset({"closed", "CLOTURE", "CLOTUREE", "resolved", "conforme"})


class DashboardItem(BaseModel):
    id: str
    title: str
    status: str | None = None
    due_at: datetime | None = None
    at: datetime | None = None
    kind: str | None = None


class DashboardOut(BaseModel):
    attention: list[DashboardItem]
    deadlines: list[DashboardItem]
    missions: list[DashboardItem]
    activity: list[DashboardItem]


def build_dashboard(db: Session, workspace_id: uuid.UUID, *, limit: int = 8) -> DashboardOut:
    now = utcnow()
    horizon = now + timedelta(days=30)

    attention = _attention(db, workspace_id, now, limit)
    deadlines = _deadlines(db, workspace_id, now, horizon, limit)
    missions = _missions(db, workspace_id, limit)
    activity = _activity(db, workspace_id, limit)
    return DashboardOut(attention=attention, deadlines=deadlines, missions=missions, activity=activity)


def _attention(db: Session, workspace_id: uuid.UUID, now: datetime, limit: int) -> list[DashboardItem]:
    items: list[DashboardItem] = []

    actions = db.scalars(
        select(Action)
        .where(Action.workspace_id == workspace_id, Action.status.in_(_OPEN_ACTIONS))
        .order_by(Action.due_at.asc().nullslast(), Action.created_at.desc())
        .limit(limit * 2)
    ).all()
    for action in actions:
        overdue = action.due_at is not None and action.due_at < now
        hot = action.priority in {Severity.CRITICAL, Severity.MAJOR} or overdue
        if not hot and action.status != ActionStatus.VERIFYING:
            continue
        items.append(
            DashboardItem(
                id=str(action.id),
                title=action.title,
                status=action.status.value,
                due_at=action.due_at,
                kind="action",
            )
        )

    findings = db.scalars(
        select(FindingRef)
        .where(FindingRef.workspace_id == workspace_id)
        .order_by(FindingRef.synced_at.desc())
        .limit(limit * 2)
    ).all()
    for finding in findings:
        if finding.status in _CLOSED_FINDINGS:
            continue
        if finding.severity not in {Severity.CRITICAL, Severity.MAJOR}:
            continue
        items.append(
            DashboardItem(
                id=str(finding.id),
                title=finding.title,
                status=finding.status,
                at=finding.synced_at,
                kind="finding",
            )
        )

    items.sort(
        key=lambda i: (
            0 if i.due_at is not None else 1,
            i.due_at or now,
            i.at or now,
        )
    )
    return items[:limit]


def _deadlines(
    db: Session,
    workspace_id: uuid.UUID,
    now: datetime,
    horizon: datetime,
    limit: int,
) -> list[DashboardItem]:
    rows = db.scalars(
        select(Deadline)
        .where(
            Deadline.workspace_id == workspace_id,
            Deadline.due_at >= now,
            Deadline.due_at <= horizon,
        )
        .order_by(Deadline.due_at.asc())
        .limit(limit)
    ).all()
    return [
        DashboardItem(
            id=str(row.id),
            title=row.subject_uri,
            status=row.kind.value,
            due_at=row.due_at,
            kind="deadline",
        )
        for row in rows
    ]


def _missions(db: Session, workspace_id: uuid.UUID, limit: int) -> list[DashboardItem]:
    rows = db.scalars(
        select(Mission)
        .where(Mission.workspace_id == workspace_id, Mission.status.in_(_ACTIVE_MISSIONS))
        .order_by(Mission.due_at.asc().nullslast(), Mission.opened_at.desc())
        .limit(limit)
    ).all()
    return [
        DashboardItem(
            id=str(row.id),
            title=row.title,
            status=row.status.value,
            due_at=row.due_at,
            kind=row.type.value,
        )
        for row in rows
    ]


def _activity(db: Session, workspace_id: uuid.UUID, limit: int) -> list[DashboardItem]:
    rows = db.scalars(
        select(Event)
        .where(Event.workspace_id == workspace_id)
        .order_by(Event.occurred_at.desc())
        .limit(limit)
    ).all()
    return [
        DashboardItem(
            id=row.id,
            title=row.type,
            status=row.source,
            at=row.occurred_at,
            kind="event",
        )
        for row in rows
    ]
