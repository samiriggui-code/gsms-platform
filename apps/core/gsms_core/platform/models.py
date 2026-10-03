from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, utcnow


class PlatformSetting(Base):
    """Réglage de la plateforme modifiable depuis le portail (messagerie, IA…).

    ``value`` : champs non sensibles. ``secret`` : valeur sensible chiffrée par la clé maître du coffre-fort
    (``Vault.seal``), jamais renvoyée par l'API. Un réglage absent = valeurs de l'environnement (.env).
    """

    __tablename__ = "platform_setting"

    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[dict[str, Any]] = mapped_column(default=dict)
    secret: Mapped[str | None] = mapped_column(Text)
    updated_by: Mapped[str] = mapped_column(String(200))
    updated_at: Mapped[datetime] = mapped_column(default=utcnow)
