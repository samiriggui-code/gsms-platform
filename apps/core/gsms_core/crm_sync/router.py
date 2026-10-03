"""``POST /api/v1/integrations/crm/events`` : événements du CRM, signés (HMAC, secret ``crm``)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session

from gsms_core.crm_sync import service
from gsms_core.deps import get_db, get_settings_dep
from gsms_core.events.router import signed_body
from gsms_core.settings import Settings

router = APIRouter(prefix="/api/v1/integrations", tags=["crm"])


class CrmEventIn(BaseModel):
    type: str = Field(max_length=60)
    occurred_at: str | None = None
    data: dict


async def crm_body(request: Request, settings: Settings = Depends(get_settings_dep)) -> bytes:
    return await signed_body("crm", request, settings)


@router.post("/crm/events", status_code=status.HTTP_200_OK)
def crm_event(request: Request, body: bytes = Depends(crm_body), db: Session = Depends(get_db)) -> dict:
    try:
        event = CrmEventIn.model_validate_json(body)
        result = service.handle(db, event.type, event.data)
    except ValidationError as exc:
        raise HTTPException(422, exc.errors(include_url=False)) from exc
    except service.CrmSyncError as exc:
        raise HTTPException(422, str(exc)) from exc
    db.commit()
    app_url = request.app.state.settings.app_url.rstrip("/")
    workspace = None
    if result.workspace_id:
        workspace = {
            "id": str(result.workspace_id),
            "name": result.workspace_name,
            "url": f"{app_url}/app/espace/{result.workspace_id}",
            "created": result.created_workspace,
        }
    return {
        "ok": True,
        "client_id": str(result.client_id) if result.client_id else None,
        "contact_id": str(result.contact_id) if result.contact_id else None,
        "workspace": workspace,
    }
