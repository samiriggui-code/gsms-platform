from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from gsms_core.deps import WorkspaceContext, get_db, get_settings_dep, require_workspace
from gsms_core.events import service
from gsms_core.events.schemas import EventOut, IngestIn, IngestOut
from gsms_core.security import verify_hmac_sha256
from gsms_core.settings import Settings

router = APIRouter(prefix="/api/v1", tags=["events"])

SIGNATURE_HEADER = "X-GSMS-Signature"


async def signed_body(source: str, request: Request, settings: Settings = Depends(get_settings_dep)) -> bytes:
    """Vérifie ``X-GSMS-Signature: sha256=<hex>`` = HMAC-SHA256(secret de la source, corps brut)."""
    secret = settings.webhook_secrets.get(source)
    if not secret:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "source inconnue")
    body = await request.body()
    if not verify_hmac_sha256(secret, body, request.headers.get(SIGNATURE_HEADER)):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "signature invalide")
    return body


@router.post("/events/ingest/{source}", response_model=IngestOut, status_code=status.HTTP_202_ACCEPTED)
def ingest(source: str, body: bytes = Depends(signed_body), db: Session = Depends(get_db)):
    try:
        payload = IngestIn.model_validate_json(body)
        event, created = service.ingest(db, source, payload)
    except ValidationError as exc:
        raise HTTPException(422, exc.errors(include_url=False)) from exc
    except service.UnknownWorkspace as exc:
        raise HTTPException(422, "workspace inconnu") from exc
    db.commit()
    return IngestOut(id=event.id, duplicate=not created)


@router.get("/workspaces/{ws}/events", response_model=list[EventOut])
def list_events(
    type: str | None = None,
    mission_id: uuid.UUID | None = None,
    subject: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
):
    return service.list_events(
        db, ctx.workspace_id, type_=type, mission_id=mission_id, subject=subject, limit=limit
    )
