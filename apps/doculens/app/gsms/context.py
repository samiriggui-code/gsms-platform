from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

_workspace_id: ContextVar[Optional[str]] = ContextVar("gsms_workspace_id", default=None)
_actor_id: ContextVar[Optional[str]] = ContextVar("gsms_actor_id", default=None)
_actor_role: ContextVar[Optional[str]] = ContextVar("gsms_actor_role", default=None)


@dataclass(frozen=True)
class PlatformPrincipal:
    """Identité issue du Core (JWT ``iss=gsms-core``) ou d'un compte DocuLens local."""

    subject: str
    role: str
    source: str  # "platform" | "local" | "api_key"
    email: Optional[str] = None
    org_id: Optional[str] = None
    workspace_id: Optional[str] = None
    user_id: Optional[UUID] = None


def set_request_scope(*, workspace_id: str, actor_id: str, role: str) -> None:
    _workspace_id.set(workspace_id)
    _actor_id.set(actor_id)
    _actor_role.set(role)


def current_workspace_id() -> Optional[str]:
    return _workspace_id.get()


def require_current_workspace_id() -> str:
    workspace_id = _workspace_id.get()
    if not workspace_id:
        raise RuntimeError("workspace_id manquant dans le contexte de requête")
    return workspace_id


def current_actor_id() -> Optional[str]:
    return _actor_id.get()
