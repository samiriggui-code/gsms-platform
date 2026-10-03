from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, Timestamped, utcnow


class OidcClient(Timestamped, Base):
    """Application autorisée à se connecter par le Core (une par app : ``grace``, ``crm``, ``qatrial``).

    Le secret n'est gardé que haché (sha256 d'un secret aléatoire de 256 bits) ; il est affiché une fois.
    Les adresses de retour sont comparées à l'identique.
    """

    __tablename__ = "oidc_client"

    client_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    app: Mapped[str] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(120))
    secret_hash: Mapped[str] = mapped_column(String(64))
    redirect_uris: Mapped[list[str]] = mapped_column(default=list)
    post_logout_redirect_uris: Mapped[list[str]] = mapped_column(default=list)
    is_active: Mapped[bool] = mapped_column(default=True)
    secret_rotated_at: Mapped[datetime] = mapped_column(default=utcnow)
    last_used_at: Mapped[datetime | None] = mapped_column()
    updated_by: Mapped[str] = mapped_column(String(200))


class OidcCode(Base):
    """Code d'autorisation : usage unique, 60 s, lié au client, à l'adresse de retour, au nonce et à PKCE."""

    __tablename__ = "oidc_code"

    code_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    client_id: Mapped[str] = mapped_column(ForeignKey("oidc_client.client_id"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_user.id"))
    redirect_uri: Mapped[str] = mapped_column(String(500))
    scope: Mapped[str] = mapped_column(String(200))
    nonce: Mapped[str | None] = mapped_column(String(300))
    code_challenge: Mapped[str | None] = mapped_column(String(128))
    auth_time: Mapped[datetime] = mapped_column()
    expires_at: Mapped[datetime] = mapped_column(index=True)
    used_at: Mapped[datetime | None] = mapped_column()
