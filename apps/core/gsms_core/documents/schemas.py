from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from gsms_core.documents.models import DocumentSource, DocumentStatus, ParseStatus


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    mission_id: uuid.UUID | None
    title: str
    doc_type: str | None
    status: DocumentStatus
    source: DocumentSource
    current_version_id: uuid.UUID | None
    created_at: datetime


class VersionOut(BaseModel):
    id: uuid.UUID
    n: int
    filename: str
    sha256: str
    size: int
    mime: str
    uploaded_by: str
    uploaded_at: datetime


class UploadOut(BaseModel):
    document: DocumentOut
    version: VersionOut
    blob_deduplicated: bool
    version_created: bool


class DossierOut(BaseModel):
    mission_id: uuid.UUID
    template_code: str | None
    completeness: float
    required: list[str]
    present: list[str]
    missing: list[str]


class ParseOut(BaseModel):
    """État d'un parsing ; ``summary`` résume le ``NormalizedDocument`` sans renvoyer tout le contenu."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    document_id: uuid.UUID
    version_id: uuid.UUID
    status: ParseStatus
    parser: str
    parser_version: str | None
    error_code: str | None
    error_message: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    summary: dict[str, int | None] | None = None
