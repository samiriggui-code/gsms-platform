"""Intake public anonyme — ``POST /api/v1/intake`` (Idempotency-Key)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy.orm import Session

from gsms_core.deps import get_db, get_settings_dep
from gsms_core.intake.schemas import IntakeIn, IntakeOut
from gsms_core.intake.service import IntakeError, accept_intake
from gsms_core.settings import Settings

router = APIRouter(prefix="/api/v1", tags=["intake"])


@router.post("/intake", response_model=IntakeOut, status_code=status.HTTP_202_ACCEPTED)
def create_intake(
    body: IntakeIn,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> IntakeOut:
    if not idempotency_key:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "en-tête Idempotency-Key requis")
    try:
        out, created = accept_intake(db, body, idempotency_key=idempotency_key, settings=settings)
    except IntakeError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    db.commit()
    response.status_code = status.HTTP_201_CREATED if created else status.HTTP_202_ACCEPTED
    return out
