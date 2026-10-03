"""API du coffre-fort : arbre Client → Site → Prestation, dossiers d'une prestation, contenu d'un dossier,
déplacement, vérification d'intégrité, journal des accès. Le dépôt et le téléchargement passent par
``/api/v1/workspaces/{ws}/documents`` (chiffrement et journalisation au même endroit)."""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from gsms_core.audit.models import AuditLog
from gsms_core.audit.service import record
from gsms_core.deps import (
    Principal,
    WorkspaceContext,
    get_current_principal,
    get_db,
    require_roles,
    require_workspace,
)
from gsms_core.documents import parsing, service
from gsms_core.documents.models import Blob, Document, DocumentVersion, ParseStatus
from gsms_core.identity.models import CONTRIBUTE_ROLES, Organization, Site, User
from gsms_core.identity.service import accessible_workspaces
from gsms_core.missions.uri import core_uri
from gsms_core.vault import folders
from gsms_core.vault.models import Folder

router = APIRouter(prefix="/api/v1", tags=["vault"])


# --- schémas ------------------------------------------------------------------------------------------


class TreeWorkspace(BaseModel):
    id: uuid.UUID
    name: str
    kind: str
    status: str
    role: str
    documents: int


class TreeSite(BaseModel):
    id: uuid.UUID | None
    name: str
    workspaces: list[TreeWorkspace]


class TreeClient(BaseModel):
    id: uuid.UUID
    name: str
    sites: list[TreeSite]


class FolderNode(BaseModel):
    id: uuid.UUID
    parent_id: uuid.UUID | None
    name: str
    system_key: str | None
    client_visible: bool
    writable: bool
    documents: int
    children: list[FolderNode] = Field(default_factory=list)


class Crumb(BaseModel):
    id: uuid.UUID
    name: str


class VaultDocument(BaseModel):
    id: uuid.UUID
    title: str
    doc_type: str | None
    folder_id: uuid.UUID | None
    version: int | None
    filename: str | None
    size: int | None
    mime: str | None
    sha256: str | None
    encrypted: bool
    uploaded_by: str | None
    uploaded_at: datetime | None
    parse_status: ParseStatus | None


class FolderContent(BaseModel):
    folder: FolderNode
    path: list[Crumb]
    folders: list[FolderNode]
    documents: list[VaultDocument]


class FolderIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    parent_id: uuid.UUID


