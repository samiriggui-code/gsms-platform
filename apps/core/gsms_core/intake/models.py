"""Réceptions d'intake public — clé d'idempotence + réponse mémorisée."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, utcnow


class IntakeReceipt(Base):
    """Une clé ``Idempotency-Key`` → une seule création (mission + event)."""

    __tablename__ = "intake_receipt"

    idempotency_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    request_type: Mapped[str] = mapped_column(String(32))
    email: Mapped[str] = mapped_column(String(320))
    company_name: Mapped[str | None] = mapped_column(String(200))
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    mission_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("mission_mission.id"), index=True)
    event_id: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), default="received")
    crm_ref: Mapped[str | None] = mapped_column(String(300))
    response: Mapped[dict[str, Any]] = mapped_column(default=dict)
