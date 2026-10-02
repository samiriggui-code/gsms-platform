"""Dépôt de pièces : hachage sha256 en flux, déduplication des blobs, versionnement (§15).
Toutes les lectures filtrent par ``workspace_id`` dans le repository, pas dans la route."""

from __future__ import annotations

import hashlib
import mimetypes
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.documents.dossier import DEFAULT_TEMPLATES, Completeness, compute_completeness
from gsms_core.documents.models import Blob, Document, DocumentStatus, DocumentVersion, DossierTemplate
from gsms_core.documents.storage import Storage, object_key_for
from gsms_core.events.bus import publish
from gsms_core.events.envelope import EventEnvelope
from gsms_core.missions.models import Mission
from gsms_core.missions.uri import core_uri

CHUNK_SIZE = 1024 * 1024


class NotFound(LookupError):
    pass


class UploadTooLarge(ValueError):
    pass


@dataclass(frozen=True)
class HashedFile:
    path: Path
    sha256: str
    size: int


def hash_to_tempfile(stream: BinaryIO, max_bytes: int, spool_dir: Path | None = None) -> HashedFile:
    """Copie le flux par blocs dans un fichier temporaire en calculant le sha256 au passage."""
    digest = hashlib.sha256()
    size = 0
    fd = tempfile.NamedTemporaryFile(prefix="gsms-upload-", dir=spool_dir, delete=False)  # noqa: SIM115
    try:
        with fd:
            while chunk := stream.read(CHUNK_SIZE):
                size += len(chunk)
                if size > max_bytes:
                    raise UploadTooLarge(f"fichier > {max_bytes} octets")
                digest.update(chunk)
                fd.write(chunk)
    except BaseException:
        Path(fd.name).unlink(missing_ok=True)
        raise
    return HashedFile(Path(fd.name), digest.hexdigest(), size)


@dataclass(frozen=True)
class UploadResult:
    document: Document
    version: DocumentVersion
    blob: Blob
    blob_deduplicated: bool
    version_created: bool


def get_document(session: Session, workspace_id: uuid.UUID, document_id: uuid.UUID) -> Document:
    doc = session.scalar(
        select(Document).where(Document.id == document_id, Document.workspace_id == workspace_id)
    )
    if doc is None:
        raise NotFound("document")
    return doc


def get_version(session: Session, workspace_id: uuid.UUID, version_id: uuid.UUID) -> DocumentVersion:
    version = session.scalar(
        select(DocumentVersion)
        .join(Document, Document.id == DocumentVersion.document_id)
        .where(DocumentVersion.id == version_id, Document.workspace_id == workspace_id)
    )
    if version is None:
        raise NotFound("version")
    return version


def _mission_in_ws(session: Session, workspace_id: uuid.UUID, mission_id: uuid.UUID) -> Mission:
    m = session.scalar(select(Mission).where(Mission.id == mission_id, Mission.workspace_id == workspace_id))
    if m is None:
        raise NotFound("mission")
    return m


def upload_document(
    session: Session,
    storage: Storage,
    *,
    workspace_id: uuid.UUID,
    actor: str,
    stream: BinaryIO,
    filename: str,
    content_type: str | None,
    max_bytes: int,
    title: str | None = None,
    doc_type: str | None = None,
    mission_id: uuid.UUID | None = None,
    document_id: uuid.UUID | None = None,
    note: str | None = None,
) -> UploadResult:
    if mission_id is not None:
        _mission_in_ws(session, workspace_id, mission_id)
    existing_doc = get_document(session, workspace_id, document_id) if document_id else None

    hashed = hash_to_tempfile(stream, max_bytes)
    try:
        mime = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
        blob = session.scalar(select(Blob).where(Blob.sha256 == hashed.sha256))
        deduplicated = blob is not None
        if blob is None:
            key = object_key_for(hashed.sha256)
            if not storage.exists(key):
                storage.put_file(key, hashed.path, mime)
            blob = Blob(
                sha256=hashed.sha256, size=hashed.size, mime=mime, bucket=storage.bucket, object_key=key
            )
            session.add(blob)
            session.flush()
    finally:
        hashed.path.unlink(missing_ok=True)

    if existing_doc is not None:
        doc = existing_doc
        current = session.get(DocumentVersion, doc.current_version_id) if doc.current_version_id else None
        if current is not None and current.blob_id == blob.id:
            # Même contenu que la version courante : idempotent, pas de nouvelle version.
            return UploadResult(doc, current, blob, True, False)
    else:
        doc = Document(
            workspace_id=workspace_id,
            mission_id=mission_id,
            title=title or filename,
            doc_type=doc_type,
        )
        session.add(doc)
        session.flush()

    n = (
        session.scalar(select(func.max(DocumentVersion.n)).where(DocumentVersion.document_id == doc.id)) or 0
    ) + 1
    version = DocumentVersion(
        document_id=doc.id, n=n, blob_id=blob.id, filename=filename, uploaded_by=actor, note=note
    )
    session.add(version)
    session.flush()
    doc.current_version_id = version.id
    if doc_type and existing_doc is not None:
        doc.doc_type = doc_type

    uri = core_uri("document", doc.id)
    record(
        session,
        actor=actor,
        action="document.upload",
        subject_uri=uri,
        workspace_id=workspace_id,
        after={"version": n, "sha256": blob.sha256, "size": blob.size, "doc_type": doc.doc_type},
    )
    publish(
        session,
        EventEnvelope(
            type="document.uploaded",
            source="core",
            subject=uri,
            workspace_id=workspace_id,
            mission_id=doc.mission_id,
            actor=actor,
            data={
                "document_id": str(doc.id),
                "version_id": str(version.id),
                "n": n,
                "sha256": blob.sha256,
                "doc_type": doc.doc_type,
                "blob_deduplicated": deduplicated,
            },
        ),
    )
    return UploadResult(doc, version, blob, deduplicated, True)


def list_documents(
    session: Session,
    workspace_id: uuid.UUID,
    mission_id: uuid.UUID | None = None,
    doc_type: str | None = None,
) -> list[Document]:
    stmt = select(Document).where(Document.workspace_id == workspace_id)
    if mission_id:
        stmt = stmt.where(Document.mission_id == mission_id)
    if doc_type:
        stmt = stmt.where(Document.doc_type == doc_type)
    return list(session.scalars(stmt.order_by(Document.created_at.desc())))


def list_versions(session: Session, doc: Document) -> list[tuple[DocumentVersion, Blob]]:
    rows = session.execute(
        select(DocumentVersion, Blob)
        .join(Blob, Blob.id == DocumentVersion.blob_id)
        .where(DocumentVersion.document_id == doc.id)
        .order_by(DocumentVersion.n)
    )
    return [(v, b) for v, b in rows]


def dossier_for_mission(session: Session, workspace_id: uuid.UUID, mission_id: uuid.UUID) -> Completeness:
    mission = _mission_in_ws(session, workspace_id, mission_id)
    template = session.scalar(
        select(DossierTemplate)
        .where(DossierTemplate.mission_type == mission.type)
        .order_by(DossierTemplate.code)
    )
    if template is not None:
        code, required = template.code, template.required_doc_types
    else:
        code, required = DEFAULT_TEMPLATES.get(mission.type, (None, []))
    types = session.scalars(
        select(Document.doc_type).where(
            Document.workspace_id == workspace_id,
            Document.mission_id == mission.id,
            Document.status != DocumentStatus.ARCHIVED,
        )
    )
    return compute_completeness(code, required, types)
