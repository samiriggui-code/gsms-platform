"""Messagerie de la plateforme (repris du module Communications de gsms-qualiopi).

Règles :
- un message vers un client (``external``) est créé « à valider » : rien ne part sans validation d'un membre
  de l'équipe GSMS ; un message interne ou technique part directement ;
- tant que ``GSMS_MAIL_ENABLED`` est faux, l'envoi est refusé proprement (statut ``FAILED`` + raison) :
  le message reste consultable et peut être renvoyé une fois le SMTP configuré ;
- chaque étape est journalisée (audit chaîné) et publiée sur l'EventBus (``communication.*``).
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.communications import templates
from gsms_core.communications.models import Message, MessageStatus
from gsms_core.communications.sender import Sender
from gsms_core.db import utcnow
from gsms_core.events.bus import publish
from gsms_core.events.envelope import EventEnvelope
from gsms_core.identity.models import Membership, Organization, Role, User, Workspace
from gsms_core.missions.uri import core_uri
from gsms_core.settings import Settings


class MessageError(ValueError):
    pass


def _uri(msg: Message) -> str:
    return core_uri("message", msg.id)


def _next_reference(session: Session) -> str:
    count = session.scalar(select(func.count()).select_from(Message)) or 0
    return f"MSG-{count + 1:06d}"


def _event(session: Session, msg: Message, type_: str, actor: str, data: dict | None = None) -> None:
    if msg.workspace_id is None:  # message technique hors prestation : audit seulement
        return
    publish(
        session,
        EventEnvelope(
            type=type_,
            source="core",
            subject=_uri(msg),
            workspace_id=msg.workspace_id,
            actor=actor,
            data={
                "reference": msg.reference,
                "template": msg.template,
                "status": msg.status.value,
                **(data or {}),
            },
        ),
    )


def create_message(
    session: Session,
    rendered: templates.Rendered,
    *,
    to: str,
    to_name: str | None,
    actor: str,
    workspace_id: uuid.UUID | None = None,
    external: bool = True,
    related_uri: str | None = None,
) -> Message:
    msg = Message(
        reference=_next_reference(session),
        workspace_id=workspace_id,
        template=rendered.template,
        template_version=rendered.version,
        external=external,
        recipient_email=to.strip().lower(),
        recipient_name=to_name,
        subject=rendered.subject,
        body_html=rendered.html,
        body_text=rendered.text,
        status=MessageStatus.TO_VALIDATE if external else MessageStatus.QUEUED,
        related_uri=related_uri,
        created_by=actor,
    )
    session.add(msg)
    session.flush()
    record(
        session,
        actor=actor,
        action="communication.create",
        subject_uri=_uri(msg),
        workspace_id=workspace_id,
        after={"reference": msg.reference, "template": msg.template, "to": msg.recipient_email},
    )
    _event(session, msg, "communication.created", actor)
    return msg


def send(session: Session, msg: Message, sender: Sender, enabled: bool, actor: str) -> Message:
    if msg.status not in (MessageStatus.QUEUED, MessageStatus.FAILED):
        raise MessageError(f"message {msg.reference} non envoyable (statut {msg.status.value})")
    msg.attempts += 1
    if not enabled:
        msg.status = MessageStatus.FAILED
        msg.last_error = "messagerie désactivée : activer l'envoi dans Paramètres > Messagerie, puis renvoyer"
    else:
        try:
            msg.provider_message_id = sender.send(
                to=msg.recipient_email,
                to_name=msg.recipient_name,
                subject=msg.subject,
                html=msg.body_html,
                text=msg.body_text,
            )
            msg.status = MessageStatus.SENT
            msg.sent_at = utcnow()
            msg.last_error = None
        except Exception as exc:  # serveur injoignable, identifiants refusés, adresse rejetée…
            msg.status = MessageStatus.FAILED
            msg.last_error = f"{type(exc).__name__}: {exc}"[:2000]
    record(
        session,
        actor=actor,
        action="communication.send",
        subject_uri=_uri(msg),
        workspace_id=msg.workspace_id,
        after={"status": msg.status.value, "attempts": msg.attempts, "error": msg.last_error},
    )
    _event(
        session,
        msg,
        "communication.sent" if msg.status == MessageStatus.SENT else "communication.failed",
        actor,
        {"error": msg.last_error},
    )
    return msg


def validate(session: Session, msg: Message, sender: Sender, enabled: bool, actor: str) -> Message:
    if msg.status != MessageStatus.TO_VALIDATE:
        raise MessageError(f"message {msg.reference} déjà traité (statut {msg.status.value})")
    msg.status = MessageStatus.QUEUED
    msg.validated_by = actor
    msg.validated_at = utcnow()
    return send(session, msg, sender, enabled, actor)


def cancel(session: Session, msg: Message, reason: str, actor: str) -> Message:
    if msg.status in (MessageStatus.SENT, MessageStatus.CANCELLED):
        raise MessageError(f"message {msg.reference} déjà {msg.status.value.lower()}")
    msg.status = MessageStatus.CANCELLED
    msg.cancel_reason = reason[:1000]
    record(
        session,
        actor=actor,
        action="communication.cancel",
        subject_uri=_uri(msg),
        workspace_id=msg.workspace_id,
        after={"reason": msg.cancel_reason},
    )
    _event(session, msg, "communication.cancelled", actor)
    return msg


# --- messages métier ------------------------------------------------------------------------------------


def client_contacts(session: Session, workspace: Workspace) -> list[User]:
    """Comptes client de la prestation : membres du workspace et administrateurs client de la société."""
    rows = session.scalars(
        select(User)
        .join(Membership, Membership.user_id == User.id)
        .where(
            User.is_active.is_(True),
            Membership.organization_id == workspace.organization_id,
            or_(
                (Membership.workspace_id == workspace.id)
                & Membership.role.in_([Role.CLIENT_MEMBER, Role.CLIENT_ADMIN]),
                Membership.workspace_id.is_(None) & (Membership.role == Role.CLIENT_ADMIN),
            ),
        )
        .order_by(User.email)
    )
    return list(dict.fromkeys(rows))


def prepare_missing_pieces(
    session: Session, workspace: Workspace, pieces: list[str], settings: Settings, actor: str
) -> list[Message]:
    """Relance « pièces manquantes » pour chaque contact client : préparée, à valider par l'équipe."""
    if not pieces:
        raise MessageError("aucune pièce manquante à demander")
    contacts = client_contacts(session, workspace)
    if not contacts:
        raise MessageError("aucun compte client rattaché à cette prestation")
    org = session.get(Organization, workspace.organization_id)
    url = f"{settings.app_url.rstrip('/')}/app/coffre-fort?ws={workspace.id}"
    out = []
    for user in contacts:
        rendered = templates.missing_pieces(
            prestation=workspace.name, client=org.name if org else "", pieces=pieces, url=url
        )
        out.append(
            create_message(
                session,
                rendered,
                to=user.email,
                to_name=user.name,
                actor=actor,
                workspace_id=workspace.id,
                external=True,
                related_uri=f"digest://{workspace.id}",
            )
        )
    return out
