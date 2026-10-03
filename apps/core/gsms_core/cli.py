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


# Rôles DocuLens (outil interne de l'équipe) → rôles appliqués par le Core sur toutes les prestations.
TEAM_ROLES: dict[str, Role] = {
    "admin": Role.ADMIN,  # utilisateurs, réglages, toutes les pièces
    "analyst": Role.CONSULTANT,  # dépôt, analyse, exploitation des pièces
    "reviewer": Role.AUDITOR,  # relecture, contrôle, constats
    "manager": Role.MANAGER,  # pilotage, tableaux de bord, missions
    "viewer": Role.VIEWER,  # lecture seule (aucun dépôt)
}


def create_member(session: Session, email: str, name: str, password: str, role: Role) -> str:
    """Crée (ou met à jour) un compte de l'équipe GSMS avec ce rôle. Idempotent sur l'e-mail.

    Un membre de l'équipe GSMS voit toutes les prestations de tous les clients avec ce rôle
    (``identity.service.staff_role``).
    """
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
        session.add(Membership(user_id=user.id, organization_id=gsms.id, workspace_id=None, role=role))
    else:
        membership.role = role
    session.commit()
    return status


def create_admin(session: Session, email: str, name: str, password: str) -> str:
    """Crée (ou promeut) un administrateur de l'organisation GSMS. Idempotent sur l'e-mail."""
    return create_member(session, email, name, password, Role.OWNER)


def _read_password() -> str:
    env_password = os.environ.get("GSMS_ADMIN_PASSWORD")
    if env_password:
        return env_password
    first = getpass.getpass("Mot de passe : ")
    if first != getpass.getpass("Confirmation : "):
        raise ValueError("les deux saisies diffèrent")
    return first


def _vault_migrate(settings, db: Database) -> int:
    from gsms_core.documents.storage import LocalFSStorage, build_storage
    from gsms_core.vault.migrate import migrate_legacy
    from gsms_core.vault.storage import Vault

    storage = build_storage(settings)
    legacy = (
        LocalFSStorage(settings.legacy_storage_root, settings.s3_bucket)
        if settings.legacy_storage_root
        else storage
    )
    with db.session_factory() as session:
        report = migrate_legacy(session, Vault.from_settings(storage, settings), legacy)
    print(
        f"Coffre-fort : {report.blobs_encrypted} fichier(s) chiffré(s), "
        f"{report.versions_repointed} version(s) repointée(s), {report.documents_filed} pièce(s) rangée(s), "
        f"{report.legacy_blobs_removed} ancien(s) blob(s) retiré(s)."
    )
    for error in report.errors:
        print(f"Attention : {error}", file=sys.stderr)
    return 1 if report.errors else 0


# Un compte par rôle DocuLens aux permissions distinctes (manager = analyst, developer = admin).
BOOTSTRAP_ROLES = (
    ("admin", "Administrateur GSMS", "admin"),
    ("analyste", "Analyste GSMS", "analyst"),
    ("relecteur", "Relecteur GSMS", "reviewer"),
    ("lecteur", "Lecteur GSMS", "viewer"),
)


def _new_password() -> str:
    import secrets

    return secrets.token_urlsafe(12)


def _bootstrap(settings, db: Database, args) -> int:
    rows: list[tuple[str, str, str]] = []
    with db.session_factory() as session:

        def ensure(email: str, name: str, role: Role) -> None:
            exists = session.scalar(select(User).where(User.email == email.lower()))
            if exists and not args.reset:
                create_member_role_only(session, exists, role)
                rows.append((email, role.value, "(existant, mot de passe inchangé)"))
                return
            password = _new_password()
            create_member(session, email, name, password, role)
            rows.append((email, role.value, password))

        ensure(args.super_admin, args.super_admin_name, Role.OWNER)
        for local, name, doculens in BOOTSTRAP_ROLES:
            ensure(f"{local}@{args.domain}", name, TEAM_ROLES[doculens])

    demo_password = None
    if not args.no_demo:
        from gsms_core.documents.parsers import DoclingAdapter
        from gsms_core.documents.storage import build_storage
        from gsms_core.scripts.demo import run_demo
        from gsms_core.vault.storage import Vault

        demo_password = _new_password()
        vault = Vault.from_settings(build_storage(settings), settings)
        with db.session_factory() as session:
            run_demo(session, vault, DoclingAdapter(), demo_password)
            for email in DEMO_CLIENT_ACCOUNTS:
                user = session.scalar(select(User).where(User.email == email))
                if user is not None:
                    user.password_hash = hash_password(demo_password)
            session.commit()

    with db.session_factory() as session:
        # Ancien compte équipe de démo (mot de passe connu) : désactivé, l'équipe utilise de vrais comptes.
        legacy = session.scalar(select(User).where(User.email == "consultant@gsms.example"))
        if legacy is not None and legacy.is_active:
            legacy.is_active = False
            session.commit()
            print("Compte de démo consultant@gsms.example désactivé.")

    print("\nACCÈS ÉQUIPE GSMS (notez-les maintenant : ils ne seront plus affichés)")
    print(f"{'compte':<38} {'rôle':<12} mot de passe")
    for email, role, password in rows:
        print(f"{email:<38} {role:<12} {password}")
    if demo_password:
        print("\nCLIENT DÉMO « ABC Retail » (fictif) — même mot de passe pour les 3 comptes")
        for email, label in DEMO_CLIENT_ACCOUNTS.items():
            print(f"{email:<38} {label:<26} {demo_password}")
    print("\nPortail : https://gsms-security.com   DocuLens : https://doculens.gsms-security.com")
    return 0


