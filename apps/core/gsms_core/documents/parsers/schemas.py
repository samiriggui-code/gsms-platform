"""Contrat de sortie des parseurs : ``NormalizedDocument``.

C'est la seule forme que le reste du Core (Digest, contexte, API) connaît d'un document parsé.
Aucun type Docling ne sort de ``docling_adapter.py`` : si le moteur change, ce contrat reste stable.

Règle de provenance : chaque bloc et chaque cellule porte un ``SourceRef`` qui permet de remonter
au fichier, à la page (PDF/DOCX/PPTX) ou à la feuille + cellule (XLSX), à la section et au bloc.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from gsms_core.db import utcnow


class SourceRef(BaseModel):
    """Localisation d'une information dans un document du workspace."""

    model_config = ConfigDict(frozen=True)

    document_id: uuid.UUID
    version_id: uuid.UUID | None = None
    filename: str
    page: int | None = None
    sheet: str | None = None
    section: str | None = None
    table: str | None = None
    cell: str | None = None  # référence A1 pour un tableur (« B4 »), sinon « r3c2 »
    block_id: str | None = None
    excerpt: str | None = Field(default=None, max_length=500)


class BlockKind(enum.StrEnum):
    TITLE = "title"
    HEADING = "heading"
    PARAGRAPH = "paragraph"
    LIST_ITEM = "list_item"
    CAPTION = "caption"
    FOOTNOTE = "footnote"
    OTHER = "other"


class Block(BaseModel):
    id: str
    kind: BlockKind
    text: str
    level: int | None = None
    source: SourceRef


class TableCell(BaseModel):
    row: int
    col: int
    text: str
    is_header: bool = False
    source: SourceRef


class Table(BaseModel):
    id: str
    page: int | None = None
    sheet: str | None = None
    caption: str | None = None
    n_rows: int
    n_cols: int
    cells: list[TableCell]

    def rows(self) -> list[list[TableCell]]:
        grid: list[list[TableCell]] = [[] for _ in range(self.n_rows)]
        for cell in sorted(self.cells, key=lambda c: (c.row, c.col)):
            if 0 <= cell.row < self.n_rows:
                grid[cell.row].append(cell)
        return grid


class NormalizedDocument(BaseModel):
    """Sortie unique d'un parseur, rattachée au workspace Core canonique."""

    document_id: uuid.UUID
    version_id: uuid.UUID | None = None
    workspace_id: uuid.UUID
    mission_id: uuid.UUID | None = None
    filename: str
    mime: str | None = None
    parser: str
    parser_version: str | None = None
    parsed_at: datetime = Field(default_factory=utcnow)
    page_count: int | None = None
    blocks: list[Block] = Field(default_factory=list)
    tables: list[Table] = Field(default_factory=list)

    @property
    def text(self) -> str:
        return "\n".join(b.text for b in self.blocks if b.text)

    def source(self, **fields: object) -> SourceRef:
        """Raccourci : ``SourceRef`` de ce document complété par ``fields``."""
        return SourceRef(
            document_id=self.document_id,
            version_id=self.version_id,
            filename=self.filename,
            **fields,  # type: ignore[arg-type]
        )
