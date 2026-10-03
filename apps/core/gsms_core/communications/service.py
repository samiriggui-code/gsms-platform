"""Messagerie de la plateforme (module Communications repris de gsms-qualiopi).

- Le **planificateur** (``planner.plan``) applique le calendrier de règles (``rules/standard.yaml``) et crée
  les messages ; chaque occurrence n'est créée qu'une fois (``occurrence_key``).
- Un message vers un client (``externe``) attend la **validation** de l'équipe (réglage
  ``validation_externe``) ; les alertes internes partent sans validation.
- L'**envoi** (``dispatch``) part à la date prévue ; juste avant, ``still_relevant`` vérifie que le message a
  toujours lieu d'être (pièce déposée entre-temps, conflit résolu, règle désactivée…) : sinon il est annulé
  avec le motif.
- Tout est journalisé (audit chaîné) et publié sur l'EventBus (``communication.*``).
"""

from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.communications import templates
from gsms_core.communications.models import Message, MessageStatus, RecipientKind
from gsms_core.communications.rules import find_rule
from gsms_core.communications.sender import Sender
from gsms_core.db import utcnow
from gsms_core.events.bus import publish
from gsms_core.events.envelope import EventEnvelope
from gsms_core.identity.models import (
    Membership,
    Organization,
    OrganizationKind,
    Role,
    User,
    Workspace,
    WorkspaceStatus,
)
from gsms_core.missions.uri import core_uri
from gsms_core.platform.models import PlatformSetting

RELANCES_KEY = "relances"
RELANCES_DEFAULTS = {
    "actif": True,  # planificateur actif (le worker et « Planifier maintenant »)
    "validation_externe": True,  # messages aux clients : validation avant envoi
    "adresse_reponse": "",  # Reply-To des messages (vide : aucune)
    "rattrapage_jours": 2,  # un message dont la date est passée depuis ≤ N jours part encore
    "regles_desactivees": [],
}
ORGANISME = {"nom": "GSMS Sécurité", "couleur": "#111827"}
TEAM_ROLES = (Role.OWNER, Role.ADMIN, Role.MANAGER, Role.CONSULTANT)
ADMIN_ROLES = (Role.OWNER, Role.ADMIN)


class MessageError(ValueError):
    pass


@dataclass(frozen=True)
class Recipient:
    kind: RecipientKind
    name: str | None
    email: str | None


# --- réglages ------------------------------------------------------------------------------------------


def relance_settings(session: Session) -> dict:
    row = session.get(PlatformSetting, RELANCES_KEY)
    return RELANCES_DEFAULTS | (row.value if row else {})


def save_relance_settings(session: Session, data: dict, actor: str) -> dict:
    row = session.get(PlatformSetting, RELANCES_KEY) or PlatformSetting(
        key=RELANCES_KEY, value={}, updated_by=actor
    )
    before = dict(row.value or {})
    row.value = {k: data[k] for k in RELANCES_DEFAULTS if k in data}
    row.updated_by = actor
    row.updated_at = utcnow()
    session.add(row)
    record(
        session,
        actor=actor,
        action="platform.settings.relances",
        subject_uri="core://platform/settings/relances",
        before=before,
        after=row.value,
    )
    return relance_settings(session)


def organisme(session: Session) -> dict:
    return ORGANISME | {"reponse": relance_settings(session)["adresse_reponse"] or None}


# --- destinataires ---------------------------------------------------------------------------------------


def client_contacts(session: Session, workspace: Workspace) -> list[Recipient]:
    """Comptes client de la prestation : membres du workspace et administrateurs client de la société."""
    users = session.scalars(
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
    return [Recipient(RecipientKind.CLIENT, u.name, u.email) for u in dict.fromkeys(users)]


def staff(session: Session, roles: tuple[Role, ...], kind: RecipientKind) -> list[Recipient]:
    """Équipe GSMS (membership sur l'organisation GSMS entière) ayant l'un de ces rôles."""
    users = session.scalars(
        select(User)
        .join(Membership, Membership.user_id == User.id)
        .join(Organization, Organization.id == Membership.organization_id)
        .where(
            User.is_active.is_(True),
            Organization.kind == OrganizationKind.GSMS,
            Membership.workspace_id.is_(None),
            Membership.role.in_(roles),
        )
        .order_by(User.email)
    )
    return [Recipient(kind, u.name, u.email) for u in dict.fromkeys(users)]


def recipients(session: Session, kind: str, workspace: Workspace | None) -> list[Recipient]:
    if kind == "CLIENT":
        return client_contacts(session, workspace) if workspace else []
    if kind == "EQUIPE":
        return staff(session, TEAM_ROLES, RecipientKind.EQUIPE)
    if kind == "ADMIN":
        return staff(session, ADMIN_ROLES, RecipientKind.ADMIN)
    raise ValueError(kind)


# --- création ----------------------------------------------------------------------------------------------


def _uri(msg: Message) -> str:
    return core_uri("message", msg.id)


def _next_reference(session: Session) -> str:
    count = session.scalar(select(func.count()).select_from(Message)) or 0
    return f"MSG-{count + 1:06d}"


def _event(session: Session, msg: Message, type_: str, actor: str, data: dict | None = None) -> None:
    if msg.workspace_id is None:  # message hors prestation (synthèse, test) : audit seulement
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
                "regle": msg.rule_key,
                "statut": msg.status.value,
                **(data or {}),
            },
        ),
    )


