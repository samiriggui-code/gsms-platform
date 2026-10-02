from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, utcnow


class AuditLog(Base):
    """Journal append-only chaîné : ``hash = sha256(prev_hash || contenu canonique)``."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True
    )
    at: Mapped[datetime] = mapped_column(default=utcnow)
    actor: Mapped[str] = mapped_column(String(200))
    action: Mapped[str] = mapped_column(String(100))
    subject_uri: Mapped[str] = mapped_column(String(500), index=True)
    workspace_id: Mapped[str | None] = mapped_column(String(36), index=True)
    before: Mapped[dict[str, Any] | None] = mapped_column()
    after: Mapped[dict[str, Any] | None] = mapped_column()
    prev_hash: Mapped[str] = mapped_column(String(64))
    hash: Mapped[str] = mapped_column(String(64), unique=True)
