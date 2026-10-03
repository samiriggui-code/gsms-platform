from __future__ import annotations

import hashlib
import io

import pytest
from sqlalchemy import func, select

from gsms_core.documents.models import Blob, DocumentVersion
from gsms_core.documents.service import UploadTooLarge, hash_to_tempfile


def _upload(client, auth, ws, content: bytes, name="registre.pdf", **data):
    return client.post(
        f"/api/v1/workspaces/{ws}/documents",
        headers=auth("lyon"),
        files={"file": (name, content, "application/pdf")},
        data=data,
    )


def test_hash_to_tempfile_streams_and_limits(tmp_path):
    payload = b"a" * (3 * 1024 * 1024 + 7)  # plusieurs blocs
    hashed = hash_to_tempfile(io.BytesIO(payload), max_bytes=10 * 1024 * 1024, spool_dir=tmp_path)
    assert hashed.sha256 == hashlib.sha256(payload).hexdigest()
    assert hashed.size == len(payload)
    assert hashed.path.read_bytes() == payload
    with pytest.raises(UploadTooLarge):
        hash_to_tempfile(io.BytesIO(payload), max_bytes=1024, spool_dir=tmp_path)
    assert list(tmp_path.glob("gsms-upload-*")) == [hashed.path]  # le temporaire refusé est supprimé


def test_upload_dedups_blobs_by_sha256(client, auth, demo, session, settings):
    content = b"%PDF-1.7 registre de securite"
    first = _upload(client, auth, demo.lyon, content, doc_type="registre_securite")
    second = _upload(client, auth, demo.lyon, content, name="copie.pdf")
    assert first.status_code == second.status_code == 201
    a, b = first.json(), second.json()
    assert a["version"]["sha256"] == hashlib.sha256(content).hexdigest()
    assert a["blob_deduplicated"] is False and b["blob_deduplicated"] is True
    assert a["document"]["id"] != b["document"]["id"]  # deux documents, un seul binaire
    assert session.scalar(select(func.count()).select_from(Blob)) == 1
    stored = [p for p in (settings.storage_local_root).rglob("*") if p.is_file()]
    assert len(stored) == 1
    raw = stored[0].read_bytes()  # coffre-fort : chiffré, jamais le contenu en clair
    assert raw.startswith(b"GSMSV1") and b"registre de securite" not in raw
    assert f"ws/{demo.lyon}/" in stored[0].as_posix()


def test_new_versions_on_existing_document(client, auth, demo, session):
    v1 = _upload(client, auth, demo.lyon, b"version 1").json()
    doc_id = v1["document"]["id"]
    same = _upload(client, auth, demo.lyon, b"version 1", document_id=doc_id).json()
    assert same["version_created"] is False and same["version"]["n"] == 1
    v2 = _upload(client, auth, demo.lyon, b"version 2", document_id=doc_id).json()
    assert v2["version"]["n"] == 2
    assert v2["document"]["current_version_id"] == v2["version"]["id"]
    versions = client.get(
        f"/api/v1/workspaces/{demo.lyon}/documents/{doc_id}/versions", headers=auth("lyon")
    ).json()
    assert [v["n"] for v in versions] == [1, 2]
    assert session.scalar(select(func.count()).select_from(DocumentVersion)) == 2


def test_upload_too_large_is_rejected(client, auth, demo):
    r = _upload(client, auth, demo.lyon, b"x" * (1024 * 1024 + 1))
    assert r.status_code == 413
