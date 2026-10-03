"""Recherche plein texte dans les documents parsés d'un workspace, avec provenance.

Recherche lexicale déterministe (minuscules, sans accents, tous les termes requis) sur les blocs et les
lignes de tableau des ``NormalizedDocument``. Chaque résultat porte son ``SourceRef`` (page, section,
feuille, cellule…) : DocuLens l'utilise pour la navigation et la provenance. La recherche sémantique
(chunks + embeddings) viendra ensuite derrière la même route (voir ``docs/HANDOFF-CURSOR.md``).
"""

from __future__ import annotations

import re
import unicodedata
import uuid
from collections.abc import Iterator

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.documents.models import Document
from gsms_core.documents.parsers.schemas import NormalizedDocument, SourceRef
from gsms_core.documents.parsing import current_normalized

MAX_LIMIT = 100


class SearchHit(BaseModel):
    document_id: uuid.UUID
    filename: str
    text: str
    score: float
    source: SourceRef


def fold(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def terms(query: str) -> list[str]:
    return [t for t in re.split(r"\W+", fold(query)) if t]


def _units(doc: NormalizedDocument) -> Iterator[tuple[str, SourceRef]]:
    """Blocs, puis une unité par ligne de tableau (source = première cellule de la ligne)."""
    for block in doc.blocks:
        yield block.text, block.source
    for table in doc.tables:
        for row in table.rows():
            text = " | ".join(c.text for c in row if c.text)
            if text:
                yield text, row[0].source


def search_documents(
    session: Session,
    workspace_id: uuid.UUID,
    query: str,
    *,
    limit: int = 20,
    mission_id: uuid.UUID | None = None,
) -> list[SearchHit]:
    wanted = terms(query)
    if not wanted:
        return []
    stmt = select(Document).where(Document.workspace_id == workspace_id)
    if mission_id is not None:
        stmt = stmt.where(Document.mission_id == mission_id)
    hits: list[SearchHit] = []
    for doc in session.scalars(stmt.order_by(Document.created_at)):
        normalized = current_normalized(session, doc)
        if normalized is None:
            continue
        for text, source in _units(normalized):
            folded = fold(text)
            if not all(t in folded for t in wanted):
                continue
            occurrences = sum(folded.count(t) for t in wanted)
            score = round(occurrences / (1 + len(folded) / 200), 4)
            hits.append(
                SearchHit(
                    document_id=doc.id,
                    filename=normalized.filename,
                    text=text[:500],
                    score=score,
                    source=source,
                )
            )
    hits.sort(key=lambda h: -h.score)  # tri stable : à score égal, ordre du document
    return hits[: max(1, min(limit, MAX_LIMIT))]
