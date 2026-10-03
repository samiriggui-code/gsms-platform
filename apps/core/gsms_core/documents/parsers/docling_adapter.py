"""Adapter Docling → ``NormalizedDocument``.

Seul fichier du Core qui connaît l'API Docling (https://github.com/docling-project/docling, MIT).
Docling est un *moteur technique* (PDF, OCR, DOCX, XLSX, PPTX, images, tableaux, mise en page) ;
l'intelligence métier vit dans ``gsms_core.digest``.

- Import paresseux : le Core démarre et ses tests tournent sans Docling installé (extra ``docling``).
- Convertisseur injectable (``converter_factory``) : les tests fournissent un faux convertisseur
  au même format que Docling, sans télécharger de modèles.
- Correspondance Docling utilisée (docling ≥ 2) : ``DocumentConverter().convert(path).document``
  (DoclingDocument) ; ``iterate_items(with_groups=True)`` → (item, niveau) ; ``item.label``,
  ``item.text``, ``item.prov[i].page_no`` / ``.bbox`` ; ``TableItem.data.table_cells`` avec
  ``start_row_offset_idx`` / ``start_col_offset_idx`` / ``column_header``. Pour un classeur Excel,
  Docling émet un groupe par feuille (label ``sheet``, nom = nom de la feuille ; ``sheet: <nom>``
  dans les versions plus anciennes) et place l'ancre du tableau (colonne, ligne) dans
  ``prov.bbox`` (l, t) : on en déduit la cellule A1 exacte. Vérifié sur docling 2.132.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from pathlib import Path
from typing import Any

from gsms_core.documents.parsers.base import ParseError, ParseRequest
from gsms_core.documents.parsers.schemas import (
    Block,
    BlockKind,
    NormalizedDocument,
    SourceRef,
    Table,
    TableCell,
)

log = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = frozenset(
    {
        ".pdf",
        ".docx",
        ".xlsx",
        ".xlsm",
        ".pptx",
        ".html",
        ".htm",
        ".md",
        ".csv",
        ".png",
        ".jpg",
        ".jpeg",
        ".tif",
        ".tiff",
        ".bmp",
        ".webp",
    }
)
SPREADSHEET_EXTENSIONS = frozenset({".xlsx", ".xlsm", ".csv"})

_LABEL_TO_KIND = {
    "title": BlockKind.TITLE,
    "section_header": BlockKind.HEADING,
    "text": BlockKind.PARAGRAPH,
    "paragraph": BlockKind.PARAGRAPH,
    "list_item": BlockKind.LIST_ITEM,
    "caption": BlockKind.CAPTION,
    "footnote": BlockKind.FOOTNOTE,
}
_SKIPPED_LABELS = frozenset({"page_header", "page_footer", "picture", "chart"})

ConverterFactory = Callable[[], Any]


def column_letter(index: int) -> str:
    """0 → A, 25 → Z, 26 → AA."""
    letters = ""
    n = index + 1
    while n:
        n, rem = divmod(n - 1, 26)
        letters = chr(65 + rem) + letters
    return letters


def a1(row: int, col: int) -> str:
    """Indices 0-based → référence A1."""
    return f"{column_letter(col)}{row + 1}"


def _default_converter_factory() -> Any:
    try:
        from docling.document_converter import DocumentConverter
    except ImportError as exc:
        raise ParseError(
            "docling_unavailable",
            "Docling n'est pas installé dans ce Core (pip install 'gsms-core[docling]').",
        ) from exc
    return DocumentConverter()


def _label(item: Any) -> str:
    label = getattr(item, "label", "")
    return str(getattr(label, "value", label)).lower()


def _first_prov(item: Any) -> Any | None:
    prov = getattr(item, "prov", None) or []
    return prov[0] if prov else None


class DoclingAdapter:
    """Implémente ``DocumentParser`` au-dessus de Docling."""

    name = "docling"

    def __init__(self, converter_factory: ConverterFactory | None = None) -> None:
        self._converter_factory = converter_factory or _default_converter_factory
        self._converter: Any | None = None

    @property
    def version(self) -> str | None:
        try:
            from importlib.metadata import version

            return version("docling")
        except Exception:  # pragma: no cover - dépend de l'installation
            return None

    def supports(self, filename: str, mime: str | None = None) -> bool:
        return Path(filename).suffix.lower() in SUPPORTED_EXTENSIONS

    def _get_converter(self) -> Any:
        if self._converter is None:
            self._converter = self._converter_factory()
        return self._converter

    def parse(self, request: ParseRequest) -> NormalizedDocument:
        if not self.supports(request.filename, request.mime):
            raise ParseError("unsupported_format", f"format non pris en charge : {request.filename}")
        try:
            result = self._get_converter().convert(str(request.path))
        except ParseError:
            raise
        except Exception as exc:
            log.warning("échec Docling pour %s : %s", request.filename, exc)
            raise ParseError("docling_conversion_failed", f"conversion impossible : {exc}") from exc

        status = str(getattr(getattr(result, "status", None), "value", getattr(result, "status", "success")))
        doc = getattr(result, "document", None)
        if doc is None or status.lower() in {"failure", "failed"}:
            raise ParseError("docling_conversion_failed", f"Docling a renvoyé le statut « {status} »")
        return self._normalize(doc, request)

    # --- traduction DoclingDocument → NormalizedDocument -------------------------------------------

    def _normalize(self, doc: Any, req: ParseRequest) -> NormalizedDocument:
        is_sheet = Path(req.filename).suffix.lower() in SPREADSHEET_EXTENSIONS
        out = NormalizedDocument(
            document_id=req.document_id,
            version_id=req.version_id,
            workspace_id=req.workspace_id,
            mission_id=req.mission_id,
            filename=req.filename,
            mime=req.mime,
            parser=self.name,
            parser_version=self.version,
            page_count=self._page_count(doc),
        )

        def src(**fields: Any) -> SourceRef:
            return SourceRef(
                document_id=req.document_id, version_id=req.version_id, filename=req.filename, **fields
            )

        section: str | None = None
        sheet: str | None = None
        n_blocks = n_tables = 0
        for item, level in doc.iterate_items(with_groups=True):
            label = _label(item)
            name = getattr(item, "name", None)
            if isinstance(name, str) and label == "sheet":  # docling ≥ 2.1xx : groupe « BPU », label sheet
                sheet = name.strip()
                continue
            if isinstance(name, str) and name.lower().startswith("sheet:"):  # versions antérieures
                sheet = name.split(":", 1)[1].strip()
                continue
            prov = _first_prov(item)
            page = getattr(prov, "page_no", None)
            ref = str(getattr(item, "self_ref", "") or "") or None

            if label == "table" or (
                hasattr(item, "data") and hasattr(getattr(item, "data", None), "table_cells")
            ):
                n_tables += 1
                out.tables.append(
                    self._table(item, prov, ref or f"table-{n_tables}", page, sheet, section, is_sheet, src)
                )
                continue
            if label in _SKIPPED_LABELS:
                continue
            text = (getattr(item, "text", None) or "").strip()
            if not text:
                continue
            kind = _LABEL_TO_KIND.get(label, BlockKind.OTHER)
            if kind in (BlockKind.TITLE, BlockKind.HEADING):
                section = text
            n_blocks += 1
            block_id = ref or f"block-{n_blocks}"
            out.blocks.append(
                Block(
                    id=block_id,
                    kind=kind,
                    text=text,
                    level=level if isinstance(level, int) else None,
                    source=src(
                        page=None if is_sheet else page,
                        sheet=sheet,
                        section=section,
                        block_id=block_id,
                        excerpt=text[:300],
                    ),
                )
            )
        return out

    @staticmethod
    def _page_count(doc: Any) -> int | None:
        num_pages = getattr(doc, "num_pages", None)
        if callable(num_pages):
            try:
                return int(num_pages())
            except Exception:  # pragma: no cover - défensif
                return None
        pages = getattr(doc, "pages", None)
        return len(pages) if pages else None

    @staticmethod
    def _table(
        item: Any,
        prov: Any,
        table_id: str,
        page: int | None,
        sheet: str | None,
        section: str | None,
        is_sheet: bool,
        src: Callable[..., SourceRef],
    ) -> Table:
        data = item.data
        # Ancre Excel (colonne, ligne) dans bbox (l, t) ; 0 pour les autres formats.
        bbox = getattr(prov, "bbox", None)
        col0 = int(getattr(bbox, "l", 0) or 0) if is_sheet else 0
        row0 = int(getattr(bbox, "t", 0) or 0) if is_sheet else 0
        cells: list[TableCell] = []
        for c in getattr(data, "table_cells", []) or []:
            row = int(getattr(c, "start_row_offset_idx", 0))
            col = int(getattr(c, "start_col_offset_idx", 0))
            text = (getattr(c, "text", "") or "").strip()
            cell_ref = a1(row0 + row, col0 + col) if is_sheet else f"r{row + 1}c{col + 1}"
            cells.append(
                TableCell(
                    row=row,
                    col=col,
                    text=text,
                    is_header=bool(getattr(c, "column_header", False)),
                    source=src(
                        page=None if is_sheet else page,
                        sheet=sheet,
                        section=section,
                        table=table_id,
                        cell=cell_ref,
                        block_id=table_id,
                        excerpt=text[:300] or None,
                    ),
                )
            )
        caption = None
        caption_text = getattr(item, "caption_text", None)
        if callable(caption_text):
            try:
                caption = caption_text(None) or None
            except Exception:
                caption = None
        return Table(
            id=table_id,
            page=None if is_sheet else page,
            sheet=sheet,
            caption=caption,
            n_rows=int(getattr(data, "num_rows", 0) or 0),
            n_cols=int(getattr(data, "num_cols", 0) or 0),
            cells=cells,
        )
