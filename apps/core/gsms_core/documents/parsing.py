"""Pipeline de parsing : version figée d'un document → ``DocumentParser`` (Docling) → ``NormalizedDocument``.

Cycle : ``request_parse`` (PENDING, dans la requête HTTP) puis ``run_parse`` (hors requête : tâche de
fond aujourd'hui, worker demain) → PARSED ou FAILED. Chaque transition publie un événement sur
l'EventBus existant (``document.parsing.started`` / ``document.parsed`` / ``document.parsing.failed``).
"""

from __future__ import annotations

import logging
import shutil
import tempfile
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.db import utcnow
from gsms_core.documents.models import Blob, Document, DocumentParse, DocumentVersion, ParseStatus
from gsms_core.documents.parsers.base import DocumentParser, ParseError, ParseRequest
from gsms_core.documents.parsers.schemas import NormalizedDocument
from gsms_core.documents.service import NotFound, get_document
from gsms_core.documents.storage import Storage
from gsms_core.events.bus import publish
from gsms_core.events.envelope import EventEnvelope
from gsms_core.missions.uri import core_uri

log = logging.getLogger(__name__)


def _event(parse: DocumentParse, type_: str, actor: str, data: dict) -> EventEnvelope:
    return EventEnvelope(
        type=type_,
        source="core",
        subject=core_uri("document", parse.document_id),
        workspace_id=parse.workspace_id,
        mission_id=parse.mission_id,
        actor=actor,
        data={
            "document_id": str(parse.document_id),
            "version_id": str(parse.version_id),
            "parse_id": str(parse.id),
            "parser": parse.parser,
            **data,
        },
    )


def request_parse(
    session: Session,
    workspace_id: uuid.UUID,
    document_id: uuid.UUID,
    parser: DocumentParser,
    actor: str,
) -> DocumentParse:
    """Crée une demande de parsing pour la version courante (scopée au workspace)."""
    doc = get_document(session, workspace_id, document_id)
    if doc.current_version_id is None:
        raise NotFound("version")
    parse = DocumentParse(
        workspace_id=workspace_id,
        document_id=doc.id,
        version_id=doc.current_version_id,
        mission_id=doc.mission_id,
        status=ParseStatus.PENDING,
        parser=parser.name,
        requested_by=actor,
    )
    session.add(parse)
    session.flush()
    return parse


def run_parse(
    session: Session, storage: Storage, parser: DocumentParser, parse_id: uuid.UUID
) -> DocumentParse:
    """Exécute un parsing PENDING ; ne lève pas : l'échec est un statut + un événement."""
    parse = session.get(DocumentParse, parse_id)
    if parse is None:
        raise NotFound("parse")
    actor = "service:core"
    parse.status = ParseStatus.RUNNING
    parse.started_at = utcnow()
    publish(session, _event(parse, "document.parsing.started", actor, {}))
    session.commit()

    tmp_dir = Path(tempfile.mkdtemp(prefix="gsms-parse-"))
    try:
        version = session.get(DocumentVersion, parse.version_id)
        blob = session.get(Blob, version.blob_id) if version else None
        doc = session.get(Document, parse.document_id)
        if version is None or blob is None or doc is None or doc.workspace_id != parse.workspace_id:
            raise ParseError("document_not_found", "version ou fichier introuvable pour ce workspace")
        local = tmp_dir / (Path(version.filename).name or "document")
        with storage.open(blob.object_key) as src, local.open("wb") as dst:
            shutil.copyfileobj(src, dst)
        normalized = parser.parse(
            ParseRequest(
                path=local,
                document_id=doc.id,
                workspace_id=parse.workspace_id,
                filename=version.filename,
                version_id=version.id,
                mission_id=parse.mission_id,
                mime=blob.mime,
            )
        )
        if normalized.workspace_id != parse.workspace_id or normalized.document_id != parse.document_id:
            raise ParseError("context_mismatch", "le parseur a renvoyé un autre document ou workspace")
        parse.result = normalized.model_dump(mode="json")
        parse.parser_version = normalized.parser_version
        parse.status = ParseStatus.PARSED
        parse.finished_at = utcnow()
        publish(
            session,
            _event(
                parse,
                "document.parsed",
                actor,
                {
                    "n_blocks": len(normalized.blocks),
                    "n_tables": len(normalized.tables),
                    "page_count": normalized.page_count,
                },
            ),
        )
    except Exception as exc:
        code = exc.code if isinstance(exc, ParseError) else "internal_error"
        message = exc.message if isinstance(exc, ParseError) else str(exc)
        if not isinstance(exc, ParseError):
            log.exception("échec inattendu du parsing %s", parse_id)
        parse.status = ParseStatus.FAILED
        parse.finished_at = utcnow()
        parse.error_code = code
        parse.error_message = message[:1000]
        publish(
            session,
            _event(parse, "document.parsing.failed", actor, {"error_code": code, "error": message[:500]}),
        )
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
    session.commit()
    return parse


def latest_parse(session: Session, workspace_id: uuid.UUID, document_id: uuid.UUID) -> DocumentParse:
    parse = session.scalar(
        select(DocumentParse)
        .where(DocumentParse.workspace_id == workspace_id, DocumentParse.document_id == document_id)
        .order_by(DocumentParse.created_at.desc())
        .limit(1)
    )
    if parse is None:
        raise NotFound("parse")
    return parse


def parsed_documents(
    session: Session, workspace_id: uuid.UUID, mission_id: uuid.UUID | None = None
) -> list[NormalizedDocument]:
    """Dernier parsing réussi de la version courante de chaque document du workspace."""
    stmt = select(Document).where(Document.workspace_id == workspace_id)
    if mission_id is not None:
        stmt = stmt.where(Document.mission_id == mission_id)
    out: list[NormalizedDocument] = []
    for doc in session.scalars(stmt):
        normalized = current_normalized(session, doc)
        if normalized is not None:
            out.append(normalized)
    return out


def current_normalized(session: Session, doc: Document) -> NormalizedDocument | None:
    """``NormalizedDocument`` du dernier parsing réussi de la version courante, ou ``None``."""
    if doc.current_version_id is None:
        return None
    parse = session.scalar(
        select(DocumentParse)
        .where(
            DocumentParse.workspace_id == doc.workspace_id,
            DocumentParse.document_id == doc.id,
            DocumentParse.version_id == doc.current_version_id,
            DocumentParse.status == ParseStatus.PARSED,
        )
        .order_by(DocumentParse.created_at.desc())
        .limit(1)
    )
    if parse is None or not parse.result:
        return None
    normalized = NormalizedDocument.model_validate(parse.result)
    return normalized if normalized.workspace_id == doc.workspace_id else None


def parse_statuses(session: Session, docs: list[Document]) -> dict[uuid.UUID, ParseStatus]:
    """Statut du dernier parsing de la version courante, pour chaque document (une seule requête)."""
    current = {d.id: d.current_version_id for d in docs if d.current_version_id is not None}
    if not current:
        return {}
    rows = session.scalars(
        select(DocumentParse)
        .where(DocumentParse.document_id.in_(current.keys()))
        .order_by(DocumentParse.created_at.desc())
    )
    out: dict[uuid.UUID, ParseStatus] = {}
    for parse in rows:
        if parse.document_id not in out and parse.version_id == current[parse.document_id]:
            out[parse.document_id] = parse.status
    return out
