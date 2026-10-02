from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, Timestamped, UUIDPk, str_enum, utcnow
from gsms_core.missions.models import MissionType


class DocumentStatus(enum.StrEnum):
    UPLOADED = "UPLOADED"
    INGESTED = "INGESTED"
    CLASSIFIED = "CLASSIFIED"
    ARCHIVED = "ARCHIVED"


class DocumentSource(enum.StrEnum):
    UPLOAD = "upload"
    EMAIL = "email"
    CRM = "crm"
    GRACE = "grace"
    TENDER = "tender"
    TENDERAI = "tenderai"
    GENERATED = "generated"


class Blob(UUIDPk, Timestamped, Base):
    """Binaire unique (déduplication globale par sha256). L'accès passe par Document/Version, jamais par
    la clé objet seule."""

    __tablename__ = "document_blob"

    sha256: Mapped[str] = mapped_column(String(64), unique=True)
    size: Mapped[int] = mapped_column(BigInteger)
    mime: Mapped[str] = mapped_column(String(200))
    bucket: Mapped[str] = mapped_column(String(100))
    object_key: Mapped[str] = mapped_column(String(500))


class Document(UUIDPk, Timestamped, Base):
    __tablename__ = "document_document"

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_workspace.id"), index=True)
    mission_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("mission_mission.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    doc_type: Mapped[str | None] = mapped_column(String(100), index=True)
    status: Mapped[DocumentStatus] = mapped_column(str_enum(DocumentStatus), default=DocumentStatus.UPLOADED)
    source: Mapped[DocumentSource] = mapped_column(str_enum(DocumentSource), default=DocumentSource.UPLOAD)
    # Pas de FK vers document_version pour éviter le cycle ; cohérence assurée par le service.
    current_version_id: Mapped[uuid.UUID | None] = mapped_column()


class DocumentVersion(UUIDPk, Base):
    __tablename__ = "document_version"
    __table_args__ = (UniqueConstraint("document_id", "n"),)

    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("document_document.id"), index=True)
    n: Mapped[int] = mapped_column()
    blob_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("document_blob.id"))
    filename: Mapped[str] = mapped_column(String(300))
    uploaded_by: Mapped[str] = mapped_column(String(200))
    uploaded_at: Mapped[datetime] = mapped_column(default=utcnow)
    note: Mapped[str | None] = mapped_column(String(1000))


class DocumentLink(UUIDPk, Base):
    __tablename__ = "document_link"
    __table_args__ = (UniqueConstraint("document_id", "target_uri"),)

    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("document_document.id"), index=True)
    target_uri: Mapped[str] = mapped_column(String(500))


class DossierTemplate(UUIDPk, Base):
    __tablename__ = "document_dossier_template"

    code: Mapped[str] = mapped_column(String(80), unique=True)
    mission_type: Mapped[MissionType] = mapped_column(str_enum(MissionType), index=True)
    label: Mapped[str] = mapped_column(String(200))
    required_doc_types: Mapped[list[str]] = mapped_column(default=list)
