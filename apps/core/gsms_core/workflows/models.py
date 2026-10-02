from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, Timestamped, UUIDPk, utcnow


class WorkflowInstance(UUIDPk, Timestamped, Base):
    __tablename__ = "event_workflow_instance"

    definition: Mapped[str] = mapped_column(String(80), index=True)
    version: Mapped[int] = mapped_column()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    subject_uri: Mapped[str] = mapped_column(String(500), index=True)
    state: Mapped[str] = mapped_column(String(60))
    context: Mapped[dict[str, Any]] = mapped_column(default=dict)
    waiting_for: Mapped[list[str]] = mapped_column(default=list)
    timer_at: Mapped[datetime | None] = mapped_column()
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
