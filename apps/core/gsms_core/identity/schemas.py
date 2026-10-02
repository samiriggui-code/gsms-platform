from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict

from gsms_core.identity.models import Role, WorkspaceKind


class LoginIn(BaseModel):
    email: str
    password: str
    workspace_id: uuid.UUID | None = None


class SwitchWorkspaceIn(BaseModel):
    workspace_id: uuid.UUID


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105
    workspace_id: uuid.UUID | None
    role: Role


class WorkspaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    site_id: uuid.UUID | None
    name: str
    kind: WorkspaceKind
    role: Role


class MeOut(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    locale: str
    org_id: uuid.UUID
    workspace_id: uuid.UUID | None
    role: Role
    workspaces: list[WorkspaceOut]