DEMO_CLIENT_ACCOUNTS = {
    "direction@abc-retail.example": "admin client (Lyon+Paris)",
    "responsable.lyon@abc-retail.example": "membre client (Lyon)",
    "responsable.paris@abc-retail.example": "membre client (Paris)",
}


def create_member_role_only(session: Session, user: User, role: Role) -> None:
    """Aligne le rôle d'équipe d'un compte existant sans toucher à son mot de passe."""
    gsms = session.scalar(select(Organization).where(Organization.kind == OrganizationKind.GSMS))
    if gsms is None:
        return
    membership = session.scalar(
        select(Membership).where(
            Membership.user_id == user.id,
            Membership.organization_id == gsms.id,
            Membership.workspace_id.is_(None),
        )
    )
    if membership is None:
        session.add(Membership(user_id=user.id, organization_id=gsms.id, workspace_id=None, role=role))
    else:
        membership.role = role
    session.commit()


def _mail_test(settings, db: Database, to: str) -> int:
    from gsms_core.communications import service
    from gsms_core.communications.models import MessageStatus
    from gsms_core.communications.sender import SmtpSender
    from gsms_core.documents.storage import build_storage
    from gsms_core.platform.service import mail_config
    from gsms_core.vault.storage import Vault

    with db.session_factory() as session:
        cfg = mail_config(session, settings, Vault.from_settings(build_storage(settings), settings))
        print(
            f"SMTP {cfg.smtp_host}:{cfg.smtp_port} ssl={cfg.smtp_ssl} starttls={cfg.smtp_starttls} "
            f"compte={cfg.smtp_user or '(aucun)'} expéditeur={cfg.smtp_from} actif={cfg.mail_enabled} "
            f"(réglages : {cfg.source})"
        )
        msg = service.send_test(session, SmtpSender(cfg), cfg.mail_enabled, to, "cli")
        session.commit()
        if msg.status == MessageStatus.ENVOYE:
            print(f"Envoyé à {to} ({msg.reference}).")
            return 0
        print(f"Échec ({msg.reference}) : {msg.last_error}", file=sys.stderr)
        return 1


def _worker(settings, db: Database, interval: int, once: bool) -> int:
    """Passage périodique du planificateur et de l'envoi des relances (service « worker » du déploiement)."""
    import logging
    import time

    from gsms_core.communications import service
    from gsms_core.communications.planner import plan
    from gsms_core.communications.sender import SmtpSender
    from gsms_core.documents.storage import build_storage
    from gsms_core.platform.service import mail_config
    from gsms_core.vault.storage import Vault

    logging.basicConfig(level=logging.INFO, format="%(asctime)s worker %(message)s")
    log = logging.getLogger("gsms.worker")
    vault = Vault.from_settings(build_storage(settings), settings)
    while True:
        try:
            with db.session_factory() as session:
                result = plan(session, settings)
                if not result.get("inactif"):
                    cfg = mail_config(session, settings, vault)
                    result |= service.dispatch(session, SmtpSender(cfg), cfg.mail_enabled)
                session.commit()
            log.info("passage : %s", result)
        except Exception:
            log.exception("passage en erreur")
        if once:
            return 0
        time.sleep(interval)


