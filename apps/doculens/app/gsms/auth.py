"""Authentification DocuLens : JWT plateforme (Core) ou compte local."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.api.dependencies import db_session, require_api_key
from app.config.settings import get_settings
from app.database.user import User
from app.gsms.context import PlatformPrincipal, set_request_scope
from app.services.auth_service import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)

# Rôles Core autorisés à choisir un workspace différent de celui du jeton.
ORG_WIDE_ROLES = frozenset(
    {"consultant", "client_admin", "admin", "owner", "manager", "member"}
)


def _decode_platform_token(token: str) -> PlatformPrincipal:
    settings = get_settings()
    secret = settings.gsms_platform_jwt_secret or settings.auth_secret_key
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=[settings.auth_algorithm],
            options={"require": ["sub", "exp", "role"]},
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton plateforme invalide.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    issuer = payload.get("iss")
    if issuer not in {None, "gsms-core"}:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Émetteur de jeton non reconnu.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    workspace_id = payload.get("workspace_id")
    org_id = payload.get("org_id")
    return PlatformPrincipal(
        subject=str(payload["sub"]),
        role=str(payload.get("role") or "viewer"),
        source="platform",
        email=payload.get("email"),
        org_id=str(org_id) if org_id else None,
        workspace_id=str(workspace_id) if workspace_id else None,
    )


def _decode_local_or_platform(
    token: str, session: Session
) -> tuple[PlatformPrincipal, Optional[User]]:
    settings = get_settings()
    # Essai plateforme d'abord si un secret dédié est configuré, sinon essai local.
    try:
        unverified = jwt.get_unverified_claims(token)
    except JWTError:
        unverified = {}

    if unverified.get("iss") == "gsms-core" or settings.gsms_platform_jwt_secret:
        if unverified.get("iss") == "gsms-core":
            return _decode_platform_token(token), None

    user = decode_access_token(token, session)
    # workspace_id peut être dans le JWT local (posé à la connexion).
    try:
        claims = jwt.get_unverified_claims(token)
    except JWTError:
        claims = {}
    claim_ws = claims.get("workspace_id")
    settings = get_settings()
    workspace_id = str(claim_ws) if claim_ws else settings.default_workspace_id
    return (
        PlatformPrincipal(
            subject=str(user.id),
            role=user.role,
            source="local",
            email=user.email,
            user_id=user.id if isinstance(user.id, UUID) else UUID(str(user.id)),
            workspace_id=workspace_id,
        ),
        user,
    )


def resolve_principal(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: Session = Depends(db_session),
) -> PlatformPrincipal:
    """Exige un Bearer (plateforme ou local). L'API key seule ne suffit plus."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise (Bearer plateforme ou compte Documents).",
            headers={"WWW-Authenticate": "Bearer"},
        )
    principal, _user = _decode_local_or_platform(credentials.credentials, session)
    return principal


def resolve_workspace_id(
    principal: PlatformPrincipal,
    x_gsms_workspace_id: Optional[str] = Header(default=None, alias="X-GSMS-Workspace-Id"),
) -> str:
    header_ws = (x_gsms_workspace_id or "").strip() or None
    claim_ws = principal.workspace_id

    if header_ws and claim_ws and header_ws != claim_ws:
        if principal.role not in ORG_WIDE_ROLES and principal.source == "platform":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Workspace non autorisé pour ce jeton.",
            )

    workspace_id = header_ws or claim_ws
    if not workspace_id and principal.source in {"local", "api_key"}:
        workspace_id = get_settings().default_workspace_id
    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-GSMS-Workspace-Id est obligatoire (isolation par site).",
        )
    return workspace_id


def require_platform_auth(
    request: Request,
    principal: PlatformPrincipal = Depends(resolve_principal),
    workspace_id: str = Depends(resolve_workspace_id),
) -> PlatformPrincipal:
    """Auth + isolation site : pose le contexte de requête pour l'endpoint et les hooks."""
    set_request_scope(workspace_id=workspace_id, actor_id=principal.subject, role=principal.role)
    request.state.gsms_principal = principal
    request.state.gsms_workspace_id = workspace_id
    return principal


def require_auth_or_legacy_api_key(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: Session = Depends(db_session),
    x_gsms_workspace_id: Optional[str] = Header(default=None, alias="X-GSMS-Workspace-Id"),
) -> PlatformPrincipal:
    """Mode transition : Bearer prioritaire ; à défaut API key + header workspace (service)."""
    settings = get_settings()
    if credentials is not None:
        principal, _ = _decode_local_or_platform(credentials.credentials, session)
        workspace_id = resolve_workspace_id(principal, x_gsms_workspace_id)
        set_request_scope(workspace_id=workspace_id, actor_id=principal.subject, role=principal.role)
        request.state.gsms_principal = principal
        request.state.gsms_workspace_id = workspace_id
        return principal

    if settings.api_key:
        require_api_key(request)
        workspace_id = (x_gsms_workspace_id or "").strip() or settings.default_workspace_id
        if not workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="X-GSMS-Workspace-Id est obligatoire avec la clé API.",
            )
        principal = PlatformPrincipal(
            subject="service:api_key",
            role="admin",
            source="api_key",
            workspace_id=workspace_id,
        )
        set_request_scope(workspace_id=workspace_id, actor_id=principal.subject, role=principal.role)
        request.state.gsms_principal = principal
        request.state.gsms_workspace_id = workspace_id
        return principal

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentification requise (Bearer ou X-API-Key).",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_workspace_id(request: Request) -> str:
    """Workspace du site courant (posé par ``require_auth_or_legacy_api_key`` sur ``request.state``).

    On lit ``request.state`` plutôt qu'un ContextVar : les handlers sync FastAPI
    s'exécutent dans un threadpool où les ContextVar de la dépendance ne sont pas visibles.
    """
    workspace_id = getattr(request.state, "gsms_workspace_id", None)
    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-GSMS-Workspace-Id est obligatoire (isolation par site).",
        )
    return str(workspace_id)
