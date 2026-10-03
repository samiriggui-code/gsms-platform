from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from gsms_core.deps import WorkspaceContext, get_db, require_workspace
from gsms_core.workspaces.dashboard import DashboardOut, build_dashboard

router = APIRouter(prefix="/api/v1/workspaces/{ws}", tags=["workspaces"])


@router.get("/dashboard", response_model=DashboardOut)
def workspace_dashboard(
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
) -> DashboardOut:
    """Agrégat attention / échéances / missions / activité pour le tableau de bord web."""
    return build_dashboard(db, ctx.workspace_id)
