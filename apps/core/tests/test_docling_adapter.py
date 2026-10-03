"""DoclingAdapter → NormalizedDocument (Docling simulé : aucun modèle téléchargé)."""

from __future__ import annotations

import uuid

import pytest

from gsms_core.documents.parsers import DoclingAdapter, DocumentParser, ParseError, ParseRequest
from gsms_core.documents.parsers.docling_adapter import a1
from gsms_core.documents.parsers.schemas import BlockKind
from tests.fake_docling import BPU, CCTP, FakeConverter, Label, Result

WS = uuid.uuid4()


def _req(tmp_path, name: str, ws: uuid.UUID = WS) -> ParseRequest:
    path = tmp_path / name
    path.write_bytes(b"fake")
    return ParseRequest(
        path=path, document_id=uuid.uuid4(), workspace_id=ws, filename=name, version_id=uuid.uuid4()
    )


def _adapter(**docs) -> DoclingAdapter:
    return DoclingAdapter(converter_factory=lambda: FakeConverter(docs))


def test_adapter_implements_the_parser_interface():
    assert isinstance(DoclingAdapter(), DocumentParser)
    assert DoclingAdapter().supports("CCTP.pdf") and DoclingAdapter().supports("BPU.xlsx")
    assert not DoclingAdapter().supports("archive.zip")


def test_a1_references():
    assert [a1(0, 0), a1(2, 1), a1(9, 25), a1(0, 26)] == ["A1", "B3", "Z10", "AA1"]


def test_pdf_becomes_normalized_document_with_provenance(tmp_path):
    req = _req(tmp_path, "CCTP.pdf")
    doc = _adapter(**{"CCTP.pdf": CCTP}).parse(req)

    assert doc.workspace_id == WS and doc.document_id == req.document_id and doc.version_id == req.version_id
    assert doc.parser == "docling" and doc.page_count == 3
    texts = [b.text for b in doc.blocks]
    assert not any("page 1" in t for t in texts)  # en-têtes de page ignorés
    assert doc.blocks[0].kind == BlockKind.TITLE
    staffing = next(b for b in doc.blocks if "SSIAP 1" in b.text)
    assert staffing.source.page == 2
    assert staffing.source.section == "Article 4 — Moyens humains"
    assert staffing.source.block_id == "#/texts/3"
    assert staffing.source.filename == "CCTP.pdf" and staffing.source.document_id == req.document_id


def test_xlsx_uses_the_same_contract_with_sheet_and_a1_cells(tmp_path):
    req = _req(tmp_path, "BPU.xlsx")
    doc = _adapter(**{"BPU.xlsx": BPU}).parse(req)

    assert doc.workspace_id == WS and doc.blocks == [] and len(doc.tables) == 1
    table = doc.tables[0]
    assert table.sheet == "BPU" and table.page is None and (table.n_rows, table.n_cols) == (2, 4)
    by_text = {c.text: c for c in table.cells}
    assert by_text["Désignation"].source.cell == "B3"  # ancre du tableau en B3
    assert by_text["Désignation"].is_header
    qty = by_text["1"]
    assert (qty.source.sheet, qty.source.cell, qty.source.table) == ("BPU", "D4", "#/tables/0")


def test_docling_error_becomes_parse_error(tmp_path):
    adapter = _adapter(**{"CCTP.pdf": RuntimeError("pdf corrompu")})
    with pytest.raises(ParseError) as exc:
        adapter.parse(_req(tmp_path, "CCTP.pdf"))
    assert exc.value.code == "docling_conversion_failed"


def test_docling_failure_status_is_reported(tmp_path):
    adapter = _adapter(**{"CCTP.pdf": lambda: Result(None, status=Label("failure"))})
    with pytest.raises(ParseError) as exc:
        adapter.parse(_req(tmp_path, "CCTP.pdf"))
    assert exc.value.code == "docling_conversion_failed"


def test_unsupported_format_is_refused(tmp_path):
    with pytest.raises(ParseError) as exc:
        _adapter().parse(_req(tmp_path, "archive.zip"))
    assert exc.value.code == "unsupported_format"


def test_missing_docling_package_is_a_clean_error(tmp_path, monkeypatch):
    import builtins

    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name.startswith("docling"):
            raise ImportError(name)
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    with pytest.raises(ParseError) as exc:
        DoclingAdapter().parse(_req(tmp_path, "CCTP.pdf"))
    assert exc.value.code == "docling_unavailable"
