from __future__ import annotations

import base64

import pytest

from app.files import FileExchangeError, decode_document, encode_file, materialize, safe_filename
from tests.conftest import b64_document


def test_decode_roundtrip_and_hash():
    inbound = decode_document(b64_document("RC.pdf", b"%PDF-1.4 contenu"))
    assert inbound.filename == "RC.pdf"
    assert inbound.content == b"%PDF-1.4 contenu"
    assert inbound.mime == "application/pdf"
    with materialize(inbound) as path:
        assert path.read_bytes() == inbound.content
    assert not path.exists()


def test_decode_refuses_altered_or_invalid_content():
    doc = b64_document("CCTP.pdf", b"original")
    doc["sha256"] = "0" * 64
    with pytest.raises(FileExchangeError, match="SHA-256"):
        decode_document(doc)
    with pytest.raises(FileExchangeError, match="base64"):
        decode_document({"filename": "x.pdf", "content_base64": "pas du base64 !"})
    with pytest.raises(FileExchangeError, match="absent"):
        decode_document({"filename": "x.pdf"})


def test_decode_enforces_size_cap():
    content = b"x" * 2048
    with pytest.raises(FileExchangeError, match="trop volumineux"):
        decode_document(b64_document("gros.pdf", content), max_bytes=1024)
    assert decode_document(b64_document("ok.pdf", content), max_bytes=2048).size == 2048


def test_filename_never_carries_a_path():
    assert safe_filename("../../etc/passwd") == "passwd"
    assert safe_filename("C:\\dossier\\DPGF.xlsx") == "DPGF.xlsx"
    with pytest.raises(FileExchangeError):
        safe_filename("../")


def test_encode_file_deletes_local_copy(tmp_path):
    produced = tmp_path / "matrice.docx"
    produced.write_bytes(b"docx")
    out = encode_file(produced)
    assert base64.b64decode(out["content_base64"]) == b"docx"
    assert out["size"] == 4 and len(out["sha256"]) == 64
    assert not produced.exists()
