"""Équipe GSMS : invitation, rôles, accès par application, désactivation, liens d'activation.

Règles :
- seuls le super admin (``owner``) et les administrateurs gèrent l'équipe ;
- un administrateur ne crée ni ne modifie un super admin ou un autre administrateur (réservé au super admin) ;
- personne ne change son propre rôle ni ne se désactive ;
- il reste toujours au moins un super admin actif.

Le mot de passe n'est jamais choisi par un administrateur : le membre le définit lui-même par un lien
d'activation à usage unique (haché en base, valable 7 jours ; 24 h pour une réinitialisation).
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.db import utcnow
from gsms_core.identity import apps as app_catalog
from gsms_core.identity.models import (
    AppAccess,
    Membership,
    Organization,
    OrganizationKind,
    Role,
    User,
    UserToken,
    UserTokenPurpose,
)
from gsms_core.security import hash_password

GSMS_ORG_NAME = "GSMS"
MIN_PASSWORD_LENGTH = 12
TOKEN_TTL = {UserTokenPurpose.INVITATION: timedelta(days=7), UserTokenPurpose.RESET: timedelta(hours=24)}
_PRIVILEGED = frozenset({Role.OWNER, Role.ADMIN})
_TEAM = frozenset(Role(v) for v in app_catalog.TEAM_ROLE_VALUES)


class TeamError(Exception):
    """Refus métier (message en français, renvoyé tel quel au portail)."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


@dataclass(frozen=True)
class Member:
    user: User
    membership: Membership


def gsms_org(session: Session) -> Organization:
    org = session.scalar(
        select(Organization).where(Organization.kind == OrganizationKind.GSMS).order_by(Organization.name)
    )
    if org is None:
        org = Organization(name=GSMS_ORG_NAME, kind=OrganizationKind.GSMS)
        session.add(org)
        session.flush()
    return org


def _membership(session: Session, org: Organization, user_id: uuid.UUID) -> Membership | None:
    return session.scalar(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.organization_id == org.id,
            Membership.workspace_id.is_(None),
        )
    )


def members(session: Session) -> list[Member]:
    org = gsms_org(session)
    rows = session.execute(
        select(User, Membership)
        .join(Membership, Membership.user_id == User.id)
        .where(
            Membership.organization_id == org.id,
            Membership.workspace_id.is_(None),
            Membership.role.in_(list(_TEAM)),
        )
        .order_by(User.is_active.desc(), User.name)
    )
    return [Member(u, m) for u, m in rows]


def get_member(session: Session, user_id: uuid.UUID) -> Member:
    org = gsms_org(session)
    user = session.get(User, user_id)
    membership = _membership(session, org, user_id) if user else None
    if user is None or membership is None or membership.role not in _TEAM:
        raise TeamError("membre introuvable", 404)
    return Member(user, membership)


def _active_owners(session: Session) -> int:
    org = gsms_org(session)
    return session.scalar(
        select(func.count())
        .select_from(Membership)
        .join(User, User.id == Membership.user_id)
        .where(
            Membership.organization_id == org.id,
            Membership.workspace_id.is_(None),
            Membership.role == Role.OWNER,
            User.is_active.is_(True),
        )
    )


def _check_can_manage(actor_role: Role, target_role: Role | None, new_role: Role | None) -> None:
    if actor_role not in _PRIVILEGED:
        raise TeamError("réservé aux administrateurs de la plateforme", 403)
    if actor_role != Role.OWNER and (target_role in _PRIVILEGED or new_role in _PRIVILEGED):
        raise TeamError("seul le super admin gère les administrateurs", 403)


def _parse_role(value: str) -> Role:
    if value not in app_catalog.TEAM_ROLE_VALUES:
        raise TeamError(f"rôle inconnu : {value}")
    return Role(value)


