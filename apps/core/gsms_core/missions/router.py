from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from gsms_core.deps import WorkspaceContext, get_db, require_roles, require_workspace
from gsms_core.identity.models import MANAGE_ROLES
from gsms_core.missions import service
from gsms_core.missions.models import Mission, MissionStatus
from gsms_core.missions.schemas import ExternalRefIn, ExternalRefOut, MissionIn, MissionOut, MissionPatch
from gsms_core.missions.uri import InvalidUri

router = APIRouter(prefix="/api/v1/workspaces/{ws}/missions", tags=["missions"])


def load_mission(
    mission_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)
) -> Mission:
    try:
        return service.get_mission(db, ctx.workspace_id, mission_id)
    except service.NotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "mission introuvable") from exc


@router.get("", response_model=list[MissionOut])
def list_missions(
    status_: MissionStatus | None = Query(default=None, alias="status"),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
):
    return service.list_missions(db, ctx.workspace_id, status_)


@router.post("", response_model=MissionOut, status_code=status.HTTP_201_CREATED)
def create_mission(
    body: MissionIn,
    ctx: WorkspaceContext = Depends(require_roles(MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    mission = service.create_mission(
        db, ctx.workspace_id, body, ctx.actor, default_owner=ctx.principal.user.id
    )
    db.commit()
    return mission


@router.get("/{mission_id}", response_model=MissionOut)
def get_mission(mission: Mission = Depends(load_mission)):
    return mission


@router.patch("/{mission_id}", response_model=MissionOut)
def patch_mission(
    body: MissionPatch,
    mission: Mission = Depends(load_mission),
    ctx: WorkspaceContext = Depends(require_roles(MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    service.update_mission(db, mission, body, ctx.actor)
    db.commit()
    return mission


@router.get("/{mission_id}/external-refs", response_model=list[ExternalRefOut])
def list_refs(mission: Mission = Depends(load_mission), db: Session = Depends(get_db)):
    return service.list_external_refs(db, mission)


@router.post(
    "/{mission_id}/external-refs", response_model=ExternalRefOut, status_code=status.HTTP_201_CREATED
)
def add_ref(
    body: ExternalRefIn,
    mission: Mission = Depends(load_mission),
    ctx: WorkspaceContext = Depends(require_roles(MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    try:
        ref = service.add_external_ref(db, mission, body, ctx.actor)
    except InvalidUri as exc:
        raise HTTPException(422, str(exc)) from exc
    db.commit()
    return ref
