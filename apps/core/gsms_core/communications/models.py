from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, Timestamped, UUIDPk, str_enum


class MessageStatus(enum.StrEnum):
    TO_VALIDATE = "TO_VALIDATE"  # vers un client : relu et validé par l'équipe avant tout envoi
    QUEUED = "QUEUED"  # validé (ou interne) : part au prochain envoi
    SENT = "SENT"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Message(UUIDPk, Timestamped, Base):
    """E-mail de la plateforme : préparé, éventuellement validé, envoyé, journalisé (cf. Qualiopi)."""

    __tablename__ = "comm_message"

    reference: Mapped[str] = mapped_column(String(20), unique=True)  # MSG-000001
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    template: Mapped[str] = mapped_column(String(60))
    template_version: Mapped[int] = mapped_column()
    external: Mapped[bool] = mapped_column(default=True)  # destinataire client (hors équipe GSMS)
    recipient_email: Mapped[str] = mapped_column(String(320))
    recipient_name: Mapped[str | None] = mapped_column(String(200))
    subject: Mapped[str] = mapped_column(String(300))
    body_html: Mapped[str] = mapped_column(Text)
    body_text: Mapped[str] = mapped_column(Text)
    status: Mapped[MessageStatus] = mapped_column(str_enum(MessageStatus), index=True)
    related_uri: Mapped[str | None] = mapped_column(String(500))
    created_by: Mapped[str] = mapped_column(String(200))
    validated_by: Mapped[str | None] = mapped_column(String(200))
    validated_at: Mapped[datetime | None] = mapped_column()
    sent_at: Mapped[datetime | None] = mapped_column()
    provider_message_id: Mapped[str | None] = mapped_column(String(300))
    attempts: Mapped[int] = mapped_column(default=0)
    last_error: Mapped[str | None] = mapped_column(Text)
    cancel_reason: Mapped[str | None] = mapped_column(Text)
