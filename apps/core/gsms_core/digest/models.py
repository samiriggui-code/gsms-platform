"""Persistance des ``WorkspaceDigest`` : historique par workspace, le dernier BUILT fait foi."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, Timestamped, UUIDPk, str_enum, utcnow


class DigestStatus(enum.StrEnum):
    BUILT = "BUILT"
    FAILED = "FAILED"


class WorkspaceDigestRecord(UUIDPk, Timestamped, Base):
    __tablename__ = "digest_workspace_digest"

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    mission_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("mission_mission.id"))
    status: Mapped[DigestStatus] = mapped_column(str_enum(DigestStatus))
    built_at: Mapped[datetime] = mapped_column(default=utcnow)
    trigger: Mapped[str] = mapped_column(String(200))
    document_count: Mapped[int] = mapped_column(default=0)
    conflict_count: Mapped[int] = mapped_column(default=0)
    missing_count: Mapped[int] = mapped_column(default=0)
    counts: Mapped[dict[str, Any] | None] = mapped_column()
    payload: Mapped[dict[str, Any] | None] = mapped_column()
    error_message: Mapped[str | None] = mapped_column(String(1000))