def create_message(
    session: Session,
    rendered: templates.Rendered,
    *,
    rule_key: str,
    occurrence_key: str,
    recipient: Recipient,
    due_on: date,
    external: bool,
    actor: str,
    workspace_id: uuid.UUID | None = None,
    related_uri: str | None = None,
    needs_validation: bool = False,
) -> Message | None:
    """Crée le message s'il n'existe pas déjà pour cette occurrence (le planificateur est idempotent)."""
    if session.scalar(select(Message.id).where(Message.occurrence_key == occurrence_key[:300])):
        return None
    if not recipient.email:
        status = MessageStatus.SANS_ADRESSE
    elif needs_validation:
        status = MessageStatus.A_VALIDER
    else:
        status = MessageStatus.PREVU
    msg = Message(
        reference=_next_reference(session),
        occurrence_key=occurrence_key[:300],
        rule_key=rule_key,
        workspace_id=workspace_id,
        template=rendered.template,
        template_version=rendered.version,
        external=external,
        recipient_kind=recipient.kind,
        recipient_email=recipient.email.strip().lower() if recipient.email else None,
        recipient_name=recipient.name,
        subject=rendered.subject,
        body_html=rendered.html,
        body_text=rendered.text,
        body_sha256=hashlib.sha256(rendered.html.encode("utf-8")).hexdigest(),
        status=status,
        due_on=due_on,
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
        after={
            "reference": msg.reference,
            "regle": rule_key,
            "to": msg.recipient_email,
            "statut": status.value,
        },
    )
    _event(session, msg, "communication.created", actor)
    return msg


# --- envoi -------------------------------------------------------------------------------------------------


def still_relevant(session: Session, msg: Message) -> str | None:
    """None si le message doit toujours partir ; sinon le motif pour lequel il est devenu sans objet."""
    if msg.rule_key == "test_smtp":
        return None
    rule = find_rule(msg.rule_key)
    if rule is None:
        return "Règle supprimée du calendrier"
    if rule.cle in relance_settings(session)["regles_desactivees"]:
        return "Règle désactivée"
    if msg.workspace_id is None:
        return None
    ws = session.get(Workspace, msg.workspace_id)
    if ws is None or ws.status != WorkspaceStatus.ACTIVE:
        return "Prestation fermée"
    from gsms_core.communications import conditions

    if rule.condition == "pieces_manquantes" and not conditions.missing_pieces(session, ws):
        return "Toutes les pièces ont été déposées entre-temps"
    if rule.condition == "conflit_ouvert" and msg.related_uri:
        open_keys = {f"conflict:{c.code}:{c.key}" for c in conditions.conflicts(session, ws)}
        if msg.related_uri not in open_keys:
            return "Conflit résolu entre-temps"
    return None


def _deliver(session: Session, msg: Message, sender: Sender, enabled: bool, actor: str) -> Message:
    reason = still_relevant(session, msg)
    if reason:
        msg.status, msg.cancel_reason = MessageStatus.ANNULE, reason
        record(
            session,
            actor=actor,
            action="communication.cancel",
            subject_uri=_uri(msg),
            workspace_id=msg.workspace_id,
            after={"motif": reason, "automatique": True},
        )
        _event(session, msg, "communication.cancelled", actor, {"motif": reason})
        return msg
    msg.attempts += 1
    if not enabled:
        msg.status = MessageStatus.ECHEC
        msg.last_error = "messagerie désactivée : activer l'envoi dans Paramètres > Plateforme > Messagerie"
    else:
        try:
            msg.provider_message_id = sender.send(
                to=msg.recipient_email,
                to_name=msg.recipient_name,
                subject=msg.subject,
                html=msg.body_html,
                text=msg.body_text,
                reply_to=relance_settings(session)["adresse_reponse"] or None,
            )
            msg.status = MessageStatus.ENVOYE
            msg.sent_at = utcnow()
            msg.last_error = None
        except Exception as exc:  # serveur injoignable, identifiants refusés, adresse rejetée…
            msg.status = MessageStatus.ECHEC
            msg.last_error = f"{type(exc).__name__}: {exc}"[:2000]
    record(
        session,
        actor=actor,
        action="communication.send",
        subject_uri=_uri(msg),
        workspace_id=msg.workspace_id,
        after={"statut": msg.status.value, "tentatives": msg.attempts, "erreur": msg.last_error},
    )
    ok = msg.status == MessageStatus.ENVOYE
    _event(
        session,
        msg,
        "communication.sent" if ok else "communication.failed",
        actor,
        {"erreur": msg.last_error},
    )
    return msg