class FolderRename(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class MoveIn(BaseModel):
    folder_id: uuid.UUID


class VerifyOut(BaseModel):
    document_id: uuid.UUID
    version_id: uuid.UUID
    sha256: str
    ok: bool
    detail: str


class AccessEntry(BaseModel):
    at: datetime
    actor: str
    actor_name: str
    action: str
    detail: dict | None
    hash: str


# --- arbre client → site → prestation ---------------------------------------------------------------


@router.get("/vault/tree", response_model=list[TreeClient])
def vault_tree(principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)):
    """Prestations accessibles, rangées par client puis par site (« Sans site » en dernier)."""
    accesses = accessible_workspaces(db, principal.user.id)
    ws_ids = [a.workspace.id for a in accesses]
    counts = (
        dict(
            db.execute(
                select(Document.workspace_id, func.count(Document.id))
                .where(Document.workspace_id.in_(ws_ids))
                .group_by(Document.workspace_id)
            ).all()
        )
        if ws_ids
        else {}
    )
    grouped: dict[uuid.UUID, dict[uuid.UUID | None, list[TreeWorkspace]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for a in accesses:
        ws = a.workspace
        documents = counts.get(ws.id, 0)
        if folders.is_client(a.role):
            visible = folders.visible_document_ids(db, ws.id, a.role)
            documents = len(visible or ())
        grouped[ws.organization_id][ws.site_id].append(
            TreeWorkspace(
                id=ws.id,
                name=ws.name,
                kind=ws.kind.value,
                status=ws.status.value,
                role=a.role.value,
                documents=documents,
            )
        )
    out: list[TreeClient] = []
    for org_id, by_site in grouped.items():
        org = db.get(Organization, org_id)
        sites = []
        for site_id, workspaces in by_site.items():
            site = db.get(Site, site_id) if site_id else None
            sites.append(TreeSite(id=site_id, name=site.name if site else "Sans site", workspaces=workspaces))
        sites.sort(key=lambda s: (s.id is None, s.name.lower()))
        out.append(TreeClient(id=org_id, name=org.name if org else "?", sites=sites))
    out.sort(key=lambda c: c.name.lower())
    return out


# --- dossiers d'une prestation ------------------------------------------------------------------------


def _doc_counts(db: Session, ws: uuid.UUID, visible: set[uuid.UUID] | None) -> dict[uuid.UUID, int]:
    rows = db.execute(select(Document.id, Document.folder_id).where(Document.workspace_id == ws)).all()
    counts: dict[uuid.UUID, int] = defaultdict(int)
    for doc_id, folder_id in rows:
        if folder_id is not None and (visible is None or doc_id in visible):
            counts[folder_id] += 1
    return counts


def _node(db: Session, f: Folder, ctx: WorkspaceContext, counts: dict[uuid.UUID, int]) -> FolderNode:
    return FolderNode(
        id=f.id,
        parent_id=f.parent_id,
        name=f.name,
        system_key=f.system_key,
        client_visible=f.client_visible,
        writable=ctx.role in CONTRIBUTE_ROLES and folders.can_write(db, f, ctx.role),
        documents=counts.get(f.id, 0),
    )


_SYSTEM_ORDER = {spec.key: i for i, spec in enumerate(folders.SYSTEM_FOLDERS)}


def _sort_key(n: FolderNode):
    return (_SYSTEM_ORDER.get(n.system_key or "", 99), n.name.lower())


@router.get("/workspaces/{ws}/vault/folders", response_model=list[FolderNode])
def folder_tree(ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)):
    """Arborescence complète des dossiers de la prestation (les dossiers système sont créés au besoin)."""
    folders.ensure_system_folders(db, ctx.workspace_id, ctx.actor)
    db.commit()
    all_folders = list(db.scalars(select(Folder).where(Folder.workspace_id == ctx.workspace_id)))
    visible = folders.visible_document_ids(db, ctx.workspace_id, ctx.role)
    counts = _doc_counts(db, ctx.workspace_id, visible)
    nodes = {f.id: _node(db, f, ctx, counts) for f in all_folders if folders.can_see(db, f, ctx.role)}
    roots: list[FolderNode] = []
    for node in nodes.values():
        parent = nodes.get(node.parent_id) if node.parent_id else None
        (parent.children if parent else roots).append(node)
    for node in nodes.values():
        node.children.sort(key=_sort_key)
    roots.sort(key=_sort_key)
    return roots


def _visible_folder(db: Session, ctx: WorkspaceContext, folder_id: uuid.UUID) -> Folder:
    try:
        folder = folders.get_folder(db, ctx.workspace_id, folder_id)
    except LookupError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "dossier introuvable") from exc
    if not folders.can_see(db, folder, ctx.role):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "dossier introuvable")
    return folder


@router.get("/workspaces/{ws}/vault/folders/{folder_id}", response_model=FolderContent)
def folder_content(
    folder_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)
):
    folder = _visible_folder(db, ctx, folder_id)
    visible = folders.visible_document_ids(db, ctx.workspace_id, ctx.role)
    counts = _doc_counts(db, ctx.workspace_id, visible)
    children = [
        _node(db, f, ctx, counts)
        for f in db.scalars(select(Folder).where(Folder.parent_id == folder.id))
        if folders.can_see(db, f, ctx.role)
    ]
    children.sort(key=_sort_key)
    docs = list(
        db.scalars(
            select(Document)
            .where(Document.workspace_id == ctx.workspace_id, Document.folder_id == folder.id)
            .order_by(Document.created_at.desc())
        )
    )
    statuses = parsing.parse_statuses(db, docs)
    items = []
    for d in docs:
        version = db.get(DocumentVersion, d.current_version_id) if d.current_version_id else None
        blob = db.get(Blob, version.blob_id) if version else None
        items.append(
            VaultDocument(
                id=d.id,
                title=d.title,
                doc_type=d.doc_type,
                folder_id=d.folder_id,
                version=version.n if version else None,
                filename=version.filename if version else None,
                size=blob.size if blob else None,
                mime=blob.mime if blob else None,
                sha256=blob.sha256 if blob else None,
                encrypted=bool(blob and blob.encryption != "none"),
                uploaded_by=version.uploaded_by if version else None,
                uploaded_at=version.uploaded_at if version else None,
                parse_status=statuses.get(d.id),
            )
        )
    return FolderContent(
        folder=_node(db, folder, ctx, counts),
        path=[Crumb(id=f.id, name=f.name) for f in folders.path_of(db, folder)],
        folders=children,
        documents=items,
    )


def _folder_errors(fn):
    try:
        return fn()
    except LookupError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "dossier introuvable") from exc
    except folders.FolderForbidden as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(exc)) from exc
    except folders.FolderError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc


