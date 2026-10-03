"""Client de démonstration : ABC Retail, sa prestation appel d'offres et ses pièces analysées.

Seul le côté client est fictif ; les comptes de l'équipe GSMS sont de vrais comptes
(``python -m gsms_core.cli create-member``), qui voient automatiquement cette prestation.

``python -m gsms_core.cli demo`` (idempotent) :
1. organisation cliente « ABC Retail » (sites Lyon et Paris) et ses comptes client (``seed_demo``) ;
2. une prestation « Appel d'offres » sur le site de Lyon, créée par le WorkspaceManager comme le fera
   l'acceptation d'un devis (workspace dédié + applications du catalogue) ;
3. trois pièces (CCTP, RC, BPU) déposées par le client dans le coffre-fort de la prestation, analysées
   (Docling) puis rangées ; le Digest relève les exigences, l'échéance et le conflit d'effectif CCTP / BPU.

Mot de passe des comptes client de démo : ``GSMS_SEED_PASSWORD`` (obligatoire en production).
"""

from __future__ import annotations

import io
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.context.workspace_manager import WorkspaceManager
from gsms_core.documents import parsing, service
from gsms_core.documents.models import Document
from gsms_core.documents.parsers.base import DocumentParser
from gsms_core.identity.models import Membership, Organization, OrganizationKind, Role, Site, User
from gsms_core.missions.models import Mission
from gsms_core.scripts.seed_demo import ORG_NAME, seed
from gsms_core.vault import folders
from gsms_core.vault.storage import Vault

DEMO_TITLE = "Gardiennage et sécurité incendie 2027"


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


def ensure_tender_workspace(session: Session, client: Organization) -> uuid.UUID:
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
    _confine_demo_consultant(session)
    client = session.scalar(select(Organization).where(Organization.name == ORG_NAME))
    workspace_id = ensure_tender_workspace(session, client)
    session.commit()
    depositor = session.scalar(select(User).where(User.email == "responsable.lyon@abc-retail.example"))
    if depositor is not None:
        # Le responsable de Lyon dépose les pièces de la nouvelle prestation de son site.
        _grant_workspace(session, depositor, workspace_id, client.id)
        session.commit()
    actor = f"user:{depositor.id}" if depositor else "service:demo"
    pieces = add_pieces(session, vault, parser, workspace_id, actor)
    return {
        "organisation": base.get("status"),
        "prestation_appel_offres": str(workspace_id),
        "pieces": pieces,
    }


def _grant_workspace(session: Session, user: User, workspace_id: uuid.UUID, org_id: uuid.UUID) -> None:
    exists = session.scalar(
        select(Membership).where(Membership.user_id == user.id, Membership.workspace_id == workspace_id)
    )
    if exists is None:
        session.add(
            Membership(
                user_id=user.id, organization_id=org_id, workspace_id=workspace_id, role=Role.CLIENT_MEMBER
            )
        )


def _confine_demo_consultant(session: Session) -> None:
    """Anciennes installations : le consultant de démo était membre de l'organisation GSMS, ce qui, depuis que
    l'équipe GSMS voit toutes les prestations, lui ouvrirait les vrais clients. On retire ce rattachement."""
    user = session.scalar(select(User).where(User.email == "consultant@gsms.example"))
    if user is None:
        return
    for membership in session.scalars(
        select(Membership)
        .join(Organization, Organization.id == Membership.organization_id)
        .where(Membership.user_id == user.id, Organization.kind == OrganizationKind.GSMS)
    ):
        session.delete(membership)
    session.flush()
