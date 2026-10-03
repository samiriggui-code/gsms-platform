"""Routes du Core consommées par DocuLens (mode Core) : liste avec statut de parsing, fichier d'origine,
document parsé avec provenance, recherche plein texte — toujours scopées au workspace."""

from __future__ import annotations

import pytest

from gsms_core.documents.parsers import DoclingAdapter
from gsms_core.documents.search import terms
from tests.fake_docling import BPU, CCTP, RC, FakeConverter

FILES = {"CCTP.pdf": CCTP, "RC.pdf": RC, "BPU.xlsx": BPU, "Récap — lot 1.pdf": CCTP}


@pytest.fixture(autouse=True)
def converter(app):
    conv = FakeConverter(dict(FILES))
    app.state.document_parser = DoclingAdapter(converter_factory=lambda: conv)
    return conv


def upload(client, headers, ws: str, name: str, content: bytes | None = None) -> str:
    r = client.post(
        f"/api/v1/workspaces/{ws}/documents",
        headers=headers,
        files={"file": (name, content or name.encode() + b" bytes")},
    )
    assert r.status_code == 201, r.text
    return r.json()["document"]["id"]


def parse(client, headers, ws: str, doc_id: str) -> None:
    r = client.post(f"/api/v1/workspaces/{ws}/documents/{doc_id}/parse", headers=headers)
    assert r.status_code == 202, r.text


def test_list_reports_parse_status(client, auth, demo):
    h = auth("lyon")
    parsed = upload(client, h, demo.lyon, "CCTP.pdf")
    pending = upload(client, h, demo.lyon, "RC.pdf")
    parse(client, h, demo.lyon, parsed)

    docs = {d["id"]: d for d in client.get(f"/api/v1/workspaces/{demo.lyon}/documents", headers=h).json()}
    assert docs[parsed]["parse_status"] == "PARSED"
    assert docs[pending]["parse_status"] is None


def test_content_returns_the_original_file(client, auth, demo):
    h = auth("lyon")
    doc_id = upload(client, h, demo.lyon, "Récap — lot 1.pdf", b"%PDF-1.7 contenu")

    r = client.get(f"/api/v1/workspaces/{demo.lyon}/documents/{doc_id}/content", headers=h)
    assert r.status_code == 200
    assert r.content == b"%PDF-1.7 contenu"
    assert r.headers["x-content-type-options"] == "nosniff"
    disposition = r.headers["content-disposition"]
    assert disposition.startswith('inline; filename="Rcap  lot 1.pdf"')
    assert "filename*=UTF-8''R%C3%A9cap%20%E2%80%94%20lot%201.pdf" in disposition


def test_normalized_document_keeps_provenance(client, auth, demo):
    h = auth("lyon")
    doc_id = upload(client, h, demo.lyon, "BPU.xlsx")
    url = f"/api/v1/workspaces/{demo.lyon}/documents/{doc_id}/normalized"
    assert client.get(url, headers=h).status_code == 404  # pas encore parsé

    parse(client, h, demo.lyon, doc_id)
    body = client.get(url, headers=h).json()
    assert body["workspace_id"] == demo.lyon and body["document_id"] == doc_id
    cells = {c["text"]: c["source"] for c in body["tables"][0]["cells"]}
    assert (cells["1"]["sheet"], cells["1"]["cell"]) == ("BPU", "D4")


def test_search_returns_hits_with_sources(client, auth, demo):
    h = auth("lyon")
    for name in ("CCTP.pdf", "BPU.xlsx", "RC.pdf"):
        parse(client, h, demo.lyon, upload(client, h, demo.lyon, name))

    r = client.get(f"/api/v1/workspaces/{demo.lyon}/search", params={"q": "ssiap 1"}, headers=h)
    assert r.status_code == 200, r.text
    hits = r.json()
    by_file = {hit["filename"]: hit for hit in hits}
    assert set(by_file) == {"CCTP.pdf", "BPU.xlsx"}
    assert by_file["CCTP.pdf"]["source"]["page"] == 2
    assert by_file["CCTP.pdf"]["source"]["section"] == "Article 4 — Moyens humains"
    assert by_file["BPU.xlsx"]["source"]["sheet"] == "BPU"

    accents = client.get(f"/api/v1/workspaces/{demo.lyon}/search", params={"q": "PENALITES"}, headers=h)
    assert [hit["filename"] for hit in accents.json()] == ["CCTP.pdf"]
    nothing = client.get(f"/api/v1/workspaces/{demo.lyon}/search", params={"q": "astreinte"}, headers=h)
    assert nothing.json() == []


def test_search_and_content_are_scoped_to_the_workspace(client, auth, demo):
    lyon, paris = auth("lyon"), auth("paris")
    paris_doc = upload(client, paris, demo.paris, "CCTP.pdf")
    parse(client, paris, demo.paris, paris_doc)

    q = {"q": "ssiap"}
    assert client.get(f"/api/v1/workspaces/{demo.lyon}/search", params=q, headers=lyon).json() == []
    assert client.get(f"/api/v1/workspaces/{demo.paris}/search", params=q, headers=lyon).status_code == 403
    for suffix in ("content", "normalized"):
        r = client.get(f"/api/v1/workspaces/{demo.lyon}/documents/{paris_doc}/{suffix}", headers=lyon)
        assert r.status_code == 404


def test_search_terms_fold_case_and_accents():
    assert terms("Pénalités, SSIAP-1 ") == ["penalites", "ssiap", "1"]
    assert terms("  ") == []


def test_cors_allows_only_configured_origins(settings, db):
    from fastapi.testclient import TestClient

    from gsms_core.main import create_app

    origin = "https://doculens.gsms-security.com"
    settings.cors_origins = [origin]
    with TestClient(create_app(settings, db=db)) as c:
        preflight = {
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        }
        ok = c.options("/api/v1/health", headers={"Origin": origin, **preflight})
        assert ok.headers["access-control-allow-origin"] == origin
        other = c.options("/api/v1/health", headers={"Origin": "https://evil.example", **preflight})
        assert "access-control-allow-origin" not in other.headers
