"""Coffre-fort : chiffrement par workspace, dossiers, visibilité client, journal d'accès, intégrité,
classement automatique après analyse et migration des fichiers d'avant le coffre-fort."""

from __future__ import annotations

import hashlib
import io
import uuid
from pathlib import Path

import pytest
from sqlalchemy import select

from gsms_core.documents.models import Blob, Document, DocumentVersion
from gsms_core.documents.parsers import DoclingAdapter
from gsms_core.documents.storage import LocalFSStorage
from gsms_core.vault import crypto
from gsms_core.vault.migrate import migrate_legacy
from gsms_core.vault.models import WorkspaceKey
from gsms_core.vault.storage import DEV_MASTER_KEY, Vault
from tests.fake_docling import CCTP, FakeConverter

# --- chiffrement --------------------------------------------------------------------------------------


@pytest.fixture
def small_chunks(monkeypatch):
    monkeypatch.setattr(crypto, "CHUNK_SIZE", 16)


def _encrypt(data: bytes, key: bytes) -> bytes:
    out = io.BytesIO()
    crypto.encrypt_stream(key, 1, io.BytesIO(data), out)
    return out.getvalue()


def _decrypt(raw: bytes, key: bytes) -> bytes:
    src = io.BytesIO(raw)
    header, _ = crypto.read_header(src)
    return b"".join(crypto.decrypt_stream(key, header, src))


@pytest.mark.parametrize(
    "data", [b"", b"court", b"x" * 16, b"exactement 48 octets pour tomber pile sur 3 blocs"[:48]]
)
def test_roundtrip_any_size(small_chunks, data):
    key = crypto.generate_key()
    raw = _encrypt(data, key)
    assert raw.startswith(crypto.MAGIC) and (not data or data not in raw)
    assert _decrypt(raw, key) == data


def test_tampering_truncation_and_wrong_key_are_detected(small_chunks):
    key = crypto.generate_key()
    raw = _encrypt(b"pieces confidentielles du client " * 4, key)
    flipped = bytearray(raw)
    flipped[crypto.HEADER_SIZE + 10] ^= 1
    with pytest.raises(crypto.IntegrityError):
        _decrypt(bytes(flipped), key)
    last_block = 4 + 16 + 16
    with pytest.raises(crypto.IntegrityError):
        _decrypt(raw[:-last_block], key)  # dernier bloc retiré
    with pytest.raises(crypto.IntegrityError):
        _decrypt(raw, crypto.generate_key())


def test_workspace_keys_are_wrapped_and_bound_to_their_workspace():
    master = crypto.decode_master_key(DEV_MASTER_KEY)
    key = crypto.generate_key()
    ws_a, ws_b = uuid.uuid4(), uuid.uuid4()
    wrapped = crypto.wrap_key(master, key, ws_a.bytes)
    assert crypto.unwrap_key(master, wrapped, ws_a.bytes) == key
    with pytest.raises(crypto.IntegrityError):
        crypto.unwrap_key(master, wrapped, ws_b.bytes)


# --- API ----------------------------------------------------------------------------------------------


def upload(client, headers, ws, name="piece.pdf", content=b"%PDF contenu", **form):
    data = {k: str(v) for k, v in form.items()}
    r = client.post(
        f"/api/v1/workspaces/{ws}/documents", headers=headers, files={"file": (name, content)}, data=data
    )
    return r


def folders_by_key(client, headers, ws) -> dict[str, dict]:
    tree = client.get(f"/api/v1/workspaces/{ws}/vault/folders", headers=headers)
    assert tree.status_code == 200, tree.text
    return {f["system_key"]: f for f in tree.json() if f["system_key"]}


def test_each_workspace_has_its_own_key_and_ciphertext(client, auth, demo, session, settings):
    content = b"%PDF meme fichier sur deux sites"
    assert upload(client, auth("lyon"), demo.lyon, content=content).status_code == 201
    assert upload(client, auth("paris"), demo.paris, content=content).status_code == 201
    blobs = list(session.scalars(select(Blob)))
    assert {str(b.workspace_id) for b in blobs} == {demo.lyon, demo.paris}
    assert all(b.encryption == crypto.ALGORITHM for b in blobs)
    files = [p.read_bytes() for p in settings.storage_local_root.rglob("*.enc")]
    assert len(files) == 2 and files[0] != files[1]
    assert session.scalar(select(WorkspaceKey).limit(1)).wrapped_key  # jamais la clé en clair


