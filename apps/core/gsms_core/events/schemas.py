from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class IngestIn(BaseModel):
    """Corps d'un webhook entrant. ``source`` est imposée par l'URL (et la signature)."""

    id: str | None = Field(default=None, max_length=64)
    type: str
    subject: str
    workspace_id: uuid.UUID
    mission_id: uuid.UUID | None = None
    actor: str | None = None
    occurred_at: datetime | None = None
    data: dict[str, Any] = Field(default_factory=dict)
    correlation_id: str | None = None
    causation_id: str | None = None


class IngestOut(BaseModel):
    id: str
    duplicate: bool


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    source: str
    subject_uri: str
    workspace_id: uuid.UUID
    mission_id: uuid.UUID | None
    actor: str
    occurred_at: datetime
    data: dict[str, Any]
    correlation_id: str
    causation_id: str | None
