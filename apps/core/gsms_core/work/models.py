from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, Timestamped, UUIDPk, str_enum, utcnow


class Severity(enum.StrEnum):
    CRITICAL = "critical"
    MAJOR = "major"
    MINOR = "minor"
    INFO = "info"


SEVERITY_RANK = {Severity.CRITICAL: 3, Severity.MAJOR: 2, Severity.MINOR: 1, Severity.INFO: 0}


class ActionStatus(enum.StrEnum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    VERIFYING = "VERIFYING"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class TaskStatus(enum.StrEnum):
    TODO = "TODO"
    DOING = "DOING"
    DONE = "DONE"


class DeadlineKind(enum.StrEnum):
    REGULATORY = "REGULATORY"
    CONTRACT = "CONTRACT"
    TENDER = "TENDER"
    ACTION = "ACTION"


class NotificationChannel(enum.StrEnum):
    INAPP = "inapp"
    EMAIL = "email"


class FindingRef(UUIDPk, Timestamped, Base):
    """Projection (cache) d'un finding d'une app source ; la vérité reste dans GRACE / QAtrial."""

    __tablename__ = "work_finding_ref"

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    mission_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("mission_mission.id"))
    source_uri: Mapped[str] = mapped_column(String(500), index=True)
    severity: Mapped[Severity] = mapped_column(str_enum(Severity))
    status: Mapped[str] = mapped_column(String(40))
    control_ref: Mapped[str | None] = mapped_column(String(200))
    title: Mapped[str] = mapped_column(String(500))
    synced_at: Mapped[datetime] = mapped_column(default=utcnow)


class Action(UUIDPk, Timestamped, Base):
    __tablename__ = "work_action"

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    mission_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("mission_mission.id"), index=True)
    finding_ref_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("work_finding_ref.id"))
    title: Mapped[str] = mapped_column(String(500))
    owner_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("identity_user.id"))
    status: Mapped[ActionStatus] = mapped_column(str_enum(ActionStatus), default=ActionStatus.OPEN)
    priority: Mapped[Severity] = mapped_column(str_enum(Severity), default=Severity.MINOR)
    due_at: Mapped[datetime | None] = mapped_column()
    capa_required: Mapped[bool] = mapped_column(default=False)
    capa_uri: Mapped[str | None] = mapped_column(String(500))
    verification_required: Mapped[bool] = mapped_column(default=False)
    closed_at: Mapped[datetime | None] = mapped_column()


class Task(UUIDPk, Timestamped, Base):
    __tablename__ = "work_task"

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    action_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("work_action.id"))
    mission_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("mission_mission.id"))
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("identity_user.id"))
    title: Mapped[str] = mapped_column(String(500))
    status: Mapped[TaskStatus] = mapped_column(str_enum(TaskStatus), default=TaskStatus.TODO)
    due_at: Mapped[datetime | None] = mapped_column()


class Deadline(UUIDPk, Base):
    __tablename__ = "work_deadline"

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    subject_uri: Mapped[str] = mapped_column(String(500), index=True)
    kind: Mapped[DeadlineKind] = mapped_column(str_enum(DeadlineKind))
    due_at: Mapped[datetime] = mapped_column()
    reminder_policy: Mapped[list[str]] = mapped_column(default=lambda: ["P7D", "P1D"])


class Notification(UUIDPk, Timestamped, Base):
    __tablename__ = "work_notification"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_user.id"), index=True)
    event_id: Mapped[str | None] = mapped_column(ForeignKey("event_event.id"))
    channel: Mapped[NotificationChannel] = mapped_column(
        str_enum(NotificationChannel), default=NotificationChannel.INAPP
    )
    title: Mapped[str] = mapped_column(String(300))
    read_at: Mapped[datetime | None] = mapped_column()


class Evidence(UUIDPk, Base):
    """Une preuve référence une VERSION figée d'un document, jamais le document mutable (§15)."""

    __tablename__ = "work_evidence"

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    document_version_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("document_version.id"))
    target_uri: Mapped[str] = mapped_column(String(500), index=True)
    captured_at: Mapped[datetime] = mapped_column(default=utcnow)
    by: Mapped[str] = mapped_column(String(200))
