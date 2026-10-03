"""API messagerie : liste et aperçu des messages d'une prestation, validation / annulation / renvoi (équipe),
préparation de la relance « pièces manquantes » à partir du Digest. Les comptes client n'y ont pas accès."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.communications import service
from gsms_core.communications.models import Message, MessageStatus
from gsms_core.deps import WorkspaceContext, get_db, require_roles, require_workspace
from gsms_core.digest.completeness import _LABELS as PIECE_LABELS
from gsms_core.digest.service import latest_digest, load_digest
from gsms_core.identity.models import MANAGE_ROLES, Role

router = APIRouter(prefix="/api/v1/workspaces/{ws}/communications", tags=["communications"])
_CLIENT = {Role.CLIENT_ADMIN, Role.CLIENT_MEMBER}


class MessageOut(BaseModel):
    id: uuid.UUID
    reference: str
    template: str
    template_version: int
    external: bool
    recipient_email: str
    recipient_name: str | None
    subject: str
    body_text: str
    status: MessageStatus
    created_by: str
    created_at: datetime
    validated_by: str | None
    sent_at: datetime | None
    attempts: int
    last_error: str | None
    cancel_reason: str | None

    model_config = {"from_attributes": True}


class CancelIn(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)


class MissingIn(BaseModel):
    pieces: list[str] | None = Field(default=None, max_length=50)


def _team(ctx: WorkspaceContext) -> None:
    if ctx.role in _CLIENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "réservé à l'équipe GSMS")


def _message(db: Session, ctx: WorkspaceContext, message_id: uuid.UUID) -> Message:
    msg = db.scalar(select(Message).where(Message.id == message_id, Message.workspace_id == ctx.workspace_id))
    if msg is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "message introuvable")
    return msg


def _errors(fn):
    try:
        return fn()
    except service.MessageError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.get("", response_model=list[MessageOut])
def list_messages(ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)):
    _team(ctx)
    return list(
        db.scalars(
            select(Message)
            .where(Message.workspace_id == ctx.workspace_id)
            .order_by(Message.created_at.desc())
        )
    )


@router.get("/{message_id}/apercu", response_class=HTMLResponse)
def preview(
    message_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)
):
    _team(ctx)
    return HTMLResponse(
        _message(db, ctx, message_id).body_html,
        headers={"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'"},
    )


@router.post("/{message_id}/valider", response_model=MessageOut)
def validate(
    message_id: uuid.UUID,
    request: Request,
    ctx: WorkspaceContext = Depends(require_roles(MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    msg = _message(db, ctx, message_id)
    _errors(
        lambda: service.validate(
            db, msg, request.app.state.mail_sender, request.app.state.settings, ctx.actor
        )
    )
    db.commit()
    return msg


@router.post("/{message_id}/renvoyer", response_model=MessageOut)
def resend(
    message_id: uuid.UUID,
    request: Request,
    ctx: WorkspaceContext = Depends(require_roles(MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    msg = _message(db, ctx, message_id)
    _errors(
        lambda: service.send(db, msg, request.app.state.mail_sender, request.app.state.settings, ctx.actor)
    )
    db.commit()
    return msg


@router.post("/{message_id}/annuler", response_model=MessageOut)
def cancel(
    message_id: uuid.UUID,
    body: CancelIn,
    ctx: WorkspaceContext = Depends(require_roles(MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    msg = _message(db, ctx, message_id)
    _errors(lambda: service.cancel(db, msg, body.reason, ctx.actor))
    db.commit()
    return msg


@router.post("/relance-pieces", response_model=list[MessageOut], status_code=status.HTTP_201_CREATED)
def missing_pieces(
    request: Request,
    body: MissingIn | None = None,
    ctx: WorkspaceContext = Depends(require_roles(MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    """Prépare la relance des pièces manquantes (liste fournie, sinon celle du Digest) : à valider ensuite."""
    pieces = [p.strip() for p in (body.pieces if body and body.pieces else []) if p.strip()]
    if not pieces:
        record = latest_digest(db, ctx.workspace_id)
        if record is not None:
            pieces = [
                " ou ".join(PIECE_LABELS.get(k, k) for k in m.key.split("|"))
                for m in load_digest(record).missing_information
                if m.code == "MISSING_DOCUMENT"
            ]
    messages = _errors(
        lambda: service.prepare_missing_pieces(
            db, ctx.workspace, pieces, request.app.state.settings, ctx.actor
        )
    )
    db.commit()
    return messages
