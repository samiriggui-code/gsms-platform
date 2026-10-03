"""Schémas API contexte métier / engagements / bindings."""

from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, Field

from gsms_core.missions.models import MissionOrigin


class CreateEngagementIn(BaseModel):
    client_id: uuid.UUID
    site_id: uuid.UUID
    engagement_type: str = Field(min_length=2, max_length=60)
    title: str = Field(min_length=1, max_length=300)
    description: str | None = None
    origin: MissionOrigin = MissionOrigin.MANUAL
    attach_catalog_apps: bool = True


class EngagementWorkspaceOut(BaseModel):
    client_id: uuid.UUID
    site_id: uuid.UUID
    engagement_id: uuid.UUID
    workspace_id: uuid.UUID
    engagement_type: str
    applications: list[str]


class AttachApplicationIn(BaseModel):
    application_id: str = Field(min_length=2, max_length=40)
    external_workspace_id: str = Field(min_length=1, max_length=300)
    mission_id: uuid.UUID | None = None
    metadata: dict[str, Any] | None = None


class ApplicationBindingOut(BaseModel):
    id: uuid.UUID
    gsms_workspace_id: uuid.UUID
    application_id: str
    external_workspace_id: str
    status: str
    mission_id: uuid.UUID | None = None


class ContactIn(BaseModel):
    organization_id: uuid.UUID
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    title: str | None = None


class ContactOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    email: str | None
    first_name: str | None
    last_name: str | None
    phone: str | None
    title: str | None


class BindClientIn(BaseModel):
    application_id: str
    external_client_id: str


class BindContactIn(BaseModel):
    application_id: str
    external_contact_id: str


class ApplicationSpecOut(BaseModel):
    id: str
    label: str
    role: str
    kind: str = "business"
    capabilities: list[str]


class EngagementTypeOut(BaseModel):
    id: str
    label: str
    mission_type: str
    applications: list[str]
    workflow_steps: list[str]
