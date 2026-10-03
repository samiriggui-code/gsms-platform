"""Identité : organisations, sites, workspaces, utilisateurs, memberships, service accounts (§11)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from gsms_core.db import Base, Timestamped, UUIDPk, str_enum


class OrganizationKind(enum.StrEnum):
    CLIENT = "CLIENT"
    GSMS = "GSMS"
    PARTNER = "PARTNER"


class WorkspaceKind(enum.StrEnum):
    PERMANENT = "PERMANENT"
    TEMPORARY = "TEMPORARY"


class WorkspaceStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class Role(enum.StrEnum):
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    AUDITOR = "auditor"
    CONSULTANT = "consultant"
    MEMBER = "member"
    VIEWER = "viewer"
    CLIENT_ADMIN = "client_admin"
    CLIENT_MEMBER = "client_member"


# Rôles autorisés à créer/modifier des missions, actions, etc.
MANAGE_ROLES = frozenset({Role.OWNER, Role.ADMIN, Role.MANAGER, Role.CONSULTANT})
# Rôles client capables d'administrer leur org / attacher des apps.
CLIENT_ADMIN_ROLES = frozenset({Role.CLIENT_ADMIN, Role.OWNER, Role.ADMIN})
# Rôles autorisés à écrire des contenus (dépôt de pièces, preuves). viewer est en lecture seule.
CONTRIBUTE_ROLES = frozenset(set(Role) - {Role.VIEWER})
# Priorité pour choisir le rôle effectif quand plusieurs memberships s'appliquent.
ROLE_RANK = {r: i for i, r in enumerate(Role)}


class ServiceApp(enum.StrEnum):
    CRM = "crm"
    GRACE = "grace"
    QATRIAL = "qatrial"
    TENDERAI = "tenderai"
    EVE = "eve"
    DOCULENS = "doculens"
    INTAKE = "intake"


class Organization(UUIDPk, Timestamped, Base):
    __tablename__ = "identity_organization"

    name: Mapped[str] = mapped_column(String(200))
    kind: Mapped[OrganizationKind] = mapped_column(
        str_enum(OrganizationKind), default=OrganizationKind.CLIENT
    )
    siren: Mapped[str | None] = mapped_column(String(14))
    crm_company_ref: Mapped[str | None] = mapped_column(String(200))


class Site(UUIDPk, Timestamped, Base):
    __tablename__ = "identity_site"

    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_organization.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(String(500))
    erp_type: Mapped[str | None] = mapped_column(String(10))
    erp_category: Mapped[str | None] = mapped_column(String(10))
    igh_class: Mapped[str | None] = mapped_column(String(10))
    geo: Mapped[dict[str, Any] | None] = mapped_column()


class Workspace(UUIDPk, Timestamped, Base):
    __tablename__ = "identity_workspace"

    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_organization.id"), index=True)
    site_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("identity_site.id"))
    name: Mapped[str] = mapped_column(String(200))
    kind: Mapped[WorkspaceKind] = mapped_column(str_enum(WorkspaceKind), default=WorkspaceKind.PERMANENT)
    status: Mapped[WorkspaceStatus] = mapped_column(str_enum(WorkspaceStatus), default=WorkspaceStatus.ACTIVE)
    created_from_mission_id: Mapped[uuid.UUID | None] = mapped_column()


class User(UUIDPk, Timestamped, Base):
    __tablename__ = "identity_user"

    email: Mapped[str] = mapped_column(String(320), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    password_hash: Mapped[str | None] = mapped_column(String(200))
    oidc_subject: Mapped[str | None] = mapped_column(String(200))
    locale: Mapped[str] = mapped_column(String(10), default="fr-FR")
    is_active: Mapped[bool] = mapped_column(default=True)
    last_login_at: Mapped[datetime | None] = mapped_column()


class Membership(UUIDPk, Timestamped, Base):
    """Rattachement d'un utilisateur. ``workspace_id`` NULL = toute l'organisation."""

    __tablename__ = "identity_membership"
    __table_args__ = (UniqueConstraint("user_id", "organization_id", "workspace_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_user.id"), index=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_organization.id"))
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("identity_workspace.id"))
    role: Mapped[Role] = mapped_column(str_enum(Role))


class ServiceAccount(UUIDPk, Timestamped, Base):
    __tablename__ = "identity_service_account"

    name: Mapped[str] = mapped_column(String(200))
    app: Mapped[ServiceApp] = mapped_column(str_enum(ServiceApp))
    scopes: Mapped[list[str]] = mapped_column(default=list)
    key_hash: Mapped[str] = mapped_column(String(128), unique=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    last_used_at: Mapped[datetime | None] = mapped_column()


class AppAccess(UUIDPk, Timestamped, Base):
    """Dérogation d'un membre de l'équipe pour une application (GRACE, CRM, QAtrial).

    Sans ligne, le rôle se déduit du rôle Core (``identity.apps.DEFAULT_ROLES``). ``role`` NULL = rôle par
    défaut ; ``enabled`` False = accès coupé à cette application.
    """

    __tablename__ = "identity_app_access"
    __table_args__ = (UniqueConstraint("user_id", "app"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_user.id"), index=True)
    app: Mapped[str] = mapped_column(String(32))
    enabled: Mapped[bool] = mapped_column(default=True)
    role: Mapped[str | None] = mapped_column(String(40))
    updated_by: Mapped[str] = mapped_column(String(200))


class UserTokenPurpose(enum.StrEnum):
    INVITATION = "invitation"
    RESET = "reset"


class UserToken(UUIDPk, Timestamped, Base):
    """Lien d'activation (invitation) ou de réinitialisation du mot de passe : à usage unique, haché."""

    __tablename__ = "identity_user_token"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("identity_user.id"), index=True)
    purpose: Mapped[UserTokenPurpose] = mapped_column(str_enum(UserTokenPurpose))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column()
    used_at: Mapped[datetime | None] = mapped_column()
    created_by: Mapped[str] = mapped_column(String(200))
