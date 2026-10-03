"""API Digest d'un workspace (lecture, reconstruction, conflits, informations manquantes)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from gsms_core.deps import WorkspaceContext, get_db, require_roles, require_workspace
from gsms_core.digest.schemas import Conflict, MissingInformation, WorkspaceDigest
from gsms_core.digest.service import DigestBuildError, latest_digest, load_digest, rebuild_digest
from gsms_core.identity.models import CONTRIBUTE_ROLES

router = APIRouter(prefix="/api/v1/workspaces/{ws}/digest", tags=["digest"])


def _current(db: Session, ctx: WorkspaceContext) -> WorkspaceDigest:
    record = latest_digest(db, ctx.workspace_id)
    if record is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "aucun digest pour ce workspace")
    return load_digest(record)


@router.get("", response_model=WorkspaceDigest)
def get_digest(
    ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)
) -> WorkspaceDigest:
    return _current(db, ctx)


@router.post("/rebuild", response_model=WorkspaceDigest)
def rebuild(
    mission_id: uuid.UUID | None = Query(default=None),
    ctx: WorkspaceContext = Depends(require_roles(CONTRIBUTE_ROLES)),
    db: Session = Depends(get_db),
) -> WorkspaceDigest:
    try:
        record = rebuild_digest(db, ctx.workspace_id, actor=ctx.actor, trigger="api", mission_id=mission_id)
    except LookupError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{exc} introuvable") from exc
    except DigestBuildError as exc:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"digest en échec : {exc}") from exc
    return load_digest(record)


@router.get("/conflicts", response_model=list[Conflict])
def conflicts(
    ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)
) -> list[Conflict]:
    return _current(db, ctx).conflicts


@router.get("/missing", response_model=list[MissingInformation])
def missing(
    ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)
) -> list[MissingInformation]:
    return _current(db, ctx).missing_information
