from __future__ import annotations

import contextlib
import uuid
from urllib.parse import quote

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.deps import WorkspaceContext, get_db, get_settings_dep, require_roles, require_workspace
from gsms_core.documents import parsing, service
from gsms_core.documents.models import Blob, DocumentParse, DocumentVersion
from gsms_core.documents.parsers.schemas import NormalizedDocument
from gsms_core.documents.schemas import DocumentOut, DossierOut, ParseOut, UploadOut, VersionOut
from gsms_core.documents.search import MAX_LIMIT, SearchHit, search_documents
from gsms_core.identity.models import CONTRIBUTE_ROLES
from gsms_core.missions.uri import core_uri
from gsms_core.settings import Settings
from gsms_core.vault import folders as vault_folders

router = APIRouter(prefix="/api/v1/workspaces/{ws}", tags=["documents"])


def _visible_doc(db: Session, ctx: WorkspaceContext, document_id: uuid.UUID):
    """Document du workspace, visible pour ce rôle (un client ne voit pas « Travail GSMS ») ; sinon 404."""
    try:
        doc = service.get_document(db, ctx.workspace_id, document_id)
    except service.NotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "document introuvable") from exc
    if not vault_folders.document_visible(db, doc, ctx.role):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "document introuvable")
    return doc


def _version_out(v: DocumentVersion, b: Blob) -> VersionOut:
    return VersionOut(
        id=v.id,
        n=v.n,
        filename=v.filename,
        sha256=b.sha256,
        size=b.size,
        mime=b.mime,
        uploaded_by=v.uploaded_by,
        uploaded_at=v.uploaded_at,
    )


@router.post("/documents", response_model=UploadOut, status_code=status.HTTP_201_CREATED)
def upload(
    request: Request,
    background: BackgroundTasks,
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    doc_type: str | None = Form(default=None),
    mission_id: uuid.UUID | None = Form(default=None),
    document_id: uuid.UUID | None = Form(default=None),
    note: str | None = Form(default=None),
    folder_id: uuid.UUID | None = Form(default=None),
    analyze: bool = Form(default=False),
    ctx: WorkspaceContext = Depends(require_roles(CONTRIBUTE_ROLES)),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
):
    """Dépôt dans le coffre-fort (chiffré). ``folder_id`` : dossier cible (par défaut « Pièces client ») ;
    ``analyze`` : lance aussitôt l'analyse Docling puis le Digest."""
    if document_id is not None:
        existing = _visible_doc(db, ctx, document_id)
        target_folder_id = existing.folder_id
    else:
        try:
            target = vault_folders.resolve_upload_folder(db, ctx.workspace_id, folder_id, ctx.role, ctx.actor)
        except LookupError as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "dossier introuvable") from exc
        except vault_folders.FolderForbidden as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(exc)) from exc
        target_folder_id = target.id
    try:
        result = service.upload_document(
            db,
            request.app.state.vault,
            workspace_id=ctx.workspace_id,
            actor=ctx.actor,
            stream=file.file,
            filename=file.filename or "document",
            content_type=file.content_type,
            max_bytes=settings.max_upload_mb * 1024 * 1024,
            title=title,
            doc_type=doc_type,
            mission_id=mission_id,
            document_id=document_id,
            note=note,
            folder_id=target_folder_id,
        )
    except service.NotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{exc} introuvable") from exc
    except service.UploadTooLarge as exc:
        raise HTTPException(413, str(exc)) from exc
    parse = None
    if analyze and result.version_created:
        parse = parsing.request_parse(
            db, ctx.workspace_id, result.document.id, request.app.state.document_parser, ctx.actor
        )
    db.commit()
    if parse is not None:
        background.add_task(run_parse_and_digest, request.app, parse.id)
    return UploadOut(
        document=DocumentOut.model_validate(result.document),
        version=_version_out(result.version, result.blob),
        blob_deduplicated=result.blob_deduplicated,
        version_created=result.version_created,
    )


@router.get("/documents", response_model=list[DocumentOut])
def list_documents(
    mission_id: uuid.UUID | None = Query(default=None),
    doc_type: str | None = Query(default=None),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
):
    docs = service.list_documents(db, ctx.workspace_id, mission_id, doc_type)
    visible = vault_folders.visible_document_ids(db, ctx.workspace_id, ctx.role)
    if visible is not None:
        docs = [d for d in docs if d.id in visible]
    statuses = parsing.parse_statuses(db, docs)
    return [
        DocumentOut.model_validate(d).model_copy(update={"parse_status": statuses.get(d.id)}) for d in docs
    ]


@router.get("/documents/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)
):
    return _visible_doc(db, ctx, document_id)


@router.get("/documents/{document_id}/versions", response_model=list[VersionOut])
def list_versions(
    document_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)
):
    doc = _visible_doc(db, ctx, document_id)
    return [_version_out(v, b) for v, b in service.list_versions(db, doc)]


@router.get("/missions/{mission_id}/dossier", response_model=DossierOut)
def dossier(
    mission_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)
):
    try:
        c = service.dossier_for_mission(db, ctx.workspace_id, mission_id)
    except service.NotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "mission introuvable") from exc
    return DossierOut(
        mission_id=mission_id,
        template_code=c.template_code,
        completeness=c.ratio,
        required=c.required,
        present=c.present,
        missing=c.missing,
    )


