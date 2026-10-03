"""Applications de la plateforme et traduction du rôle Core en rôle propre à chaque application.

Le Core est la seule source des comptes de l'équipe. Chaque application garde sa base et ses rôles : le rôle
Core d'un membre se traduit ici (tableau ``DEFAULT_ROLES``) ; une dérogation par membre et par application
(``AppAccess``) peut changer ce rôle ou couper l'accès. Référence : docs/architecture/IDENTITE-SSO.md.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.identity.models import AppAccess, Role


@dataclass(frozen=True)
class AppRole:
    value: str
    label: str
    description: str


@dataclass(frozen=True)
class App:
    key: str
    name: str
    description: str
    sso: bool  # connexion par OIDC (sinon : directement sur le Core, comme DocuLens)
    roles: tuple[AppRole, ...]

    def role(self, value: str) -> AppRole | None:
        return next((r for r in self.roles if r.value == value), None)


# Rôles de l'équipe GSMS gérés dans le portail, du plus fort au plus faible (libellés DocuLens).
TEAM_ROLES: tuple[AppRole, ...] = (
    AppRole("owner", "Super admin", "Tout, sur toutes les applications ; gère les administrateurs."),
    AppRole("admin", "Administrateur", "Gère l'équipe, les réglages et toutes les prestations."),
    AppRole("manager", "Responsable", "Pilote les prestations, valide et suit l'activité."),
    AppRole("consultant", "Analyste", "Dépose, analyse, rédige et exporte sur toutes les prestations."),
    AppRole("member", "Membre", "Contribue aux prestations (dépôt, rédaction)."),
    AppRole("auditor", "Relecteur", "Lecture de tout ; relit et valide les productions."),
    AppRole("viewer", "Lecteur", "Lecture seule des prestations."),
)
TEAM_ROLE_VALUES = tuple(r.value for r in TEAM_ROLES)

APPS: tuple[App, ...] = (
    App(
        "doculens",
        "DocuLens",
        "Analyse documentaire, branchée directement sur le Core.",
        sso=False,
        roles=(
            AppRole("owner", "Super admin", "Tout."),
            AppRole("admin", "Admin", "Documents, utilisateurs, configuration."),
            AppRole("manager", "Manager", "Tableaux de bord et suivi."),
            AppRole("analyst", "Analyste", "Dépôt, consultation, contrôle qualité, export."),
            AppRole("reviewer", "Relecteur", "Lecture, validation des productions IA, notes."),
            AppRole("viewer", "Lecteur", "Lecture des données validées."),
        ),
    ),
    App(
        "grace",
        "GRACE",
        "Analyse de risques et évaluations de sûreté.",
        sso=True,
        roles=(
            AppRole("ADMIN", "Admin", "Tout, dont utilisateurs, organisation et approbation."),
            AppRole("LEAD_ASSESSOR", "Évaluateur principal", "Actifs, évaluations, relecture, mesures."),
            AppRole("ASSESSOR", "Évaluateur", "Actifs, évaluations, mesures, incidents, enquêtes."),
            AppRole("REVIEWER", "Relecteur", "Lecture de tout, relecture et approbation des évaluations."),
            AppRole("STAKEHOLDER", "Partie prenante", "Lecture seule."),
        ),
    ),
    App(
        "qatrial",
        "QAtrial",
        "Qualité : exigences, essais, CAPA.",
        sso=True,
        roles=(
            AppRole("admin", "Admin", "Tout, dont l'administration."),
            AppRole("qa_manager", "Responsable qualité", "Tout sauf l'administration."),
            AppRole("qa_engineer", "Ingénieur qualité", "Lecture, édition, signature, export."),
            AppRole("reviewer", "Relecteur", "Lecture, approbation, signature."),
            AppRole("auditor", "Auditeur", "Lecture et export."),
        ),
    ),
    App(
        "crm",
        "CRM",
        "Clients, contacts, devis et opportunités.",
        sso=True,
        roles=(
            AppRole("owner", "Propriétaire", "Tout, dont les rôles et la configuration."),
            AppRole("admin", "Admin", "Tout, dont les rôles et la configuration."),
            AppRole("member", "Membre", "Utilisation courante du CRM."),
        ),
    ),
)
APPS_BY_KEY = {a.key: a for a in APPS}
SSO_APPS = tuple(a.key for a in APPS if a.sso)

# Rôle Core → rôle dans chaque application. None = pas d'accès par défaut.
DEFAULT_ROLES: dict[str, dict[str, str | None]] = {
    "owner": {"doculens": "owner", "grace": "ADMIN", "qatrial": "admin", "crm": "owner"},
    "admin": {"doculens": "admin", "grace": "ADMIN", "qatrial": "admin", "crm": "admin"},
    "manager": {"doculens": "manager", "grace": "LEAD_ASSESSOR", "qatrial": "qa_manager", "crm": "member"},
    "consultant": {"doculens": "analyst", "grace": "ASSESSOR", "qatrial": "qa_engineer", "crm": "member"},
    "member": {"doculens": "analyst", "grace": "ASSESSOR", "qatrial": "qa_engineer", "crm": "member"},
    "auditor": {"doculens": "reviewer", "grace": "REVIEWER", "qatrial": "reviewer", "crm": "member"},
    "viewer": {"doculens": "viewer", "grace": "STAKEHOLDER", "qatrial": "auditor", "crm": None},
}


@dataclass(frozen=True)
class EffectiveAccess:
    app: str
    enabled: bool
    role: str | None
    default_role: str | None
    overridden: bool


def effective_access(core_role: Role | str | None, app: str, override: AppAccess | None) -> EffectiveAccess:
    default = DEFAULT_ROLES.get(str(core_role), {}).get(app) if core_role else None
    if app == "doculens" or override is None:
        # DocuLens lit le rôle Core directement : pas de dérogation possible.
        return EffectiveAccess(app, default is not None, default, default, False)
    role = override.role or default
    enabled = override.enabled and role is not None
    return EffectiveAccess(app, enabled, role if enabled else None, default, True)


def overrides(session: Session, user_id: uuid.UUID) -> dict[str, AppAccess]:
    return {a.app: a for a in session.scalars(select(AppAccess).where(AppAccess.user_id == user_id))}


def accesses(session: Session, user_id: uuid.UUID, core_role: Role | None) -> list[EffectiveAccess]:
    rows = overrides(session, user_id)
    return [effective_access(core_role, a.key, rows.get(a.key)) for a in APPS]
