"""Persistance des bindings apps + contacts globaux (autorité Core)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, Timestamped, UUIDPk, str_enum, utcnow


class BindingStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    DETACHED = "DETACHED"
    PENDING = "PENDING"
    ERROR = "ERROR"


class Contact(UUIDPk, Timestamped, Base):
    """Contact global GSMS (autorité Core). Liaison CRM via contact_application_bindings."""

    __tablename__ = "identity_contact"

    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_organization.id"), index=True)
    email: Mapped[str | None] = mapped_column(String(320))
    first_name: Mapped[str | None] = mapped_column(String(120))
    last_name: Mapped[str | None] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(40))
    title: Mapped[str | None] = mapped_column(String(200))
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata")


class WorkspaceApplicationBinding(UUIDPk, Timestamped, Base):
    """Mapping workspace GSMS ↔ workspace/case interne d'une app spécialisée."""

    __tablename__ = "workspace_application_bindings"
    __table_args__ = (UniqueConstraint("gsms_workspace_id", "application_id"),)

    gsms_workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    application_id: Mapped[str] = mapped_column(String(40), index=True)
    external_workspace_id: Mapped[str] = mapped_column(String(300))
    status: Mapped[BindingStatus] = mapped_column(str_enum(BindingStatus), default=BindingStatus.ACTIVE)
    mission_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("mission_mission.id"), index=True)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata")


class ClientApplicationBinding(UUIDPk, Timestamped, Base):
    """Mapping client GSMS (Organization) ↔ compte CRM / app externe."""

    __tablename__ = "client_application_bindings"
    __table_args__ = (UniqueConstraint("client_id", "application_id"),)

    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_organization.id"), index=True)
    application_id: Mapped[str] = mapped_column(String(40), index=True)
    external_client_id: Mapped[str] = mapped_column(String(300))
    status: Mapped[BindingStatus] = mapped_column(str_enum(BindingStatus), default=BindingStatus.ACTIVE)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata")


class ContactApplicationBinding(UUIDPk, Timestamped, Base):
    """Mapping contact GSMS ↔ contact CRM Eve / autre app."""

    __tablename__ = "contact_application_bindings"
    __table_args__ = (UniqueConstraint("contact_id", "application_id"),)

    contact_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_contact.id"), index=True)
    application_id: Mapped[str] = mapped_column(String(40), index=True)
    external_contact_id: Mapped[str] = mapped_column(String(300))
    status: Mapped[BindingStatus] = mapped_column(str_enum(BindingStatus), default=BindingStatus.ACTIVE)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata")