def test_download_is_decrypted_and_logged(client, auth, demo):
    content = b"%PDF-1.7 rapport confidentiel"
    doc_id = upload(client, auth("lyon"), demo.lyon, content=content).json()["document"]["id"]
    r = client.get(f"/api/v1/workspaces/{demo.lyon}/documents/{doc_id}/content", headers=auth("lyon"))
    assert r.status_code == 200 and r.content == content

    log_url = f"/api/v1/workspaces/{demo.lyon}/vault/documents/{doc_id}/access-log"
    assert client.get(log_url, headers=auth("lyon")).status_code == 403  # journal : équipe seulement
    log = client.get(log_url, headers=auth("consultant")).json()
    assert [e["action"] for e in log] == ["document.download", "document.upload"]
    assert log[0]["actor"].startswith("user:") and len(log[0]["hash"]) == 64
    assert log[0]["actor_name"] == "Responsable Lyon (responsable.lyon@abc-retail.example)"


def test_clients_never_see_gsms_internal_work(client, auth, demo):
    team, cli = auth("consultant"), auth("lyon")
    keys = folders_by_key(client, team, demo.lyon)
    assert set(keys) == {"client", "consultation", "work", "deliverables"}
    internal = upload(client, team, demo.lyon, name="note-interne.pdf", folder_id=keys["work"]["id"])
    assert internal.status_code == 201
    internal_id = internal.json()["document"]["id"]
    mine = upload(client, cli, demo.lyon, name="registre.pdf").json()["document"]["id"]

    assert set(folders_by_key(client, cli, demo.lyon)) == {"client", "consultation", "deliverables"}
    listed = {d["id"] for d in client.get(f"/api/v1/workspaces/{demo.lyon}/documents", headers=cli).json()}
    assert listed == {mine}
    for path in ("", "/content", "/versions"):
        r = client.get(f"/api/v1/workspaces/{demo.lyon}/documents/{internal_id}{path}", headers=cli)
        assert r.status_code == 404
    r = client.get(f"/api/v1/workspaces/{demo.lyon}/vault/folders/{keys['work']['id']}", headers=cli)
    assert r.status_code == 404

    # Le client dépose dans ses pièces, pas dans le travail GSMS ni dans les livrables.
    for key in ("work", "deliverables"):
        r = upload(client, cli, demo.lyon, name="x.pdf", folder_id=keys[key]["id"])
        assert r.status_code in (403, 404), key


def test_folder_operations(client, auth, demo):
    team = auth("consultant")
    root = folders_by_key(client, team, demo.lyon)["client"]["id"]
    base = f"/api/v1/workspaces/{demo.lyon}/vault/folders"
    sub = client.post(base, headers=team, json={"name": "Contrats 2026", "parent_id": root})
    assert sub.status_code == 201, sub.text
    sub_id = sub.json()["id"]
    assert (
        client.post(base, headers=team, json={"name": "contrats 2026", "parent_id": root}).status_code == 400
    )
    assert client.patch(f"{base}/{root}", headers=team, json={"name": "x"}).status_code == 400  # système

    doc_id = upload(client, team, demo.lyon, name="contrat.pdf").json()["document"]["id"]
    moved = client.post(
        f"/api/v1/workspaces/{demo.lyon}/vault/documents/{doc_id}/move",
        headers=team,
        json={"folder_id": sub_id},
    )
    assert moved.status_code == 200
    content = client.get(f"{base}/{sub_id}", headers=team).json()
    assert [c["name"] for c in content["path"]] == ["Pièces client", "Contrats 2026"]
    assert [d["id"] for d in content["documents"]] == [doc_id] and content["documents"][0]["encrypted"]
    assert client.delete(f"{base}/{sub_id}", headers=team).status_code == 400  # non vide

    renamed = client.patch(f"{base}/{sub_id}", headers=team, json={"name": "Contrats"})
    assert renamed.status_code == 200 and renamed.json()["name"] == "Contrats"


