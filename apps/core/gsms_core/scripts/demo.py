"""Démonstration complète : comptes par rôle, prestation créée comme après un devis accepté, pièces analysées.

``python -m gsms_core.cli demo`` (idempotent) :
1. organisation cliente « ABC Retail » (sites Lyon et Paris) et ses comptes client (``seed_demo``) ;
2. un compte équipe GSMS par rôle DocuLens (admin, analyste, relecteur, manager, lecteur) ;
3. une prestation « Appel d'offres » sur le site de Lyon, créée par le WorkspaceManager comme le fera
   l'acceptation d'un devis (workspace dédié + applications du catalogue) ;
4. trois pièces client (CCTP, RC, BPU) déposées dans son coffre-fort, analysées (Docling) puis rangées ;
   le Digest relève les exigences, l'échéance et le conflit d'effectif CCTP / BPU.

Mot de passe commun : ``GSMS_SEED_PASSWORD`` (obligatoire en production, 12 caractères minimum).
"""

from __future__ import annotations

import io
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.context.workspace_manager import WorkspaceManager
from gsms_core.documents import parsing, service
from gsms_core.documents.models import Document
from gsms_core.documents.parsers.base import DocumentParser
from gsms_core.identity.models import Membership, Organization, OrganizationKind, Role, Site, User
from gsms_core.missions.models import Mission
from gsms_core.scripts.seed_demo import ORG_NAME, seed
from gsms_core.security import hash_password
from gsms_core.vault import folders
from gsms_core.vault.storage import Vault

DEMO_TITLE = "Gardiennage et sécurité incendie 2027"


@dataclass(frozen=True)
class TeamAccount:
    email: str
    name: str
    role: Role
    doculens_role: str


TEAM = (
    TeamAccount("admin@gsms.example", "Admin GSMS (démo)", Role.ADMIN, "admin"),
    TeamAccount("analyste@gsms.example", "Analyste GSMS (démo)", Role.CONSULTANT, "analyst"),
    TeamAccount("relecteur@gsms.example", "Relecteur GSMS (démo)", Role.AUDITOR, "reviewer"),
    TeamAccount("manager@gsms.example", "Manager GSMS (démo)", Role.MANAGER, "manager"),
    TeamAccount("lecteur@gsms.example", "Lecteur GSMS (démo)", Role.VIEWER, "viewer"),
)

CCTP = """# Cahier des clauses techniques particulières

## Article 4 — Moyens humains

Le titulaire doit assurer en permanence la présence de 2 agents SSIAP 1 et d'un chef d'équipe SSIAP 2.

## Article 7 — Pénalités

Tout manquement donnera lieu à des pénalités de 500 € par jour.
"""

RC = """# Règlement de la consultation

## Pièces à fournir

- Mémoire technique
- DC1 et DC2 signés

## Remise des offres

Date limite de remise des offres : 15/11/2026 à 12h00.

Toute offre incomplète sera rejetée.
"""

BPU = """Désignation,Unité,Quantité,Prix unitaire
Agent SSIAP 1,heure,1,
Chef d'équipe SSIAP 2,heure,1,
"""

PIECES = (("CCTP.md", CCTP, "text/markdown"), ("RC.md", RC, "text/markdown"), ("BPU.csv", BPU, "text/csv"))


def _gsms_org(session: Session) -> Organization:
    org = session.scalar(select(Organization).where(Organization.kind == OrganizationKind.GSMS).limit(1))
    if org is None:
        org = Organization(name="GSMS", kind=OrganizationKind.GSMS)
        session.add(org)
        session.flush()
    return org


def _ensure_member(session: Session, user: User, org_id: uuid.UUID, role: Role) -> None:
    membership = session.scalar(
        select(Membership).where(
            Membership.user_id == user.id,
            Membership.organization_id == org_id,
            Membership.workspace_id.is_(None),
        )
    )
    if membership is None:
        session.add(Membership(user_id=user.id, organization_id=org_id, workspace_id=None, role=role))
    else:
        membership.role = role


def ensure_team(session: Session, client: Organization, password: str) -> list[dict[str, str]]:
    gsms = _gsms_org(session)
    pw = hash_password(password)
    out = []
    for account in TEAM:
        user = session.scalar(select(User).where(User.email == account.email))
        if user is None:
            user = User(email=account.email, name=account.name, password_hash=pw)
            session.add(user)
            session.flush()
        else:
            user.password_hash = pw
        _ensure_member(session, user, gsms.id, account.role)
        _ensure_member(
            session, user, client.id, account.role
        )  # l'équipe voit toutes les prestations du client
        out.append(
            {"email": account.email, "core_role": account.role.value, "doculens_role": account.doculens_role}
        )
    session.flush()
    return out


def ensure_tender_workspace(session: Session, client: Organization, actor_id: uuid.UUID) -> uuid.UUID:
    existing = session.scalar(select(Mission).where(Mission.title == DEMO_TITLE))
    if existing is not None:
        return existing.workspace_id
    site = session.scalar(
        select(Site).where(Site.organization_id == client.id, Site.name.like("%Lyon%")).limit(1)
    )
    created = WorkspaceManager(session).create_workspace_for_engagement(
        client_id=client.id,
        site_id=site.id,
        engagement_type="tender",
        title=DEMO_TITLE,
        actor="service:demo",
        owner_id=actor_id,
        description="Démonstration : workspace dédié créé comme après l'acceptation du devis.",
    )
    session.flush()
    return created.workspace_id


def add_pieces(
    session: Session, vault: Vault, parser: DocumentParser, workspace_id: uuid.UUID, actor: str
) -> list[dict[str, str]]:
    root = folders.ensure_system_folders(session, workspace_id, actor)["client"]
    out = []
    for filename, text, mime in PIECES:
        if session.scalar(
            select(Document.id).where(Document.workspace_id == workspace_id, Document.title == filename)
        ):
            continue
        result = service.upload_document(
            session,
            vault,
            workspace_id=workspace_id,
            actor=actor,
            stream=io.BytesIO(text.encode("utf-8")),
            filename=filename,
            content_type=mime,
            max_bytes=10 * 1024 * 1024,
            folder_id=root.id,
        )
        parse = parsing.request_parse(session, workspace_id, result.document.id, parser, actor)
        session.commit()
        done = parsing.run_parse(session, vault, parser, parse.id)
        out.append({"piece": filename, "analyse": done.status.value, "erreur": done.error_code or ""})
    if out:
        from gsms_core.digest.schemas import WorkspaceDigest
        from gsms_core.digest.service import DigestBuildError, rebuild_digest

        try:
            built = rebuild_digest(session, workspace_id, actor="service:demo", trigger="demo")
            digest = WorkspaceDigest.model_validate(built.payload)
            folders.file_by_type(
                session, workspace_id, {d.document_id: d.business_type for d in digest.documents}
            )
        except DigestBuildError:
            pass
        session.commit()
    return out


def run_demo(session: Session, vault: Vault, parser: DocumentParser, password: str) -> dict[str, object]:
    base = seed(session, password)
    client = session.scalar(select(Organization).where(Organization.name == ORG_NAME))
    team = ensure_team(session, client, password)
    analyst = session.scalar(select(User).where(User.email == "analyste@gsms.example"))
    workspace_id = ensure_tender_workspace(session, client, analyst.id)
    session.commit()
    pieces = add_pieces(session, vault, parser, workspace_id, f"user:{analyst.id}")
    return {
        "organisation": base.get("status"),
        "equipe": team,
        "prestation_appel_offres": str(workspace_id),
        "pieces": pieces,
    }