def _parse_out(parse: DocumentParse) -> ParseOut:
    out = ParseOut.model_validate(parse)
    if parse.result:
        out.summary = {
            "page_count": parse.result.get("page_count"),
            "blocks": len(parse.result.get("blocks") or []),
            "tables": len(parse.result.get("tables") or []),
        }
    return out


def run_parse_and_digest(app, parse_id: uuid.UUID) -> None:
    """Hors requête : parsing puis reconstruction du Digest du workspace (session dédiée).

    Chemin minimal (BackgroundTasks FastAPI) tant que le Core n'a pas de worker ; le même appel sera
    exécuté par le worker (file sur l'outbox / Celery) sans changer ce contrat.
    """
    from gsms_core.digest.schemas import WorkspaceDigest
    from gsms_core.digest.service import DigestBuildError, rebuild_digest

    with app.state.db.session_factory() as session:
        parse = parsing.run_parse(session, app.state.vault, app.state.document_parser, parse_id)
        if parse.status.value == "PARSED":
            # Un échec du Digest est déjà tracé (statut FAILED + digest.failed).
            with contextlib.suppress(DigestBuildError):
                built = rebuild_digest(
                    session, parse.workspace_id, actor="service:core", trigger=f"parse:{parse.id}"
                )
                digest = WorkspaceDigest.model_validate(built.payload)
                # Coffre-fort : la pièce reconnue rejoint le sous-dossier de son type (CCTP, RC, BPU…).
                vault_folders.file_by_type(
                    session,
                    parse.workspace_id,
                    {
                        d.document_id: d.business_type
                        for d in digest.documents
                        if d.document_id == parse.document_id
                    },
                )
                session.commit()


@router.post("/documents/{document_id}/parse", response_model=ParseOut, status_code=status.HTTP_202_ACCEPTED)
def parse_document(
    document_id: uuid.UUID,
    request: Request,
    background: BackgroundTasks,
    ctx: WorkspaceContext = Depends(require_roles(CONTRIBUTE_ROLES)),
    db: Session = Depends(get_db),
):
    """Demande le parsing (Docling) de la version courante ; le Digest est reconstruit ensuite."""
    _visible_doc(db, ctx, document_id)
    try:
        parse = parsing.request_parse(
            db, ctx.workspace_id, document_id, request.app.state.document_parser, ctx.actor
        )
    except service.NotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "document introuvable") from exc
    db.commit()
    background.add_task(run_parse_and_digest, request.app, parse.id)
    return _parse_out(parse)


@router.get("/documents/{document_id}/parse", response_model=ParseOut)
def get_parse(
    document_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)
):
    _visible_doc(db, ctx, document_id)
    try:
        return _parse_out(parsing.latest_parse(db, ctx.workspace_id, document_id))
    except service.NotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "aucun parsing pour ce document") from exc


@router.get("/documents/{document_id}/content")
def document_content(
    document_id: uuid.UUID,
    request: Request,
    version_id: uuid.UUID | None = Query(default=None),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
):
    """Fichier d'origine déchiffré (version courante, ou ``version_id``). Chaque accès est journalisé."""
    doc = _visible_doc(db, ctx, document_id)
    try:
        vid = version_id or doc.current_version_id
        if vid is None:
            raise service.NotFound("version")
        version = service.get_version(db, ctx.workspace_id, vid)
        if version.document_id != doc.id:
            raise service.NotFound("version")
    except service.NotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{exc} introuvable") from exc
    blob = db.get(Blob, version.blob_id)
    chunks = request.app.state.vault.iter_plaintext(db, blob)
    record(
        db,
        actor=ctx.actor,
        action="document.download",
        subject_uri=core_uri("document", doc.id),
        workspace_id=ctx.workspace_id,
        after={"version": version.n, "version_id": str(version.id), "sha256": blob.sha256},
    )
    db.commit()

    ascii_name = "".join(
        c for c in version.filename.encode("ascii", "ignore").decode() if c.isprintable() and c != '"'
    )
    disposition = (
        f"inline; filename=\"{ascii_name or 'document'}\"; filename*=UTF-8''{quote(version.filename)}"
    )
    return StreamingResponse(
        chunks,
        media_type=blob.mime or "application/octet-stream",
        headers={"Content-Disposition": disposition, "X-Content-Type-Options": "nosniff"},
    )


@router.get("/documents/{document_id}/normalized", response_model=NormalizedDocument)
def normalized_document(
    document_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)
):
    """Contenu structuré (blocs, tableaux, ``SourceRef``) du dernier parsing réussi de la version courante."""
    doc = _visible_doc(db, ctx, document_id)
    normalized = parsing.current_normalized(db, doc)
    if normalized is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "document pas encore parsé")
    return normalized


@router.get("/search", response_model=list[SearchHit])
def search(
    q: str = Query(min_length=1, max_length=200),
    limit: int = Query(default=20, ge=1, le=MAX_LIMIT),
    mission_id: uuid.UUID | None = Query(default=None),
    ctx: WorkspaceContext = Depends(require_workspace),
    db: Session = Depends(get_db),
):
    """Recherche plein texte dans les documents parsés du workspace ; chaque résultat garde sa provenance."""
    hits = search_documents(db, ctx.workspace_id, q, limit=MAX_LIMIT, mission_id=mission_id)
    visible = vault_folders.visible_document_ids(db, ctx.workspace_id, ctx.role)
    if visible is not None:
        hits = [h for h in hits if h.document_id in visible]
    return hits[:limit]
