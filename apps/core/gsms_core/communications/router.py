"""API des communications (équipe GSMS) : boîte des messages par statut, lecture du contenu exact,
valider / annuler (avec motif) / réessayer, planifier à la demande, catalogue des règles.
Les comptes client n'y ont pas accès. Repris de gsms-qualiopi (``app/relances/router.py``)."""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from gsms_core.communications import service
from gsms_core.communications.models import Message, MessageStatus
from gsms_core.communications.planner import plan
from gsms_core.communications.rules import load_rules
from gsms_core.communications.sender import SmtpSender
from gsms_core.deps import Principal, get_current_principal, get_db
from gsms_core.identity.models import Role
from gsms_core.identity.service import staff_role
from gsms_core.platform.service import mail_config

router = APIRouter(prefix="/api/v1/communications", tags=["communications"])
READ_ROLES = frozenset({Role.OWNER, Role.ADMIN, Role.MANAGER, Role.CONSULTANT, Role.AUDITOR, Role.VIEWER})
MANAGE_ROLES = frozenset({Role.OWNER, Role.ADMIN, Role.MANAGER, Role.CONSULTANT})


def _staff(roles: frozenset[Role]):
    def check(
        principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)
    ) -> Principal:
        if staff_role(db, principal.user.id) not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "réservé à l'équipe GSMS")
        return principal

    return check


Reader = Depends(_staff(READ_ROLES))
Manager = Depends(_staff(MANAGE_ROLES))


def sender_for(request: Request, db: Session):
    """Réglages effectifs (portail, sinon .env) ; ``app.state.mail_sender`` remplace l'envoi réel en test."""
    cfg = mail_config(db, request.app.state.settings, request.app.state.vault)
    return request.app.state.mail_sender or SmtpSender(cfg), cfg.mail_enabled


def _actor(p: Principal) -> str:
    return f"{p.user.name} <{p.user.email}>"


def _get(db: Session, message_id: uuid.UUID) -> Message:
    msg = db.get(Message, message_id)
    if msg is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "message introuvable")
    return msg


def _errors(fn):
    try:
        return fn()
    except service.MessageError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.get("")
def list_messages(
    statut: MessageStatus | None = None,
    workspace_id: uuid.UUID | None = None,
    limite: int = 300,
    user: Principal = Reader,
    db: Session = Depends(get_db),
) -> dict:
    q = select(Message).order_by(Message.due_on.desc(), Message.created_at.desc())
    counts_q = select(Message.status, func.count()).group_by(Message.status)
    if statut:
        q = q.where(Message.status == statut)
    if workspace_id:
        q = q.where(Message.workspace_id == workspace_id)
        counts_q = counts_q.where(Message.workspace_id == workspace_id)
    counts = {s.value: n for s, n in db.execute(counts_q).all()}
    return {
        "compteurs": counts,
        "peut_gerer": staff_role(db, user.user.id) in MANAGE_ROLES,
        "messages": [service.message_view(db, m) for m in db.scalars(q.limit(min(limite, 1000)))],
    }


@router.get("/regles")
def rules(_: Principal = Reader, db: Session = Depends(get_db)) -> list[dict]:
    disabled = set(service.relance_settings(db)["regles_desactivees"])
    return [r.model_dump() | {"active": r.cle not in disabled} for r in load_rules()]


@router.get("/{message_id}")
def get_message(message_id: uuid.UUID, _: Principal = Reader, db: Session = Depends(get_db)) -> dict:
    return service.message_view(db, _get(db, message_id), full=True)


@router.get("/{message_id}/apercu", response_class=HTMLResponse)
def preview(message_id: uuid.UUID, _: Principal = Reader, db: Session = Depends(get_db)) -> HTMLResponse:
    """Le message exactement tel qu'il part (ou est parti), sans script ni ressource externe."""
    return HTMLResponse(
        _get(db, message_id).body_html,
        headers={"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:"},
    )


@router.post("/{message_id}/valider")
def validate(
    message_id: uuid.UUID, request: Request, user: Principal = Manager, db: Session = Depends(get_db)
) -> dict:
    msg = _get(db, message_id)
    _errors(lambda: service.validate(db, msg, *sender_for(request, db), _actor(user)))
    db.commit()
    return service.message_view(db, msg)


class CancelIn(BaseModel):
    motif: str = Field(min_length=1, max_length=1000)


@router.post("/{message_id}/annuler")
def cancel(
    message_id: uuid.UUID, body: CancelIn, user: Principal = Manager, db: Session = Depends(get_db)
) -> dict:
    msg = _get(db, message_id)
    _errors(lambda: service.cancel(db, msg, body.motif.strip(), _actor(user)))
    db.commit()
    return service.message_view(db, msg)


@router.post("/{message_id}/renvoyer")
def retry(
    message_id: uuid.UUID, request: Request, user: Principal = Manager, db: Session = Depends(get_db)
) -> dict:
    msg = _get(db, message_id)
    _errors(lambda: service.retry(db, msg, *sender_for(request, db), _actor(user)))
    db.commit()
    return service.message_view(db, msg)


@router.post("/planifier")
def run_now(
    request: Request, le: date | None = None, _: Principal = Manager, db: Session = Depends(get_db)
) -> dict:
    """Passage immédiat du planificateur et de l'envoi (le worker le fait aussi à chaque passage)."""
    result = plan(db, request.app.state.settings, le)
    if not result.get("inactif"):
        result |= service.dispatch(db, *sender_for(request, db), le)
    db.commit()
    return result
