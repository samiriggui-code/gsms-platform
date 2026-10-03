"""Faits lus par les règles de relance : pièces manquantes, échéances, conflits (Digest), dépôts client."""

from __future__ import annotations

from datetime import UTC, date, datetime, time

from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.digest.completeness import _LABELS as PIECE_LABELS
from gsms_core.digest.schemas import Conflict, Deadline, WorkspaceDigest
from gsms_core.digest.service import latest_digest, load_digest
from gsms_core.documents.models import Document, DocumentVersion
from gsms_core.identity.models import Membership, Role, Workspace


def digest(session: Session, ws: Workspace) -> WorkspaceDigest | None:
    record = latest_digest(session, ws.id)
    return load_digest(record) if record else None


def missing_pieces(session: Session, ws: Workspace) -> list[str]:
    d = digest(session, ws)
    if d is None:
        return []
    return [
        " ou ".join(PIECE_LABELS.get(k, k) for k in m.key.split("|"))
        for m in d.missing_information
        if m.code == "MISSING_DOCUMENT"
    ]


def tender_deadlines(session: Session, ws: Workspace) -> list[Deadline]:
    d = digest(session, ws)
    return [x for x in (d.deadlines if d else []) if x.kind == "remise_offres" and x.due_date]


def conflicts(session: Session, ws: Workspace) -> list[Conflict]:
    d = digest(session, ws)
    return list(d.conflicts) if d else []


def client_deposits(session: Session, ws: Workspace, day: date) -> list[str]:
    """Pièces déposées ce jour-là par un compte client de la prestation (titre du document)."""
    client_ids = {
        f"user:{uid}"
        for uid in session.scalars(
            select(Membership.user_id).where(
                Membership.organization_id == ws.organization_id,
                Membership.role.in_([Role.CLIENT_ADMIN, Role.CLIENT_MEMBER]),
            )
        )
    }
    if not client_ids:
        return []
    start = datetime.combine(day, time.min, tzinfo=UTC)
    end = datetime.combine(day, time.max, tzinfo=UTC)
    rows = session.execute(
        select(Document.title, DocumentVersion.n)
        .join(DocumentVersion, DocumentVersion.document_id == Document.id)
        .where(
            Document.workspace_id == ws.id,
            DocumentVersion.uploaded_by.in_(client_ids),
            DocumentVersion.uploaded_at >= start,
            DocumentVersion.uploaded_at <= end,
        )
        .order_by(DocumentVersion.uploaded_at)
    ).all()
    return [title if n == 1 else f"{title} (version {n})" for title, n in rows]
