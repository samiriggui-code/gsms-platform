from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from gsms_core.missions.models import MissionOrigin, MissionStatus, MissionType


class MissionIn(BaseModel):
    type: MissionType
    title: str = Field(min_length=1, max_length=300)
    due_at: datetime | None = None
    origin: MissionOrigin = MissionOrigin.MANUAL
    owner_id: uuid.UUID | None = None


class MissionPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    status: MissionStatus | None = None
    due_at: datetime | None = None


class MissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    type: MissionType
    title: str
    status: MissionStatus
    owner_id: uuid.UUID | None
    origin: MissionOrigin
    opened_at: datetime
    due_at: datetime | None
    closed_at: datetime | None


class ExternalRefIn(BaseModel):
    uri: str
    url: str | None = None
    status_snapshot: dict[str, Any] | None = None


class ExternalRefOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    mission_id: uuid.UUID | None
    uri: str
    system: str
    kind: str
    external_id: str
    url: str | None
    status_snapshot: dict[str, Any] | None
    synced_at: datetime | None
