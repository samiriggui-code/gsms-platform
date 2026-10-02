"""Commandes d'exploitation du Core.

    python -m gsms_core.cli create-admin vous@exemple.fr "Votre nom"
    python -m gsms_core.cli seed-demo

``create-admin`` demande le mot de passe (ou le lit dans ``GSMS_ADMIN_PASSWORD``).
``seed-demo`` installe l'organisation de démonstration (ABC Retail, sites Lyon et Paris).
"""

from __future__ import annotations

import argparse
import getpass
import os
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.db import Database
from gsms_core.identity.models import Membership, Organization, OrganizationKind, Role, User
from gsms_core.security import hash_password
from gsms_core.settings import get_settings

GSMS_ORG_NAME = "GSMS"
MIN_PASSWORD_LENGTH = 12


def create_admin(session: Session, email: str, name: str, password: str) -> str:
    """Crée (ou promeut) un administrateur de l'organisation GSMS. Idempotent sur l'e-mail."""
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"mot de passe trop court ({MIN_PASSWORD_LENGTH} caractères minimum)")
    email = email.strip().lower()
    gsms = session.scalar(select(Organization).where(Organization.kind == OrganizationKind.GSMS))
    if gsms is None:
        gsms = Organization(name=GSMS_ORG_NAME, kind=OrganizationKind.GSMS)
        session.add(gsms)
        session.flush()
    user = session.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, name=name, password_hash=hash_password(password))
        session.add(user)
        session.flush()
        status = "créé"
    else:
        user.password_hash = hash_password(password)
        user.name = name
        status = "mis à jour"
    membership = session.scalar(
        select(Membership).where(
            Membership.user_id == user.id,
            Membership.organization_id == gsms.id,
            Membership.workspace_id.is_(None),
        )
    )
    if membership is None:
        session.add(Membership(user_id=user.id, organization_id=gsms.id, workspace_id=None, role=Role.OWNER))
    else:
        membership.role = Role.OWNER
    session.commit()
    return status


def _read_password() -> str:
    env_password = os.environ.get("GSMS_ADMIN_PASSWORD")
    if env_password:
        return env_password
    first = getpass.getpass("Mot de passe : ")
    if first != getpass.getpass("Confirmation : "):
        raise ValueError("les deux saisies diffèrent")
    return first


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="gsms_core.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    admin = sub.add_parser("create-admin", help="créer le compte administrateur GSMS")
    admin.add_argument("email")
    admin.add_argument("name")
    sub.add_parser("seed-demo", help="installer l'organisation de démonstration")
    args = parser.parse_args(argv)

    settings = get_settings()
    db = Database(settings.database_url)
    if args.command == "seed-demo":
        from gsms_core.scripts.seed_demo import seed

        password = os.environ.get("GSMS_SEED_PASSWORD", "demo-password-change-me")
        with db.session_factory() as session:
            print(seed(session, password))
        return 0

    try:
        password = _read_password()
        with db.session_factory() as session:
            status = create_admin(session, args.email, args.name, password)
    except ValueError as exc:
        print(f"Erreur : {exc}", file=sys.stderr)
        return 1
    print(f"Administrateur {args.email} {status}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
