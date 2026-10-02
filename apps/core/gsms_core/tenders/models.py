from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, Timestamped, UUIDPk, str_enum


class GoNoGo(enum.StrEnum):
    PENDING = "PENDING"
    GO = "GO"
    NO_GO = "NO_GO"


class TenderCase(UUIDPk, Timestamped, Base):
    """Dossier d'appel d'offres porté par une mission APPEL_OFFRES. TenderAI garde le contenu RFP."""

    __tablename__ = "tender_case"

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    mission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mission_mission.id"), unique=True)
    title: Mapped[str] = mapped_column(String(300))
    buyer: Mapped[str | None] = mapped_column(String(300))
    submission_deadline: Mapped[datetime | None] = mapped_column()
    tenderai_rfp_uri: Mapped[str | None] = mapped_column(String(300))
    lexsocket_uri: Mapped[str | None] = mapped_column(String(300))
    criteria: Mapped[list[dict[str, Any]]] = mapped_column(default=list)
    score: Mapped[float | None] = mapped_column(Float)
    recommendation: Mapped[GoNoGo] = mapped_column(str_enum(GoNoGo), default=GoNoGo.PENDING)
    decision: Mapped[GoNoGo] = mapped_column(str_enum(GoNoGo), default=GoNoGo.PENDING)
    decided_by: Mapped[str | None] = mapped_column(String(200))
    decided_at: Mapped[datetime | None] = mapped_column()
    rationale: Mapped[str | None] = mapped_column(Text)