def _demo(settings, db: Database) -> int:
    from gsms_core.documents.parsers import DoclingAdapter
    from gsms_core.documents.storage import build_storage
    from gsms_core.scripts.demo import run_demo
    from gsms_core.vault.storage import Vault

    password = os.environ.get("GSMS_SEED_PASSWORD", "")
    if settings.env == "prod" and len(password) < MIN_PASSWORD_LENGTH:
        print(
            f"Erreur : en production, définir GSMS_SEED_PASSWORD ({MIN_PASSWORD_LENGTH} caractères minimum) "
            "pour les comptes de démonstration.",
            file=sys.stderr,
        )
        return 1
    password = password or "demo-password-change-me"
    vault = Vault.from_settings(build_storage(settings), settings)
    with db.session_factory() as session:
        result = run_demo(session, vault, DoclingAdapter(), password)
    print("Client de démonstration ABC Retail (comptes client fictifs) :")
    print("  direction@abc-retail.example          administrateur client (Lyon + Paris)")
    print("  responsable.lyon@abc-retail.example   membre client (site de Lyon)")
    print("  responsable.paris@abc-retail.example  membre client (site de Paris)")
    print("L'équipe GSMS (create-member / create-admin) voit cette prestation avec son propre rôle.")
    print(f"Prestation appel d'offres : {result['prestation_appel_offres']}")
    for piece in result["pieces"]:
        print(f"  pièce {piece['piece']} : {piece['analyse']} {piece['erreur']}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="gsms_core.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    admin = sub.add_parser("create-admin", help="créer le compte administrateur GSMS")
    admin.add_argument("email")
    admin.add_argument("name")
    member = sub.add_parser("create-member", help="créer le compte d'un membre de l'équipe GSMS")
    member.add_argument("email")
    member.add_argument("name")
    member.add_argument("--role", required=True, choices=sorted(TEAM_ROLES), help="rôle DocuLens")
    sub.add_parser("seed-demo", help="installer l'organisation de démonstration")
    boot = sub.add_parser(
        "bootstrap-access",
        help="créer le super admin, un compte par rôle DocuLens et le client démo (mots de passe générés)",
    )
    boot.add_argument("--super-admin", default="samir.iggui@gsms-security.com")
    boot.add_argument("--super-admin-name", default="Samir Iggui")
    boot.add_argument("--domain", default="gsms-security.com", help="domaine des comptes de rôle")
    boot.add_argument(
        "--reset", action="store_true", help="régénérer les mots de passe des comptes existants"
    )
    boot.add_argument("--no-demo", action="store_true", help="ne pas créer le client démo")
    worker = sub.add_parser("worker", help="planifier et envoyer les relances en continu")
    worker.add_argument("--interval", type=int, default=600, help="secondes entre deux passages")
    worker.add_argument("--once", action="store_true", help="un seul passage")
    mail = sub.add_parser("mail-test", help="envoyer un e-mail de test avec le SMTP configuré")
    mail.add_argument("to")
    sub.add_parser("vault-migrate", help="chiffrer les fichiers existants et les ranger dans le coffre-fort")
    sub.add_parser("demo", help="client de démonstration : prestation appel d'offres et pièces analysées")
    args = parser.parse_args(argv)

    settings = get_settings()
    db = Database(settings.database_url)
    if args.command == "seed-demo":
        from gsms_core.scripts.seed_demo import seed

        password = os.environ.get("GSMS_SEED_PASSWORD", "demo-password-change-me")
        with db.session_factory() as session:
            print(seed(session, password))
        return 0

    if args.command == "bootstrap-access":
        return _bootstrap(settings, db, args)
    if args.command == "worker":
        return _worker(settings, db, args.interval, args.once)
    if args.command == "mail-test":
        return _mail_test(settings, db, args.to)
    if args.command == "vault-migrate":
        return _vault_migrate(settings, db)
    if args.command == "demo":
        return _demo(settings, db)

    try:
        password = _read_password()
        with db.session_factory() as session:
            if args.command == "create-member":
                status = create_member(session, args.email, args.name, password, TEAM_ROLES[args.role])
            else:
                status = create_admin(session, args.email, args.name, password)
    except ValueError as exc:
        print(f"Erreur : {exc}", file=sys.stderr)
        return 1
    label = f"Membre ({args.role})" if args.command == "create-member" else "Administrateur"
    print(f"{label} {args.email} {status}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
