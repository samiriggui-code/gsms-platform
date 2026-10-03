"""Répertoires du coffre-fort, à l'intérieur d'un workspace (une prestation).

Arborescence complète vue par l'utilisateur : Client → Site → Prestation (workspace) → dossiers.
Chaque workspace reçoit quatre dossiers système ; « Travail GSMS » n'est jamais visible des clients.
Après analyse (Digest), une pièce posée à la racine de « Pièces client » ou du « Dossier de
consultation » est rangée dans un sous-dossier à son type (CCTP, RC, BPU, registre de sécurité…).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.documents.models import Document
from gsms_core.identity.models import Role
from gsms_core.missions.uri import core_uri
from gsms_core.vault.models import Folder

CLIENT_ROLES = frozenset({Role.CLIENT_ADMIN, Role.CLIENT_MEMBER})


@dataclass(frozen=True)
class SystemFolder:
    key: str
    name: str
    client_visible: bool
    client_writable: bool


SYSTEM_FOLDERS: tuple[SystemFolder, ...] = (
    SystemFolder("client", "Pièces client", client_visible=True, client_writable=True),
    SystemFolder("consultation", "Dossier de consultation", client_visible=True, client_writable=True),
    SystemFolder("work", "Travail GSMS", client_visible=False, client_writable=False),
    SystemFolder("deliverables", "Livrables", client_visible=True, client_writable=False),
)
_BY_KEY = {f.key: f for f in SYSTEM_FOLDERS}
# Dossiers dont la racine est triée automatiquement selon le type de pièce reconnu par le Digest.
AUTO_FILED = frozenset({"client", "consultation"})

TYPE_FOLDER_NAMES = {
    "rc": "RC — Règlement de la consultation",
    "cctp": "CCTP",
    "ccap": "CCAP",
    "ae": "Acte d'engagement",
    "bpu": "BPU",
    "dpgf": "DPGF",
    "dqe": "DQE",
    "dc1": "DC1",
    "dc2": "DC2",
    "memoire_technique": "Mémoire technique",
    "registre_securite": "Registre de sécurité",
    "pv_commission_precedente": "PV de commission",
    "notice_securite": "Notice de sécurité",
    "plan_evacuation": "Plans d'évacuation",
    "contrat_maintenance_ssi": "Contrats de maintenance",
}


class FolderError(ValueError):
    pass


class FolderForbidden(PermissionError):
    pass


def is_client(role: Role) -> bool:
    return role in CLIENT_ROLES


def ensure_system_folders(session: Session, workspace_id: uuid.UUID, actor: str) -> dict[str, Folder]:
    existing = {
        f.system_key: f
        for f in session.scalars(
            select(Folder).where(Folder.workspace_id == workspace_id, Folder.system_key.is_not(None))
        )
    }
    for spec in SYSTEM_FOLDERS:
        if spec.key not in existing:
            folder = Folder(
                workspace_id=workspace_id,
                parent_id=None,
                name=spec.name,
                system_key=spec.key,
                client_visible=spec.client_visible,
                created_by=actor,
            )
            session.add(folder)
            existing[spec.key] = folder
    session.flush()
    return existing


def get_folder(session: Session, workspace_id: uuid.UUID, folder_id: uuid.UUID) -> Folder:
    folder = session.scalar(select(Folder).where(Folder.id == folder_id, Folder.workspace_id == workspace_id))
    if folder is None:
        raise LookupError("dossier")
    return folder


def root_of(session: Session, folder: Folder) -> Folder:
    seen = set()
    while folder.parent_id is not None and folder.id not in seen:
        seen.add(folder.id)
        folder = session.get(Folder, folder.parent_id)
    return folder


def path_of(session: Session, folder: Folder) -> list[Folder]:
    chain = [folder]
    while chain[0].parent_id is not None and len(chain) < 64:
        chain.insert(0, session.get(Folder, chain[0].parent_id))
    return chain


def can_see(session: Session, folder: Folder, role: Role) -> bool:
    return not is_client(role) or root_of(session, folder).client_visible


def can_write(session: Session, folder: Folder, role: Role) -> bool:
    if not is_client(role):
        return True
    root = root_of(session, folder)
    spec = _BY_KEY.get(root.system_key or "")
    return bool(spec and spec.client_writable)


def document_visible(session: Session, doc: Document, role: Role) -> bool:
    if not is_client(role):
        return True
    if doc.folder_id is None:
        return False  # pièce non rangée : réservée à l'équipe
    folder = session.get(Folder, doc.folder_id)
    return folder is not None and can_see(session, folder, role)


def visible_document_ids(session: Session, workspace_id: uuid.UUID, role: Role) -> set[uuid.UUID] | None:
    """``None`` = tout est visible (équipe) ; sinon l'ensemble des documents visibles par un client."""
    if not is_client(role):
        return None
    folders = list(session.scalars(select(Folder).where(Folder.workspace_id == workspace_id)))
    by_id = {f.id: f for f in folders}

    def visible(f: Folder) -> bool:
        guard = 0
        while f.parent_id is not None and guard < 64:
            f = by_id[f.parent_id]
            guard += 1
        return f.client_visible

    ok = {f.id for f in folders if visible(f)}
    if not ok:
        return set()
    return set(
        session.scalars(
            select(Document.id).where(Document.workspace_id == workspace_id, Document.folder_id.in_(ok))
        )
    )


