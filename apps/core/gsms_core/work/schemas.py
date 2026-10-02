from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from gsms_core.work.models import ActionStatus, Severity


class ActionIn(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    mission_id: uuid.UUID | None = None
    priority: Severity = Severity.MINOR
    due_at: datetime | None = None
    owner_id: uuid.UUID | None = None


class ActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    mission_id: uuid.UUID | None
    title: str
    status: ActionStatus
    priority: Severity
    due_at: datetime | None
    owner_id: uuid.UUID | None
    capa_required: bool
    capa_uri: str | None
    closed_at: datetime | None


class EvidenceIn(BaseModel):
    document_version_id: uuid.UUID


class EvidenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_version_id: uuid.UUID
    target_uri: str
    captured_at: datetime
    by: str


class VerifyIn(BaseModel):
    accepted: bool = True
    comment: str | None = None
