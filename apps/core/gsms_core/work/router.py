from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from gsms_core.deps import WorkspaceContext, get_db, require_roles, require_workspace
from gsms_core.documents.service import NotFound as DocNotFound
from gsms_core.identity.models import CONTRIBUTE_ROLES, MANAGE_ROLES
from gsms_core.missions.service import NotFound as MissionNotFound
from gsms_core.missions.service import get_mission
from gsms_core.work import service
from gsms_core.work.models import Action, ActionStatus
from gsms_core.work.schemas import ActionIn, ActionOut, EvidenceIn, EvidenceOut, VerifyIn

router = APIRouter(prefix="/api/v1/workspaces/{ws}/actions", tags=["actions"])


def load_action(
    action_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)
) -> Action:
    try:
        return service.get_action(db, ctx.workspace_id, action_id)
    except service.NotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "action introuvable") from exc


@router.get("", response_model=list[ActionOut])
def list_actions(
    status_: ActionStatus | None = Query(default=None, alias="status"),
    mission_id: uuid.UUID | None = None,
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
):
    return service.list_actions(db, ctx.workspace_id, status_, mission_id)


@router.post("", response_model=ActionOut, status_code=status.HTTP_201_CREATED)
def create_action(
    body: ActionIn,
    ctx: WorkspaceContext = Depends(require_roles(MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    if body.mission_id:
        try:
            get_mission(db, ctx.workspace_id, body.mission_id)
        except MissionNotFound as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "mission introuvable") from exc
    action = service.create_action(db, workspace_id=ctx.workspace_id, actor=ctx.actor, **body.model_dump())
    db.commit()
    return action


@router.get("/{action_id}", response_model=ActionOut)
def get_action(action: Action = Depends(load_action)):
    return action


@router.post("/{action_id}/evidence", response_model=EvidenceOut, status_code=status.HTTP_201_CREATED)
def add_evidence(
    body: EvidenceIn,
    action: Action = Depends(load_action),
    ctx: WorkspaceContext = Depends(require_roles(CONTRIBUTE_ROLES)),
    db: Session = Depends(get_db),
):
    try:
        ev = service.add_evidence(db, action, body.document_version_id, ctx.actor)
    except DocNotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "version de document introuvable") from exc
    db.commit()
    return ev


@router.post("/{action_id}/verify", response_model=ActionOut)
def verify(
    body: VerifyIn,
    action: Action = Depends(load_action),
    ctx: WorkspaceContext = Depends(require_roles(MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    try:
        service.verify_action(db, action, ctx.actor, accepted=body.accepted, comment=body.comment)
    except service.InvalidTransition as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    db.commit()
    db.refresh(action)
    return action