def default_upload_folder(session: Session, workspace_id: uuid.UUID, actor: str) -> Folder:
    return ensure_system_folders(session, workspace_id, actor)["client"]


def resolve_upload_folder(
    session: Session, workspace_id: uuid.UUID, folder_id: uuid.UUID | None, role: Role, actor: str
) -> Folder:
    folder = (
        get_folder(session, workspace_id, folder_id)
        if folder_id
        else default_upload_folder(session, workspace_id, actor)
    )
    if not can_write(session, folder, role):
        raise FolderForbidden("dépôt non autorisé dans ce dossier")
    return folder


def _check_name(name: str) -> str:
    cleaned = " ".join(name.split())
    if not cleaned or len(cleaned) > 200 or any(c in cleaned for c in "/\\"):
        raise FolderError("nom de dossier invalide (1 à 200 caractères, sans / ni \\)")
    return cleaned


def _sibling_exists(session: Session, workspace_id, parent_id, name: str, exclude=None) -> bool:
    stmt = select(Folder.id).where(
        Folder.workspace_id == workspace_id,
        Folder.parent_id.is_(None) if parent_id is None else Folder.parent_id == parent_id,
        func.lower(Folder.name) == name.lower(),
    )
    if exclude is not None:
        stmt = stmt.where(Folder.id != exclude)
    return session.scalar(stmt.limit(1)) is not None


def create_folder(
    session: Session, workspace_id: uuid.UUID, parent_id: uuid.UUID, name: str, role: Role, actor: str
) -> Folder:
    ensure_system_folders(session, workspace_id, actor)
    parent = get_folder(session, workspace_id, parent_id)
    if not can_write(session, parent, role):
        raise FolderForbidden("création non autorisée dans ce dossier")
    name = _check_name(name)
    if _sibling_exists(session, workspace_id, parent.id, name):
        raise FolderError("un dossier porte déjà ce nom ici")
    folder = Folder(
        workspace_id=workspace_id,
        parent_id=parent.id,
        name=name,
        client_visible=parent.client_visible,
        created_by=actor,
    )
    session.add(folder)
    session.flush()
    record(
        session,
        actor=actor,
        action="vault.folder.create",
        subject_uri=core_uri("folder", folder.id),
        workspace_id=workspace_id,
        after={"name": name, "parent_id": str(parent.id)},
    )
    return folder


