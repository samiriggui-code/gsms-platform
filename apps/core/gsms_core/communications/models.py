from __future__ import annotations

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, Timestamped, UUIDPk, str_enum


class MessageStatus(enum.StrEnum):
    """Mêmes statuts que le module Communications de gsms-qualiopi."""

    A_VALIDER = "A_VALIDER"  # message à un client : attend la validation de l'équipe
    PREVU = "PREVU"  # part à sa date (ou au prochain passage du worker)
    ENVOYE = "ENVOYE"
    ECHEC = "ECHEC"
    ANNULE = "ANNULE"
    SANS_ADRESSE = "SANS_ADRESSE"  # destinataire sans adresse e-mail


class RecipientKind(enum.StrEnum):
    CLIENT = "CLIENT"  # contacts client de la prestation
    EQUIPE = "EQUIPE"  # équipe GSMS qui travaille les prestations
    ADMIN = "ADMIN"  # super admin et administrateurs
    TEST = "TEST"


class Message(UUIDPk, Timestamped, Base):
    """E-mail de la plateforme : planifié par une règle, éventuellement validé, envoyé, journalisé.

    ``occurrence_key`` rend le planificateur idempotent (une règle ne crée jamais deux fois le même
    message) ; ``body_sha256`` est l'empreinte du contenu exact tel qu'il part.
    """

    __tablename__ = "comm_message"

    reference: Mapped[str] = mapped_column(String(20), unique=True)  # MSG-000001
    occurrence_key: Mapped[str] = mapped_column(String(300), unique=True)
    rule_key: Mapped[str] = mapped_column(String(80), index=True)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    template: Mapped[str] = mapped_column(String(60))
    template_version: Mapped[int] = mapped_column()
    external: Mapped[bool] = mapped_column(default=True)
    recipient_kind: Mapped[RecipientKind] = mapped_column(str_enum(RecipientKind))
    recipient_email: Mapped[str | None] = mapped_column(String(320))
    recipient_name: Mapped[str | None] = mapped_column(String(200))
    subject: Mapped[str] = mapped_column(String(300))
    body_html: Mapped[str] = mapped_column(Text)
    body_text: Mapped[str] = mapped_column(Text)
    body_sha256: Mapped[str] = mapped_column(String(64))
    status: Mapped[MessageStatus] = mapped_column(str_enum(MessageStatus), index=True)
    due_on: Mapped[date] = mapped_column(index=True)
    related_uri: Mapped[str | None] = mapped_column(String(500))
    created_by: Mapped[str] = mapped_column(String(200))
    validated_by: Mapped[str | None] = mapped_column(String(200))
    validated_at: Mapped[datetime | None] = mapped_column()
    sent_at: Mapped[datetime | None] = mapped_column()
    provider_message_id: Mapped[str | None] = mapped_column(String(300))
    attempts: Mapped[int] = mapped_column(default=0)
    last_error: Mapped[str | None] = mapped_column(Text)
    cancel_reason: Mapped[str | None] = mapped_column(Text)
