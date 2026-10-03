from __future__ import annotations

import contextlib
import uuid

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
from sqlalchemy.orm import Session

from gsms_core.deps import WorkspaceContext, get_db, get_settings_dep, require_roles, require_workspace
from gsms_core.documents import parsing, service
from gsms_core.documents.models import Blob, DocumentParse, DocumentVersion
from gsms_core.documents.schemas import DocumentOut, DossierOut, ParseOut, UploadOut, VersionOut
from gsms_core.identity.models import CONTRIBUTE_ROLES
from gsms_core.settings import Settings

router = APIRouter(prefix="/api/v1/workspaces/{ws}", tags=["documents"])


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
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    doc_type: str | None = Form(default=None),
    mission_id: uuid.UUID | None = Form(default=None),
    document_id: uuid.UUID | None = Form(default=None),
    note: str | None = Form(default=None),
    ctx: WorkspaceContext = Depends(require_roles(CONTRIBUTE_ROLES)),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
):
    try:
        result = service.upload_document(
            db,
            request.app.state.storage,
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
        )
    except service.NotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{exc} introuvable") from exc
    except service.UploadTooLarge as exc:
        raise HTTPException(413, str(exc)) from exc
    db.commit()
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
    return service.list_documents(db, ctx.workspace_id, mission_id, doc_type)


@router.get("/documents/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)
):
    try:
        return service.get_document(db, ctx.workspace_id, document_id)
    except service.NotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "document introuvable") from exc


@router.get("/documents/{document_id}/versions", response_model=list[VersionOut])
def list_versions(
    document_id: uuid.UUID, ctx: WorkspaceContext = Depends(require_workspace), db: Session = Depends(get_db)
):
    try:
        doc = service.get_document(db, ctx.workspace_id, document_id)
    except service.NotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "document introuvable") from exc
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
    from gsms_core.digest.service import DigestBuildError, rebuild_digest

    with app.state.db.session_factory() as session:
        parse = parsing.run_parse(session, app.state.storage, app.state.document_parser, parse_id)
        if parse.status.value == "PARSED":
            # Un échec du Digest est déjà tracé (statut FAILED + digest.failed).
            with contextlib.suppress(DigestBuildError):
                rebuild_digest(session, parse.workspace_id, actor="service:core", trigger=f"parse:{parse.id}")


@router.post("/documents/{document_id}/parse", response_model=ParseOut, status_code=status.HTTP_202_ACCEPTED)
def parse_document(
    document_id: uuid.UUID,
    request: Request,
    background: BackgroundTasks,
    ctx: WorkspaceContext = Depends(require_roles(CONTRIBUTE_ROLES)),
    db: Session = Depends(get_db),
):
    """Demande le parsing (Docling) de la version courante ; le Digest est reconstruit ensuite."""
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
    try:
        return _parse_out(parsing.latest_parse(db, ctx.workspace_id, document_id))
    except service.NotFound as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "aucun parsing pour ce document") from exc