# --- liens d'activation ----------------------------------------------------------------------------------


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_token(session: Session, user: User, purpose: UserTokenPurpose, actor: str) -> tuple[str, datetime]:
    """Nouveau lien (les précédents non utilisés du membre sont révoqués). Renvoie le jeton en clair."""
    now = utcnow()
    for old in session.scalars(
        select(UserToken).where(UserToken.user_id == user.id, UserToken.used_at.is_(None))
    ):
        old.used_at = now
    token = secrets.token_urlsafe(32)
    expires = now + TOKEN_TTL[purpose]
    session.add(
        UserToken(
            user_id=user.id, purpose=purpose, token_hash=_hash(token), expires_at=expires, created_by=actor
        )
    )
    session.flush()
    return token, expires


def find_token(session: Session, token: str) -> UserToken | None:
    row = session.scalar(select(UserToken).where(UserToken.token_hash == _hash(token)))
    if row is None or row.used_at is not None or row.expires_at <= utcnow():
        return None
    user = session.get(User, row.user_id)
    if user is None or (not user.is_active and row.purpose == UserTokenPurpose.RESET):
        return None
    return row


def activate(session: Session, token: str, password: str) -> User:
    row = find_token(session, token)
    if row is None:
        raise TeamError("lien invalide ou expiré : demandez un nouveau lien à un administrateur", 410)
    if len(password) < MIN_PASSWORD_LENGTH:
        raise TeamError(f"mot de passe trop court ({MIN_PASSWORD_LENGTH} caractères minimum)")
    user = session.get(User, row.user_id)
    assert user is not None
    if user.email.split("@")[0].lower() in password.lower():
        raise TeamError("le mot de passe ne doit pas contenir votre identifiant")
    user.password_hash = hash_password(password)
    user.is_active = True
    row.used_at = utcnow()
    record(
        session,
        actor=f"user:{user.id}",
        action="identity.password_set",
        subject_uri=f"gsms://identity/user/{user.id}",
        after={"via": row.purpose.value},
    )
    return user


# --- gestion de l'équipe ---------------------------------------------------------------------------------


def invite(session: Session, actor: User, actor_role: Role, email: str, name: str, role: str) -> Member:
    new_role = _parse_role(role)
    _check_can_manage(actor_role, None, new_role)
    email = email.strip().lower()
    org = gsms_org(session)
    user = session.scalar(select(User).where(User.email == email))
    if user is not None:
        existing = _membership(session, org, user.id)
        if existing is not None and existing.role in _TEAM:
            raise TeamError("ce compte fait déjà partie de l'équipe", 409)
        if session.scalar(select(Membership.id).where(Membership.user_id == user.id)):
            raise TeamError("cette adresse est celle d'un compte client : utilisez une autre adresse", 409)
    else:
        user = User(email=email, name=name.strip(), password_hash=None, is_active=True)
        session.add(user)
        session.flush()
    membership = Membership(user_id=user.id, organization_id=org.id, workspace_id=None, role=new_role)
    session.add(membership)
    session.flush()
    record(
        session,
        actor=f"user:{actor.id}",
        action="identity.member_invite",
        subject_uri=f"gsms://identity/user/{user.id}",
        after={"email": email, "role": new_role.value},
    )
    return Member(user, membership)