def dispatch(session: Session, sender: Sender, enabled: bool, today: date | None = None) -> dict:
    """Envoie les messages prévus dont la date est arrivée (le worker l'appelle à chaque passage)."""
    today = today or date.today()
    rows = list(
        session.scalars(
            select(Message)
            .where(Message.status == MessageStatus.PREVU, Message.due_on <= today)
            .order_by(Message.due_on)
        )
    )
    for msg in rows:
        _deliver(session, msg, sender, enabled, "service:worker")
    session.flush()

    def count(status: MessageStatus) -> int:
        return sum(1 for m in rows if m.status == status)

    return {
        "envoyes": count(MessageStatus.ENVOYE),
        "annules": count(MessageStatus.ANNULE),
        "echecs": count(MessageStatus.ECHEC),
    }


def validate(session: Session, msg: Message, sender: Sender, enabled: bool, actor: str) -> Message:
    """Validation d'un message externe : il part tout de suite (s'il a toujours lieu d'être)."""
    if msg.status != MessageStatus.A_VALIDER:
        raise MessageError(f"{msg.reference} n'est pas à valider (statut {msg.status.value})")
    msg.validated_by = actor
    msg.validated_at = utcnow()
    msg.status = MessageStatus.PREVU
    record(
        session,
        actor=actor,
        action="communication.validate",
        subject_uri=_uri(msg),
        workspace_id=msg.workspace_id,
    )
    if msg.due_on <= date.today():
        _deliver(session, msg, sender, enabled, actor)
    return msg


def cancel(session: Session, msg: Message, motif: str, actor: str) -> Message:
    if msg.status in (MessageStatus.ENVOYE, MessageStatus.ANNULE):
        raise MessageError(f"{msg.reference} est déjà {msg.status.value.lower()}")
    msg.status = MessageStatus.ANNULE
    msg.cancel_reason = motif[:1000]
    record(
        session,
        actor=actor,
        action="communication.cancel",
        subject_uri=_uri(msg),
        workspace_id=msg.workspace_id,
        after={"motif": msg.cancel_reason},
    )
    _event(session, msg, "communication.cancelled", actor, {"motif": msg.cancel_reason})
    return msg


def retry(session: Session, msg: Message, sender: Sender, enabled: bool, actor: str) -> Message:
    if msg.status != MessageStatus.ECHEC:
        raise MessageError(f"{msg.reference} n'est pas en échec")
    msg.status = MessageStatus.PREVU
    return _deliver(session, msg, sender, enabled, actor)


def send_test(session: Session, sender: Sender, enabled: bool, to: str, actor: str) -> Message:
    rendered = templates.render("test_smtp", {"organisme": organisme(session), "demandeur": actor})
    msg = create_message(
        session,
        rendered,
        rule_key="test_smtp",
        occurrence_key=f"test_smtp|{uuid.uuid4()}",
        recipient=Recipient(RecipientKind.TEST, None, to),
        due_on=date.today(),
        external=False,
        actor=actor,
    )
    return _deliver(session, msg, sender, enabled, actor)


def message_view(session: Session, msg: Message, full: bool = False) -> dict:
    ws = session.get(Workspace, msg.workspace_id) if msg.workspace_id else None
    rule = find_rule(msg.rule_key)
    label = rule.libelle if rule else ("Test d'envoi" if msg.rule_key == "test_smtp" else msg.rule_key)
    out = {
        "id": str(msg.id),
        "reference": msg.reference,
        "regle": msg.rule_key,
        "regle_libelle": label,
        "modele": msg.template,
        "version_modele": msg.template_version,
        "externe": msg.external,
        "destinataire": {
            "type": msg.recipient_kind.value,
            "nom": msg.recipient_name,
            "email": msg.recipient_email,
        },
        "prestation": {"id": str(ws.id), "nom": ws.name} if ws else None,
        "objet": msg.subject,
        "statut": msg.status.value,
        "prevu_le": msg.due_on.isoformat(),
        "valide_par": msg.validated_by,
        "valide_le": msg.validated_at.isoformat() if msg.validated_at else None,
        "envoye_le": msg.sent_at.isoformat() if msg.sent_at else None,
        "identifiant_envoi": msg.provider_message_id,
        "tentatives": msg.attempts,
        "erreur": msg.last_error,
        "motif_annulation": msg.cancel_reason,
        "empreinte": msg.body_sha256,
        "cree_le": msg.created_at.isoformat() if msg.created_at else None,
    }
    if full:
        out |= {"html": msg.body_html, "texte": msg.body_text}
    return out
