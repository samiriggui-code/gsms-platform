"""Dépendances FastAPI : session DB, principal authentifié, contrôle d'accès workspace côté serveur."""

from __future__ import annotations

import uuid
from collections.abc import Callable, Iterator
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from gsms_core.identity.models import Role, User, Workspace
from gsms_core.identity.service import get_workspace_access
from gsms_core.security import InvalidToken, TokenClaims, decode_access_token
from gsms_core.settings import Settings

_bearer = HTTPBearer(auto_error=False)


def get_settings_dep(request: Request) -> Settings:
    return request.app.state.settings


def get_db(request: Request) -> Iterator[Session]:
    yield from request.app.state.db.session()


@dataclass(frozen=True)
class Principal:
    user: User
    claims: TokenClaims

    @property
    def actor(self) -> str:
        return f"user:{self.user.id}"


@dataclass(frozen=True)
class WorkspaceContext:
    """Contexte d'une requête scopée : toute requête de repository DOIT filtrer sur ``workspace_id``."""

    workspace: Workspace
    role: Role
    principal: Principal

    @property
    def workspace_id(self) -> uuid.UUID:
        return self.workspace.id

    @property
    def actor(self) -> str:
        return self.principal.actor


def get_current_principal(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> Principal:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "jeton manquant", {"WWW-Authenticate": "Bearer"})
    try:
        claims = decode_access_token(settings, creds.credentials)
    except InvalidToken as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "jeton invalide", {"WWW-Authenticate": "Bearer"}
        ) from exc
    user = db.get(User, claims.sub)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "utilisateur inactif")
    return Principal(user=user, claims=claims)


def require_workspace(
    ws: uuid.UUID,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> WorkspaceContext:
    """Vérifie la membership (directe ou organisation entière) en base, jamais sur la seule foi du jeton."""
    access = get_workspace_access(db, principal.user.id, ws)
    if access is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "accès au workspace refusé")
    return WorkspaceContext(workspace=access.workspace, role=access.role, principal=principal)


def require_roles(allowed: frozenset[Role]) -> Callable[[WorkspaceContext], WorkspaceContext]:
    def _check(ctx: WorkspaceContext = Depends(require_workspace)) -> WorkspaceContext:
        if ctx.role not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"rôle {ctx.role.value} insuffisant")
        return ctx

    return _check
