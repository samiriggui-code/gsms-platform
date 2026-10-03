"""Équipe GSMS et rôles (Paramètres → Équipe / Rôles du portail) + activation des comptes par lien."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from gsms_core.communications import service as messaging
from gsms_core.communications.models import MessageStatus, RecipientKind
from gsms_core.communications.sender import SmtpSender
from gsms_core.deps import Principal, get_current_principal, get_db
from gsms_core.identity import apps as app_catalog
from gsms_core.identity import team
from gsms_core.identity.models import Role, User, UserTokenPurpose
from gsms_core.identity.service import staff_role
from gsms_core.platform import service as platform

router = APIRouter(prefix="/api/v1", tags=["team"])

_EMAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


@router.get("/admin/roles")
def roles(principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)) -> dict:
    """Rôles de l'équipe et leur traduction dans chaque application (lecture : toute l'équipe)."""
    if staff_role(db, principal.user.id) is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "réservé à l'équipe GSMS")
    return team.roles_view()


def _team_admin(principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)):
    role = staff_role(db, principal.user.id)
    if role not in (Role.OWNER, Role.ADMIN):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "réservé aux administrateurs de la plateforme")
    return principal.user, role


def _raise(err: team.TeamError):
    raise HTTPException(err.status, str(err)) from err


class InviteIn(BaseModel):
    email: str = Field(pattern=_EMAIL, max_length=320)
    name: str = Field(min_length=2, max_length=200)
    role: str
    send_email: bool = True


class MemberPatch(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    role: str | None = None
    is_active: bool | None = None


class AppAccessIn(BaseModel):
    enabled: bool
    role: str | None = None


class LinkIn(BaseModel):
    send_email: bool = True


def _send_link(
    request: Request, db: Session, actor: User, user: User, role: Role, purpose: UserTokenPurpose, send: bool
) -> dict:
    """Crée le lien d'activation ; l'envoie par e-mail si demandé. Le lien est aussi renvoyé à
    l'administrateur (affiché une fois) pour le cas où la messagerie n'est pas encore configurée."""
    settings = request.app.state.settings
    token, expires = team.issue_token(db, user, purpose, f"user:{actor.id}")
    link = f"{settings.app_url.rstrip('/')}/activation#{token}"
    out: dict = {"activation_url": link, "expires_at": expires.isoformat(), "email": None}
    if not send:
        return out
    cfg = platform.mail_config(db, settings, request.app.state.vault)
    sender = request.app.state.mail_sender or SmtpSender(cfg)
    label = next((r.label for r in app_catalog.TEAM_ROLES if r.value == role.value), role.value)
    template = (
        "invitation_equipe" if purpose == UserTokenPurpose.INVITATION else "reinitialisation_mot_de_passe"
    )
    context = {
        "organisme": messaging.organisme(db),
        "destinataire": user.name,
        "email": user.email,
        "role": label,
        "invite_par": actor.name,
        "expire_le": expires.strftime("%d/%m/%Y à %H:%M (UTC)"),
        "lien": link,
        "action": {"lien": link, "libelle": "Choisir mon mot de passe"},
    }
    masked = {"lien": "(lien personnel, non conservé)", "action": None}
    msg = messaging.send_confidential(
        db,
        sender,
        cfg.mail_enabled,
        template=template,
        context=context,
        masked=masked,
        recipient=messaging.Recipient(RecipientKind.EQUIPE, user.name, user.email),
        actor=f"user:{actor.id}",
    )
    out["email"] = {
        "reference": msg.reference,
        "sent": msg.status == MessageStatus.ENVOYE,
        "error": msg.last_error,
    }
    return out


@router.get("/admin/team")
def list_team(admin=Depends(_team_admin), db: Session = Depends(get_db)) -> dict:
    actor, role = admin
    return {
        "me": str(actor.id),
        "my_role": role.value,
        "members": [team.member_view(db, m) for m in team.members(db)],
    }


@router.post("/admin/team", status_code=201)
def invite_member(
    body: InviteIn, request: Request, admin=Depends(_team_admin), db: Session = Depends(get_db)
) -> dict:
    actor, role = admin
    try:
        member = team.invite(db, actor, role, body.email, body.name, body.role)
    except team.TeamError as err:
        _raise(err)
    link = _send_link(
        request, db, actor, member.user, member.membership.role, UserTokenPurpose.INVITATION, body.send_email
    )
    db.commit()
    return {"member": team.member_view(db, member)} | link


@router.patch("/admin/team/{user_id}")
def update_member(
    user_id: uuid.UUID, body: MemberPatch, admin=Depends(_team_admin), db: Session = Depends(get_db)
) -> dict:
    actor, role = admin
    try:
        member = team.update(
            db, actor, role, user_id, name=body.name, role=body.role, is_active=body.is_active
        )
    except team.TeamError as err:
        _raise(err)
    db.commit()
    return team.member_view(db, member)


@router.put("/admin/team/{user_id}/apps/{app}")
def set_app_access(
    user_id: uuid.UUID,
    app: str,
    body: AppAccessIn,
    admin=Depends(_team_admin),
    db: Session = Depends(get_db),
) -> dict:
    actor, role = admin
    try:
        member = team.set_app_access(db, actor, role, user_id, app, enabled=body.enabled, role=body.role)
    except team.TeamError as err:
        _raise(err)
    db.commit()
    return team.member_view(db, member)


@router.post("/admin/team/{user_id}/link")
def new_link(
    user_id: uuid.UUID,
    request: Request,
    body: LinkIn | None = None,
    admin=Depends(_team_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Nouveau lien : invitation si le compte n'a pas encore de mot de passe, sinon réinitialisation."""
    actor, role = admin
    try:
        member = team.get_member(db, user_id)
        team.update(db, actor, role, user_id)  # mêmes règles d'autorisation qu'une modification
    except team.TeamError as err:
        _raise(err)
    if not member.user.is_active:
        raise HTTPException(status.HTTP_409_CONFLICT, "compte désactivé : réactivez-le d'abord")
    purpose = UserTokenPurpose.INVITATION if member.user.password_hash is None else UserTokenPurpose.RESET
    link = _send_link(
        request, db, actor, member.user, member.membership.role, purpose, body.send_email if body else True
    )
    db.commit()
    return {"member": team.member_view(db, member), "purpose": purpose.value} | link


# --- activation (public : le jeton fait foi) -------------------------------------------------------------


class ActivationIn(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(max_length=200)


class ActivationCheckIn(BaseModel):
    token: str = Field(min_length=20, max_length=200)


@router.post("/auth/activation/check")
def activation_info(body: ActivationCheckIn, db: Session = Depends(get_db)) -> dict:
    """Validité du lien (le jeton circule dans le corps, jamais dans une URL journalisée)."""
    row = team.find_token(db, body.token)
    if row is None:
        raise HTTPException(status.HTTP_410_GONE, "lien invalide ou expiré")
    user = db.get(User, row.user_id)
    assert user is not None
    return {
        "email": user.email,
        "name": user.name,
        "purpose": row.purpose.value,
        "expires_at": row.expires_at.isoformat(),
        "min_length": team.MIN_PASSWORD_LENGTH,
    }


@router.post("/auth/activation")
def activate(body: ActivationIn, db: Session = Depends(get_db)) -> dict:
    try:
        user = team.activate(db, body.token, body.password)
    except team.TeamError as err:
        _raise(err)
    db.commit()
    return {"ok": True, "email": user.email}