@router.post("/workspaces/{ws}/vault/folders", response_model=FolderNode, status_code=status.HTTP_201_CREATED)
def create_folder(
    body: FolderIn,
    ctx: WorkspaceContext = Depends(require_roles(CONTRIBUTE_ROLES)),
    db: Session = Depends(get_db),
):
    _visible_folder(db, ctx, body.parent_id)
    folder = _folder_errors(
        lambda: folders.create_folder(db, ctx.workspace_id, body.parent_id, body.name, ctx.role, ctx.actor)
    )
    db.commit()
    return _node(db, folder, ctx, {})


@router.patch("/workspaces/{ws}/vault/folders/{folder_id}", response_model=FolderNode)
def rename_folder(
    folder_id: uuid.UUID,
    body: FolderRename,
    ctx: WorkspaceContext = Depends(require_roles(CONTRIBUTE_ROLES)),
    db: Session = Depends(get_db),
):
    _visible_folder(db, ctx, folder_id)
    folder = _folder_errors(
        lambda: folders.rename_folder(db, ctx.workspace_id, folder_id, body.name, ctx.role, ctx.actor)
    )
    db.commit()
    return _node(db, folder, ctx, {})


@router.delete("/workspaces/{ws}/vault/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_roles(CONTRIBUTE_ROLES)),
    db: Session = Depends(get_db),
):
    _visible_folder(db, ctx, folder_id)
    _folder_errors(lambda: folders.delete_folder(db, ctx.workspace_id, folder_id, ctx.role, ctx.actor))
    db.commit()


# --- documents ----------------------------------------------------------------------------------------


def _visible_document(db: Session, ctx: WorkspaceContext, document_id: uuid.UUID) -> Document:
    try:
        doc = service.get_document(db, ctx.workspace_id, document_id)
    except service.NotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "document introuvable") from exc
    if not folders.document_visible(db, doc, ctx.role):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "document introuvable")
    return doc


@router.post("/workspaces/{ws}/vault/documents/{document_id}/move", response_model=dict)
def move_document(
    document_id: uuid.UUID,
    body: MoveIn,
    ctx: WorkspaceContext = Depends(require_roles(CONTRIBUTE_ROLES)),
    db: Session = Depends(get_db),
):
    doc = _visible_document(db, ctx, document_id)
    _visible_folder(db, ctx, body.folder_id)
    _folder_errors(
        lambda: folders.move_document(db, ctx.workspace_id, doc, body.folder_id, ctx.role, ctx.actor)
    )
    db.commit()
    return {"document_id": str(doc.id), "folder_id": str(doc.folder_id)}


def _team_only(ctx: WorkspaceContext) -> None:
    if folders.is_client(ctx.role):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "réservé à l'équipe GSMS")


@router.post("/workspaces/{ws}/vault/documents/{document_id}/verify", response_model=list[VerifyOut])
def verify_document(
    document_id: uuid.UUID,
    request: Request,
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
):
    """Relit et déchiffre chaque version : authentification des blocs + empreinte SHA-256."""
    _team_only(ctx)
    doc = _visible_document(db, ctx, document_id)
    out = []
    for version, blob in service.list_versions(db, doc):
        ok, detail = request.app.state.vault.verify(db, blob)
        out.append(
            VerifyOut(document_id=doc.id, version_id=version.id, sha256=blob.sha256, ok=ok, detail=detail)
        )
    record(
        db,
        actor=ctx.actor,
        action="vault.document.verify",
        subject_uri=core_uri("document", doc.id),
        workspace_id=ctx.workspace_id,
        after={"ok": all(v.ok for v in out), "versions": len(out)},
    )
    db.commit()
    return out


@router.get("/workspaces/{ws}/vault/documents/{document_id}/access-log", response_model=list[AccessEntry])
def access_log(
    document_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)
):
    """Qui a déposé, ouvert, téléchargé, déplacé ou vérifié la pièce (journal d'audit chaîné)."""
    _team_only(ctx)
    doc = _visible_document(db, ctx, document_id)
    rows = db.scalars(
        select(AuditLog)
        .where(
            AuditLog.subject_uri == core_uri("document", doc.id),
            AuditLog.workspace_id == str(ctx.workspace_id),
        )
        .order_by(AuditLog.id.desc())
        .limit(200)
    )
    entries = list(rows)
    names: dict[str, str] = {}
    for actor in {r.actor for r in entries}:
        kind, _, ident = actor.partition(":")
        user = None
        if kind == "user":
            try:
                user = db.get(User, uuid.UUID(ident))
            except ValueError:
                user = None
        names[actor] = (
            f"{user.name} ({user.email})" if user else ("GSMS Core" if kind == "service" else actor)
        )
    return [
        AccessEntry(
            at=r.at, actor=r.actor, actor_name=names[r.actor], action=r.action, detail=r.after, hash=r.hash
        )
        for r in entries
    ]
