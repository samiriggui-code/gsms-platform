"""Parseurs documentaires du Core : interface stable + adapter Docling (moteur technique)."""

from gsms_core.documents.parsers.base import DocumentParser, ParseError, ParseRequest
from gsms_core.documents.parsers.docling_adapter import DoclingAdapter
from gsms_core.documents.parsers.schemas import (
    Block,
    BlockKind,
    NormalizedDocument,
    SourceRef,
    Table,
    TableCell,
)

__all__ = [
    "Block",
    "BlockKind",
    "DoclingAdapter",
    "DocumentParser",
    "NormalizedDocument",
    "ParseError",
    "ParseRequest",
    "SourceRef",
    "Table",
    "TableCell",
]
