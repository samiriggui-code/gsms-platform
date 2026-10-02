from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, str_enum, utcnow


class Event(Base):
    """Enveloppe d'événement (§12), inspirée de CloudEvents. Immuable une fois écrite."""

    __tablename__ = "event_event"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    type: Mapped[str] = mapped_column(String(120), index=True)
    source: Mapped[str] = mapped_column(String(50))
    subject_uri: Mapped[str] = mapped_column(String(500), index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    mission_id: Mapped[uuid.UUID | None] = mapped_column(index=True)
    actor: Mapped[str] = mapped_column(String(200))
    occurred_at: Mapped[datetime] = mapped_column(default=utcnow)
    received_at: Mapped[datetime] = mapped_column(default=utcnow)
    data: Mapped[dict[str, Any]] = mapped_column(default=dict)
    correlation_id: Mapped[str] = mapped_column(String(64), index=True)
    causation_id: Mapped[str | None] = mapped_column(String(64))


class OutboxStatus(enum.StrEnum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"


class Outbox(Base):
    __tablename__ = "event_outbox"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(ForeignKey("event_event.id"), index=True)
    destination: Mapped[str] = mapped_column(String(50))
    status: Mapped[OutboxStatus] = mapped_column(str_enum(OutboxStatus), default=OutboxStatus.PENDING)
    attempts: Mapped[int] = mapped_column(default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(default=utcnow)
    last_error: Mapped[str | None] = mapped_column(String(1000))