def rename_folder(
    session: Session, workspace_id: uuid.UUID, folder_id: uuid.UUID, name: str, role: Role, actor: str
) -> Folder:
    folder = get_folder(session, workspace_id, folder_id)
    if folder.system_key:
        raise FolderError("les dossiers système ne se renomment pas")
    if not can_write(session, folder, role):
        raise FolderForbidden("modification non autorisée")
    name = _check_name(name)
    if _sibling_exists(session, workspace_id, folder.parent_id, name, exclude=folder.id):
        raise FolderError("un dossier porte déjà ce nom ici")
    before = folder.name
    folder.name = name
    record(
        session,
        actor=actor,
        action="vault.folder.rename",
        subject_uri=core_uri("folder", folder.id),
        workspace_id=workspace_id,
        before={"name": before},
        after={"name": name},
    )
    return folder


def delete_folder(
    session: Session, workspace_id: uuid.UUID, folder_id: uuid.UUID, role: Role, actor: str
) -> None:
    folder = get_folder(session, workspace_id, folder_id)
    if folder.system_key:
        raise FolderError("les dossiers système ne se suppriment pas")
    if not can_write(session, folder, role):
        raise FolderForbidden("suppression non autorisée")
    has_children = session.scalar(select(Folder.id).where(Folder.parent_id == folder.id).limit(1))
    has_docs = session.scalar(select(Document.id).where(Document.folder_id == folder.id).limit(1))
    if has_children or has_docs:
        raise FolderError("le dossier n'est pas vide")
    record(
        session,
        actor=actor,
        action="vault.folder.delete",
        subject_uri=core_uri("folder", folder.id),
        workspace_id=workspace_id,
        before={"name": folder.name, "parent_id": str(folder.parent_id)},
    )
    session.delete(folder)


def move_document(
    session: Session, workspace_id: uuid.UUID, doc: Document, folder_id: uuid.UUID, role: Role, actor: str
) -> Document:
    target = get_folder(session, workspace_id, folder_id)
    if doc.folder_id is not None:
        current = session.get(Folder, doc.folder_id)
        if current is not None and not can_write(session, current, role):
            raise FolderForbidden("déplacement non autorisé depuis ce dossier")
    if not can_write(session, target, role):
        raise FolderForbidden("déplacement non autorisé vers ce dossier")
    before = str(doc.folder_id) if doc.folder_id else None
    doc.folder_id = target.id
    record(
        session,
        actor=actor,
        action="vault.document.move",
        subject_uri=core_uri("document", doc.id),
        workspace_id=workspace_id,
        before={"folder_id": before},
        after={"folder_id": str(target.id)},
    )
    return doc


def file_by_type(session: Session, workspace_id: uuid.UUID, classified: dict[uuid.UUID, str]) -> int:
    """Range dans un sous-dossier par type les pièces posées à la racine d'un dossier trié automatiquement.

    ``classified`` : document_id → type métier reconnu par le Digest. Renvoie le nombre de pièces rangées.
    """
    roots = {
        f.id: f
        for f in session.scalars(
            select(Folder).where(
                Folder.workspace_id == workspace_id, Folder.system_key.in_(sorted(AUTO_FILED))
            )
        )
    }
    moved = 0
    for doc_id, business_type in classified.items():
        label = TYPE_FOLDER_NAMES.get(business_type)
        doc = session.get(Document, doc_id)
        if label is None or doc is None or doc.workspace_id != workspace_id or doc.folder_id not in roots:
            continue
        parent = roots[doc.folder_id]
        sub = session.scalar(
            select(Folder).where(
                Folder.workspace_id == workspace_id, Folder.parent_id == parent.id, Folder.name == label
            )
        )
        if sub is None:
            sub = Folder(
                workspace_id=workspace_id,
                parent_id=parent.id,
                name=label,
                client_visible=parent.client_visible,
                created_by="service:core",
            )
            session.add(sub)
            session.flush()
        if doc.doc_type is None:
            doc.doc_type = business_type
        move_document(session, workspace_id, doc, sub.id, Role.OWNER, "service:core")
        moved += 1
    return moved
