from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from gsms_core.deps import Principal, get_current_principal, get_db, get_settings_dep
from gsms_core.identity import service
from gsms_core.identity.models import Organization
from gsms_core.identity.schemas import LoginIn, MeOut, SwitchWorkspaceIn, TokenOut, WorkspaceOut
from gsms_core.security import TokenClaims, create_access_token
from gsms_core.settings import Settings

router = APIRouter(prefix="/api/v1", tags=["identity"])


def _ws_out(access: service.WorkspaceAccess) -> WorkspaceOut:
    ws = access.workspace
    return WorkspaceOut(
        id=ws.id,
        organization_id=ws.organization_id,
        site_id=ws.site_id,
        name=ws.name,
        kind=ws.kind,
        role=access.role,
    )


@router.post("/auth/login", response_model=TokenOut)
def login(
    body: LoginIn, db: Session = Depends(get_db), settings: Settings = Depends(get_settings_dep)
) -> TokenOut:
    user = service.authenticate(db, body.email, body.password)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "identifiants invalides")
    if body.workspace_id is not None:
        access = service.get_workspace_access(db, user.id, body.workspace_id)
        if access is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "workspace non autorisé")
    else:
        accesses = service.accessible_workspaces(db, user.id)
        access = accesses[0] if accesses else None
    if access is None:
        fallback = service.default_org_and_role(db, user.id)
        if fallback is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "aucun rattachement")
        org_id, role = fallback
        claims = TokenClaims(sub=user.id, org_id=org_id, workspace_id=None, role=role.value)
    else:
        claims = TokenClaims(
            sub=user.id,
            org_id=access.workspace.organization_id,
            workspace_id=access.workspace.id,
            role=access.role.value,
        )
    return TokenOut(
        access_token=create_access_token(settings, claims), workspace_id=claims.workspace_id, role=claims.role
    )


@router.get("/auth/me", response_model=MeOut)
def me(principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)) -> MeOut:
    user = principal.user
    return MeOut(
        id=user.id,
        email=user.email,
        name=user.name,
        locale=user.locale,
        org_id=principal.claims.org_id,
        organization_name=org.name if (org := db.get(Organization, principal.claims.org_id)) else None,
        workspace_id=principal.claims.workspace_id,
        role=principal.claims.role,
        workspaces=[_ws_out(a) for a in service.accessible_workspaces(db, user.id)],
    )


@router.post("/auth/switch-workspace", response_model=TokenOut)
def switch_workspace(
    body: SwitchWorkspaceIn,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> TokenOut:
    access = service.get_workspace_access(db, principal.user.id, body.workspace_id)
    if access is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "workspace non autorisé")
    claims = TokenClaims(
        sub=principal.user.id,
        org_id=access.workspace.organization_id,
        workspace_id=access.workspace.id,
        role=access.role.value,
    )
    return TokenOut(
        access_token=create_access_token(settings, claims), workspace_id=claims.workspace_id, role=access.role
    )


@router.get("/workspaces", response_model=list[WorkspaceOut])
def list_workspaces(principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)):
    return [_ws_out(a) for a in service.accessible_workspaces(db, principal.user.id)]
