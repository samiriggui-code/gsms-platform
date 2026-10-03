"""Unités textuelles traçables : chaque extracteur travaille sur des ``TextUnit`` et non sur du texte nu,
pour que toute donnée produite garde son ``SourceRef`` (bloc, ou cellule/ligne de tableau)."""

from __future__ import annotations

import hashlib
from collections.abc import Iterator
from dataclasses import dataclass

from gsms_core.documents.parsers.schemas import NormalizedDocument, SourceRef


@dataclass(frozen=True)
class TextUnit:
    text: str
    source: SourceRef
    doc: NormalizedDocument
    # Pour une ligne de tableau : cellules (texte, source) dans l'ordre des colonnes.
    cells: tuple[tuple[str, SourceRef], ...] = ()


def iter_units(doc: NormalizedDocument) -> Iterator[TextUnit]:
    """Blocs de texte, puis une unité par ligne de tableau (texte = cellules jointes par « | »)."""
    for block in doc.blocks:
        yield TextUnit(text=block.text, source=block.source, doc=doc)
    for table in doc.tables:
        for row in table.rows():
            if not row:
                continue
            texts = tuple((c.text, c.source) for c in row)
            joined = " | ".join(t for t, _ in texts if t)
            if not joined:
                continue
            first = row[0].source
            yield TextUnit(text=joined, source=first, doc=doc, cells=texts)


def stable_id(prefix: str, *parts: object) -> str:
    """Identifiant déterministe : un rebuild sur les mêmes pièces donne les mêmes ids."""
    raw = "|".join(str(p) for p in parts)
    return f"{prefix}_{hashlib.sha1(raw.encode('utf-8')).hexdigest()[:12]}"  # noqa: S324 - id, pas sécurité


def with_excerpt(source: SourceRef, text: str) -> SourceRef:
    return source.model_copy(update={"excerpt": text.strip()[:300]})