def test_tree_groups_workspaces_by_client_and_site(client, auth, demo):
    tree = client.get("/api/v1/vault/tree", headers=auth("owner")).json()
    assert [c["name"] for c in tree] == ["ABC Retail"]
    sites = {s["name"]: [w["id"] for w in s["workspaces"]] for s in tree[0]["sites"]}
    assert len(sites) == 2
    assert sorted(w for ids in sites.values() for w in ids) == sorted([demo.lyon, demo.paris])

    lyon_tree = client.get("/api/v1/vault/tree", headers=auth("lyon")).json()
    assert [w["id"] for s in lyon_tree[0]["sites"] for w in s["workspaces"]] == [demo.lyon]


def test_analysed_pieces_are_filed_by_type(client, auth, demo, app, session):
    app.state.document_parser = DoclingAdapter(converter_factory=lambda: FakeConverter({"CCTP.pdf": CCTP}))
    r = upload(client, auth("lyon"), demo.lyon, name="CCTP.pdf", analyze="true")
    assert r.status_code == 201, r.text
    doc = session.get(Document, uuid.UUID(r.json()["document"]["id"]))
    session.refresh(doc)
    content = client.get(
        f"/api/v1/workspaces/{demo.lyon}/vault/folders/{doc.folder_id}", headers=auth("lyon")
    )
    assert [c["name"] for c in content.json()["path"]] == ["Pièces client", "CCTP"]
    assert doc.doc_type == "cctp"


def test_integrity_check_detects_a_modified_file(client, auth, demo, settings):
    team = auth("consultant")
    doc_id = upload(client, team, demo.lyon, content=b"%PDF original").json()["document"]["id"]
    url = f"/api/v1/workspaces/{demo.lyon}/vault/documents/{doc_id}/verify"
    assert [v["ok"] for v in client.post(url, headers=team).json()] == [True]

    [stored] = list(settings.storage_local_root.rglob("*.enc"))
    raw = bytearray(stored.read_bytes())
    raw[-5] ^= 1
    stored.write_bytes(bytes(raw))
    [result] = client.post(url, headers=team).json()
    assert result["ok"] is False and "altéré" in result["detail"]


def test_legacy_plaintext_files_are_migrated(demo, session, settings, tmp_path):
    legacy = LocalFSStorage(tmp_path / "legacy", settings.s3_bucket)
    content = b"%PDF ancien fichier en clair"
    sha = hashlib.sha256(content).hexdigest()
    key = f"sha256/{sha[:2]}/{sha}"
    src = tmp_path / "src.pdf"
    src.write_bytes(content)
    legacy.put_file(key, src, "application/pdf")
    blob = Blob(sha256=sha, size=len(content), mime="application/pdf", bucket="b", object_key=key)
    session.add(blob)
    session.flush()
    docs = []
    for ws in (demo.lyon, demo.paris):  # même fichier utilisé par deux workspaces
        doc = Document(workspace_id=uuid.UUID(ws), title="ancien.pdf")
        session.add(doc)
        session.flush()
        version = DocumentVersion(
            document_id=doc.id, n=1, blob_id=blob.id, filename="ancien.pdf", uploaded_by="x"
        )
        session.add(version)
        session.flush()
        doc.current_version_id = version.id
        docs.append(doc)
    session.commit()

    vault = Vault.from_settings(LocalFSStorage(settings.storage_local_root, settings.s3_bucket), settings)
    report = migrate_legacy(session, vault, legacy)
    assert (report.blobs_encrypted, report.versions_repointed, report.documents_filed) == (2, 2, 2)
    assert report.errors == []
    blobs = list(session.scalars(select(Blob)))
    assert len(blobs) == 2 and all(b.encryption == crypto.ALGORITHM for b in blobs)
    for blob in blobs:
        assert b"".join(vault.iter_plaintext(session, blob)) == content
    assert all(d.folder_id is not None for d in docs)
    again = migrate_legacy(session, vault, legacy)
    assert (again.blobs_encrypted, again.documents_filed) == (0, 0)
    assert Path(legacy.root / key).exists()  # l'ancien fichier n'est jamais effacé automatiquement
