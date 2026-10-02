from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, Timestamped, UUIDPk, str_enum, utcnow


class MissionType(enum.StrEnum):
    AUDIT = "AUDIT"
    COMMISSION_SECURITE = "COMMISSION_SECURITE"
    ACCOMPAGNEMENT = "ACCOMPAGNEMENT"
    DOCUMENTATION = "DOCUMENTATION"
    APPEL_OFFRES = "APPEL_OFFRES"
    CONFORMITE = "CONFORMITE"
    AUTRE = "AUTRE"


class MissionStatus(enum.StrEnum):
    DRAFT = "DRAFT"
    OPEN = "OPEN"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class MissionOrigin(enum.StrEnum):
    INTAKE = "intake"
    CRM = "crm"
    MANUAL = "manual"
    TENDER = "tender"


class ParticipantRole(enum.StrEnum):
    LEAD = "lead"
    CONTRIBUTOR = "contributor"
    CLIENT_CONTACT = "client_contact"
    REVIEWER = "reviewer"


class Mission(UUIDPk, Timestamped, Base):
    __tablename__ = "mission_mission"

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    type: Mapped[MissionType] = mapped_column(str_enum(MissionType))
    title: Mapped[str] = mapped_column(String(300))
    status: Mapped[MissionStatus] = mapped_column(str_enum(MissionStatus), default=MissionStatus.OPEN)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("identity_user.id"))
    origin: Mapped[MissionOrigin] = mapped_column(str_enum(MissionOrigin), default=MissionOrigin.MANUAL)
    opened_at: Mapped[datetime] = mapped_column(default=utcnow)
    due_at: Mapped[datetime | None] = mapped_column()
    closed_at: Mapped[datetime | None] = mapped_column()


class MissionParticipant(UUIDPk, Base):
    __tablename__ = "mission_participant"
    __table_args__ = (UniqueConstraint("mission_id", "user_id", "role"),)

    mission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mission_mission.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_user.id"))
    role: Mapped[ParticipantRole] = mapped_column(str_enum(ParticipantRole))


class ExternalReference(UUIDPk, Base):
    """Référence vers un objet d'une app spécialisée. ``status_snapshot`` est un cache (``synced_at``)."""

    __tablename__ = "mission_external_ref"
    __table_args__ = (UniqueConstraint("workspace_id", "uri"),)

    mission_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("mission_mission.id"), index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    uri: Mapped[str] = mapped_column(String(500))
    system: Mapped[str] = mapped_column(String(30))
    kind: Mapped[str] = mapped_column(String(60))
    external_id: Mapped[str] = mapped_column(String(300))
    status_snapshot: Mapped[dict[str, Any] | None] = mapped_column()
    url: Mapped[str | None] = mapped_column(String(1000))
    synced_at: Mapped[datetime | None] = mapped_column()
