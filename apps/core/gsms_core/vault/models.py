from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, Timestamped, UUIDPk


class WorkspaceKey(UUIDPk, Timestamped, Base):
    """Clé de chiffrement d'un workspace, enveloppée par la clé maître (jamais stockée en clair)."""

    __tablename__ = "vault_workspace_key"
    __table_args__ = (UniqueConstraint("workspace_id", "version"),)

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    version: Mapped[int] = mapped_column(default=1)
    wrapped_key: Mapped[str] = mapped_column(String(200))


class Folder(UUIDPk, Timestamped, Base):
    """Répertoire du coffre-fort, toujours à l'intérieur d'un workspace (une prestation).

    Les dossiers système (``system_key``) sont créés pour chaque workspace et ne se renomment pas ;
    ``client_visible`` décide si les comptes client voient le dossier et tout ce qu'il contient.
    """

    __tablename__ = "vault_folder"

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("vault_folder.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    system_key: Mapped[str | None] = mapped_column(String(40))
    client_visible: Mapped[bool] = mapped_column(default=True)
    created_by: Mapped[str] = mapped_column(String(200))
