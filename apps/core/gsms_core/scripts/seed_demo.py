"""Jeu de démonstration : organisation « ABC Retail », sites Lyon et Paris (un workspace chacun).

Usage : ``python -m gsms_core.scripts.seed_demo`` (après ``alembic upgrade head``).
Le mot de passe commun vient de ``GSMS_SEED_PASSWORD`` : aucun secret réel n'est versionné.
"""

from __future__ import annotations

import os
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.db import Database
from gsms_core.documents.dossier import DEFAULT_TEMPLATES
from gsms_core.documents.models import DossierTemplate
from gsms_core.identity.models import (
    Membership,
    Organization,
    OrganizationKind,
    Role,
    Site,
    User,
    Workspace,
)
from gsms_core.missions.models import Mission, MissionType
from gsms_core.security import hash_password
from gsms_core.settings import get_settings

ORG_NAME = "ABC Retail"


def seed(session: Session, password: str) -> dict[str, object]:
    if session.scalar(select(Organization).where(Organization.name == ORG_NAME)):
        return {"status": "déjà présent"}

    # Réutilise l'organisation GSMS existante (créée par create-admin) : jamais de doublon.
    gsms = session.scalar(select(Organization).where(Organization.kind == OrganizationKind.GSMS).limit(1))
    if gsms is None:
        gsms = Organization(name="GSMS", kind=OrganizationKind.GSMS)
        session.add(gsms)
    org = Organization(name=ORG_NAME, kind=OrganizationKind.CLIENT, crm_company_ref="crm://company/demo-abc")
    session.add(org)
    session.flush()

    sites = {
        "lyon": Site(
            organization_id=org.id,
            name="ABC Retail Lyon Part-Dieu",
            address="Lyon (69)",
            erp_type="M",
            erp_category="2",
        ),
        "paris": Site(
            organization_id=org.id,
            name="ABC Retail Paris Rivoli",
            address="Paris (75)",
            erp_type="M",
            erp_category="1",
        ),
    }
    session.add_all(sites.values())
    session.flush()
    ws = {k: Workspace(organization_id=org.id, site_id=s.id, name=s.name) for k, s in sites.items()}
    session.add_all(ws.values())
    session.flush()

    pw = hash_password(password)
    users = {
        "owner": User(email="direction@abc-retail.example", name="Direction ABC Retail", password_hash=pw),
        "lyon": User(email="responsable.lyon@abc-retail.example", name="Responsable Lyon", password_hash=pw),
        "paris": User(
            email="responsable.paris@abc-retail.example", name="Responsable Paris", password_hash=pw
        ),
        "consultant": User(email="consultant@gsms.example", name="Consultant GSMS", password_hash=pw),
    }
    session.add_all(users.values())
    session.flush()
    session.add_all(
        [
            Membership(
                user_id=users["owner"].id, organization_id=org.id, workspace_id=None, role=Role.CLIENT_ADMIN
            ),
            Membership(
                user_id=users["lyon"].id,
                organization_id=org.id,
                workspace_id=ws["lyon"].id,
                role=Role.CLIENT_MEMBER,
            ),
            Membership(
                user_id=users["paris"].id,
                organization_id=org.id,
                workspace_id=ws["paris"].id,
                role=Role.CLIENT_MEMBER,
            ),
            Membership(
                user_id=users["consultant"].id,
                organization_id=org.id,
                workspace_id=None,
                role=Role.CONSULTANT,
            ),
            # Pas de membership sur l'organisation GSMS : ce compte de démo (mot de passe connu) verrait
            # sinon toutes les prestations des vrais clients (identity.service.staff_role).
        ]
    )
    for mission_type, (code, required) in DEFAULT_TEMPLATES.items():
        if not session.scalar(select(DossierTemplate).where(DossierTemplate.code == code)):
            session.add(
                DossierTemplate(
                    code=code,
                    mission_type=mission_type,
                    label=code.replace("_", " "),
                    required_doc_types=required,
                )
            )
    session.add(
        Mission(
            workspace_id=ws["lyon"].id,
            type=MissionType.COMMISSION_SECURITE,
            title="Préparation commission de sécurité — Lyon",
            owner_id=users["consultant"].id,
        )
    )
    session.add(
        Mission(
            workspace_id=ws["paris"].id,
            type=MissionType.AUDIT,
            title="Audit sûreté — Paris Rivoli",
            owner_id=users["consultant"].id,
        )
    )
    session.commit()
    return {
        "status": "créé",
        "organization": str(org.id),
        "workspaces": {k: str(w.id) for k, w in ws.items()},
        "users": [u.email for u in users.values()],
    }


def main() -> int:
    settings = get_settings()
    password = os.environ.get("GSMS_SEED_PASSWORD", "demo-password-change-me")
    db = Database(settings.database_url)
    with db.session_factory() as session:
        result = seed(session, password)
    print(result)
    return 0


if __name__ == "__main__":
    sys.exit(main())
