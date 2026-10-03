"""Règles d'identité : authentification et résolution des droits par workspace (côté serveur)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from gsms_core.identity.models import (
    ROLE_RANK,
    Membership,
    Organization,
    OrganizationKind,
    Role,
    User,
    Workspace,
    WorkspaceStatus,
)
from gsms_core.security import verify_password


@dataclass(frozen=True)
class WorkspaceAccess:
    workspace: Workspace
    role: Role


def authenticate(session: Session, email: str, password: str) -> User | None:
    user = session.scalar(select(User).where(User.email == email.strip().lower()))
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        return None
    return user


def _best_role(memberships: list[Membership]) -> Role | None:
    if not memberships:
        return None
    return min((m.role for m in memberships), key=lambda r: ROLE_RANK[r])


_CLIENT_ROLES = frozenset({Role.CLIENT_ADMIN, Role.CLIENT_MEMBER})


def staff_role(session: Session, user_id: uuid.UUID) -> Role | None:
    """Rôle d'équipe GSMS : membership sur l'organisation GSMS entière (pas un rôle client).

    L'équipe GSMS travaille sur toutes les prestations de tous les clients (comme DocuLens, outil interne
    d'une seule équipe) : ce rôle s'applique à chaque workspace actif. Les comptes client n'en ont jamais.
    """
    roles = session.scalars(
        select(Membership.role)
        .join(Organization, Organization.id == Membership.organization_id)
        .where(
            Membership.user_id == user_id,
            Membership.workspace_id.is_(None),
            Organization.kind == OrganizationKind.GSMS,
        )
    )
    staff = [r for r in roles if r not in _CLIENT_ROLES]
    return min(staff, key=lambda r: ROLE_RANK[r]) if staff else None


def _best(*roles: Role | None) -> Role | None:
    present = [r for r in roles if r is not None]
    return min(present, key=lambda r: ROLE_RANK[r]) if present else None


def workspace_role(session: Session, user_id: uuid.UUID, workspace: Workspace) -> Role | None:
    """Rôle effectif d'un utilisateur sur un workspace : membership directe ou membership org (NULL)."""
    memberships = list(
        session.scalars(
            select(Membership).where(
                Membership.user_id == user_id,
                Membership.organization_id == workspace.organization_id,
                or_(Membership.workspace_id == workspace.id, Membership.workspace_id.is_(None)),
            )
        )
    )
    return _best(_best_role(memberships), staff_role(session, user_id))


def get_workspace_access(
    session: Session, user_id: uuid.UUID, workspace_id: uuid.UUID
) -> WorkspaceAccess | None:
    ws = session.get(Workspace, workspace_id)
    if ws is None or ws.status != WorkspaceStatus.ACTIVE:
        return None
    role = workspace_role(session, user_id, ws)
    return WorkspaceAccess(ws, role) if role else None


def accessible_workspaces(session: Session, user_id: uuid.UUID) -> list[WorkspaceAccess]:
    memberships = list(session.scalars(select(Membership).where(Membership.user_id == user_id)))
    staff = staff_role(session, user_id)
    org_ids = {m.organization_id for m in memberships if m.workspace_id is None}
    ws_ids = {m.workspace_id for m in memberships if m.workspace_id is not None}
    if not org_ids and not ws_ids:
        return []
    stmt = select(Workspace).where(Workspace.status == WorkspaceStatus.ACTIVE).order_by(Workspace.name)
    if staff is None:
        stmt = stmt.where(or_(Workspace.organization_id.in_(org_ids), Workspace.id.in_(ws_ids)))
    out: list[WorkspaceAccess] = []
    for ws in session.scalars(stmt):
        own = _best_role(
            [
                m
                for m in memberships
                if m.organization_id == ws.organization_id and m.workspace_id in (None, ws.id)
            ]
        )
        role = _best(own, staff)
        if role:
            out.append(WorkspaceAccess(ws, role))
    return out


def default_org_and_role(session: Session, user_id: uuid.UUID) -> tuple[uuid.UUID, Role] | None:
    memberships = list(session.scalars(select(Membership).where(Membership.user_id == user_id)))
    if not memberships:
        return None
    best = min(memberships, key=lambda m: (m.workspace_id is not None, ROLE_RANK[m.role]))
    return best.organization_id, best.role