def update(
    session: Session,
    actor: User,
    actor_role: Role,
    user_id: uuid.UUID,
    *,
    name: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
) -> Member:
    member = get_member(session, user_id)
    new_role = _parse_role(role) if role is not None else None
    _check_can_manage(actor_role, member.membership.role, new_role)
    before = {"name": member.user.name, "role": member.membership.role.value, "actif": member.user.is_active}
    if member.user.id == actor.id and (
        (new_role is not None and new_role != member.membership.role) or is_active is False
    ):
        raise TeamError("vous ne pouvez pas modifier votre propre rôle ni vous désactiver", 403)
    losing_owner = (
        member.membership.role == Role.OWNER
        and member.user.is_active
        and ((new_role is not None and new_role != Role.OWNER) or is_active is False)
    )
    if losing_owner and _active_owners(session) <= 1:
        raise TeamError("il doit rester au moins un super admin actif", 409)
    if name is not None and name.strip():
        member.user.name = name.strip()
    if new_role is not None:
        member.membership.role = new_role
    if is_active is not None:
        member.user.is_active = is_active
        if not is_active:
            for tok in session.scalars(
                select(UserToken).where(UserToken.user_id == member.user.id, UserToken.used_at.is_(None))
            ):
                tok.used_at = utcnow()
    after = {"name": member.user.name, "role": member.membership.role.value, "actif": member.user.is_active}
    if after != before:
        record(
            session,
            actor=f"user:{actor.id}",
            action="identity.member_update",
            subject_uri=f"gsms://identity/user/{member.user.id}",
            before=before,
            after=after,
        )
    return member


def set_app_access(
    session: Session,
    actor: User,
    actor_role: Role,
    user_id: uuid.UUID,
    app: str,
    *,
    enabled: bool,
    role: str | None,
) -> Member:
    member = get_member(session, user_id)
    _check_can_manage(actor_role, member.membership.role, None)
    catalog = app_catalog.APPS_BY_KEY.get(app)
    if catalog is None or not catalog.sso:
        raise TeamError("application inconnue ou non configurable", 404)
    if role is not None and catalog.role(role) is None:
        raise TeamError(f"rôle {catalog.name} inconnu : {role}")
    row = session.scalar(select(AppAccess).where(AppAccess.user_id == user_id, AppAccess.app == app))
    before = {"enabled": row.enabled, "role": row.role} if row else None
    default = app_catalog.DEFAULT_ROLES[member.membership.role.value].get(app)
    if enabled and role in (None, default) and default is not None:
        # Retour au rôle par défaut : plus de dérogation.
        if row is not None:
            session.delete(row)
    else:
        if row is None:
            row = AppAccess(user_id=user_id, app=app, updated_by=f"user:{actor.id}")
            session.add(row)
        row.enabled = enabled
        row.role = role if role != default else None
        row.updated_by = f"user:{actor.id}"
    session.flush()
    record(
        session,
        actor=f"user:{actor.id}",
        action="identity.app_access",
        subject_uri=f"gsms://identity/user/{user_id}",
        before=before,
        after={"app": app, "enabled": enabled, "role": role},
    )
    return member


def member_view(session: Session, member: Member) -> dict:
    user, role = member.user, member.membership.role
    pending = session.scalar(
        select(UserToken.expires_at)
        .where(UserToken.user_id == user.id, UserToken.used_at.is_(None), UserToken.expires_at > utcnow())
        .order_by(UserToken.expires_at.desc())
        .limit(1)
    )
    if not user.is_active:
        status = "desactive"
    elif user.password_hash is None:
        status = "invite"
    else:
        status = "actif"
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": role.value,
        "is_active": user.is_active,
        "status": status,
        "invitation_expires_at": pending.isoformat() if pending and status == "invite" else None,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "apps": [
            {
                "app": a.app,
                "enabled": a.enabled,
                "role": a.role,
                "default_role": a.default_role,
                "overridden": a.overridden,
            }
            for a in app_catalog.accesses(session, user.id, role)
        ],
    }


def roles_view() -> dict:
    return {
        "roles": [
            {
                "value": r.value,
                "label": r.label,
                "description": r.description,
                "apps": app_catalog.DEFAULT_ROLES[r.value],
            }
            for r in app_catalog.TEAM_ROLES
        ],
        "apps": [
            {
                "key": a.key,
                "name": a.name,
                "description": a.description,
                "sso": a.sso,
                "roles": [
                    {"value": r.value, "label": r.label, "description": r.description} for r in a.roles
                ],
            }
            for a in app_catalog.APPS
        ],
    }
