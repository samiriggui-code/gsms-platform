"""Digest : NormalizedDocument(s) → WorkspaceDigest, puis pipeline complet via l'API
(dépôt → parsing Docling simulé → Digest → événements → contexte)."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import select

from gsms_core.context.applications import APPLICATION_REGISTRY, ApplicationId, ApplicationKind
from gsms_core.digest import DigestEngine, WorkspaceMismatch
from gsms_core.digest.conflicts import STAFFING_QUANTITY_MISMATCH
from gsms_core.documents.models import DocumentParse, ParseStatus
from gsms_core.documents.parsers import DoclingAdapter, ParseRequest
from gsms_core.events.models import Event
from gsms_core.missions.models import MissionType
from tests.fake_docling import BPU, CCTP, DPGF, RC, FakeConverter

FILES = {"CCTP.pdf": CCTP, "RC.pdf": RC, "BPU.xlsx": BPU, "DPGF.xlsx": DPGF}


def normalize(tmp_path, name: str, ws: uuid.UUID):
    path = tmp_path / name
    path.write_bytes(b"fake")
    adapter = DoclingAdapter(converter_factory=lambda: FakeConverter(FILES))
    return adapter.parse(ParseRequest(path=path, document_id=uuid.uuid4(), workspace_id=ws, filename=name))


# --- moteur ---------------------------------------------------------------------------------------


def test_single_document_digest_keeps_provenance(tmp_path):
    ws = uuid.uuid4()
    cctp = normalize(tmp_path, "CCTP.pdf", ws)
    digest = DigestEngine().build(ws, [cctp])

    assert digest.workspace_id == ws
    assert [d.business_type for d in digest.documents] == ["cctp"]
    req = next(r for r in digest.requirements if r.key == "SSIAP1")
    assert req.quantity == 2
    src = req.source
    assert (src.document_id, src.filename, src.page) == (cctp.document_id, "CCTP.pdf", 2)
    assert src.section == "Article 4 — Moyens humains" and src.block_id == "#/texts/3"
    assert "SSIAP 1" in src.excerpt
    assert any("doit assurer" in o.text for o in digest.obligations)
    assert [r.kind for r in digest.risks] == ["penalite"]


def test_multi_document_workspace_digest(tmp_path):
    ws = uuid.uuid4()
    docs = [normalize(tmp_path, n, ws) for n in ("CCTP.pdf", "RC.pdf", "BPU.xlsx", "DPGF.xlsx")]
    digest = DigestEngine().build(ws, docs, engagement_type=MissionType.APPEL_OFFRES)

    assert {d.filename: d.business_type for d in digest.documents} == {
        "BPU.xlsx": "bpu",
        "CCTP.pdf": "cctp",
        "DPGF.xlsx": "dpgf",
        "RC.pdf": "rc",
    }
    deadline = next(d for d in digest.deadlines if d.kind == "remise_offres")
    assert (deadline.due_date.isoformat(), deadline.due_time) == ("2026-11-15", "12:00")
    assert deadline.source.filename == "RC.pdf" and deadline.source.page == 3
    assert {d.label for d in digest.deliverables} >= {"Mémoire technique", "DC1 et DC2 signés"}
    assert {m.key for m in digest.missing_information} == {"ccap", "ae"}
    assert "eliminatoire" in {r.kind for r in digest.risks}
    assert {e.value for e in digest.entities} == {"Agent SSIAP 1"}


def test_conflict_between_documents_is_detected_with_sources(tmp_path):
    ws = uuid.uuid4()
    docs = [normalize(tmp_path, n, ws) for n in ("CCTP.pdf", "BPU.xlsx", "DPGF.xlsx")]
    digest = DigestEngine().build(ws, docs)

    [conflict] = [c for c in digest.conflicts if c.code == STAFFING_QUANTITY_MISMATCH]
    assert conflict.key == "SSIAP1"
    by_file = {v.source.filename: v for v in conflict.values}
    assert set(by_file) == {"CCTP.pdf", "BPU.xlsx", "DPGF.xlsx"}
    assert by_file["BPU.xlsx"].value.startswith("1 x")
    assert (by_file["BPU.xlsx"].source.sheet, by_file["BPU.xlsx"].source.cell) == ("BPU", "D4")
    assert (by_file["DPGF.xlsx"].source.sheet, by_file["DPGF.xlsx"].source.cell) == ("Récapitulatif", "B2")
    assert by_file["CCTP.pdf"].source.page == 2
    assert any(a.ref == f"{STAFFING_QUANTITY_MISMATCH}:SSIAP1" for a in digest.next_actions)


def test_consistent_documents_produce_no_conflict(tmp_path):
    ws = uuid.uuid4()
    docs = [normalize(tmp_path, n, ws) for n in ("CCTP.pdf", "DPGF.xlsx")]
    assert DigestEngine().build(ws, docs).conflicts == []


def test_digest_never_mixes_workspaces(tmp_path):
    ws_a, ws_b = uuid.uuid4(), uuid.uuid4()
    with pytest.raises(WorkspaceMismatch):
        DigestEngine().build(
            ws_a, [normalize(tmp_path, "CCTP.pdf", ws_a), normalize(tmp_path, "BPU.xlsx", ws_b)]
        )


def test_registry_separates_business_apps_from_the_docling_engine():
    docling = APPLICATION_REGISTRY[ApplicationId.DOCLING]
    doculens = APPLICATION_REGISTRY[ApplicationId.DOCULENS]
    assert docling.kind == ApplicationKind.ENGINE and not docling.bindable
    assert "parse_pdf" in docling.capabilities and "ocr" in docling.capabilities
    assert doculens.bindable and "ocr" not in doculens.capabilities
    assert set(doculens.capabilities) == {
        "document_upload",
        "document_view",
        "document_search",
        "document_navigation",
        "document_provenance",
    }


# --- pipeline complet via l'API ----------------------------------------------------------------------


@pytest.fixture
def converter(app):
    conv = FakeConverter(dict(FILES))
    app.state.document_parser = DoclingAdapter(converter_factory=lambda: conv)
    return conv


def upload(client, headers, ws: str, name: str) -> str:
    r = client.post(
        f"/api/v1/workspaces/{ws}/documents",
        headers=headers,
        files={"file": (name, name.encode() + b" bytes")},
    )
    assert r.status_code == 201, r.text
    return r.json()["document"]["id"]


def parse(client, headers, ws: str, doc_id: str):
    r = client.post(f"/api/v1/workspaces/{ws}/documents/{doc_id}/parse", headers=headers)
    assert r.status_code == 202, r.text
    return r


def event_types(session, ws: str) -> list[str]:
    rows = session.scalars(
        select(Event).where(Event.workspace_id == uuid.UUID(ws)).order_by(Event.occurred_at)
    )
    return [e.type for e in rows]


def test_api_pipeline_parse_digest_events_and_context(client, auth, demo, session, converter):
    h = auth("lyon")
    ids = {name: upload(client, h, demo.lyon, name) for name in ("CCTP.pdf", "BPU.xlsx")}
    for doc_id in ids.values():
        assert parse(client, h, demo.lyon, doc_id).json()["status"] == "PENDING"

    status = client.get(f"/api/v1/workspaces/{demo.lyon}/documents/{ids['BPU.xlsx']}/parse", headers=h).json()
    assert status["status"] == "PARSED" and status["summary"]["tables"] == 1

    digest = client.get(f"/api/v1/workspaces/{demo.lyon}/digest", headers=h).json()
    assert digest["workspace_id"] == demo.lyon  # workspace canonique propagé jusqu'au Digest
    assert digest["client_id"] == demo.org_id
    assert {d["document_id"] for d in digest["documents"]} == set(ids.values())

    conflicts = client.get(f"/api/v1/workspaces/{demo.lyon}/digest/conflicts", headers=h).json()
    assert [c["code"] for c in conflicts] == [STAFFING_QUANTITY_MISMATCH]
    sources = {v["source"]["filename"]: v["source"] for v in conflicts[0]["values"]}
    assert sources["BPU.xlsx"]["cell"] == "D4" and sources["CCTP.pdf"]["page"] == 2

    missing = client.get(f"/api/v1/workspaces/{demo.lyon}/digest/missing", headers=h).json()
    assert missing and all(m["code"] == "MISSING_DOCUMENT" for m in missing)  # mission Lyon = commission

    types = event_types(session, demo.lyon)
    for expected in (
        "document.uploaded",
        "document.parsing.started",
        "document.parsed",
        "digest.build.started",
        "digest.updated",
        "digest.conflict.detected",
        "digest.missing_information.detected",
    ):
        assert expected in types

    context = client.get(f"/api/v1/workspaces/{demo.lyon}/context", headers=h).json()
    assert context["digest"]["conflicts"] == 1 and context["digest"]["documents"] == 2


def test_api_rebuild_returns_the_same_digest(client, auth, demo, converter):
    h = auth("lyon")
    parse(client, h, demo.lyon, upload(client, h, demo.lyon, "CCTP.pdf"))
    first = client.get(f"/api/v1/workspaces/{demo.lyon}/digest", headers=h).json()
    rebuilt = client.post(f"/api/v1/workspaces/{demo.lyon}/digest/rebuild", headers=h)
    assert rebuilt.status_code == 200
    assert [r["id"] for r in rebuilt.json()["requirements"]] == [r["id"] for r in first["requirements"]]


def test_docling_error_gives_failed_status_and_event(client, auth, demo, session, converter):
    converter.docs["CCTP.pdf"] = RuntimeError("PDF chiffré")
    h = auth("lyon")
    doc_id = upload(client, h, demo.lyon, "CCTP.pdf")
    parse(client, h, demo.lyon, doc_id)

    status = client.get(f"/api/v1/workspaces/{demo.lyon}/documents/{doc_id}/parse", headers=h).json()
    assert status["status"] == "FAILED" and status["error_code"] == "docling_conversion_failed"
    assert "PDF chiffré" in status["error_message"]
    types = event_types(session, demo.lyon)
    assert "document.parsing.failed" in types and "document.parsed" not in types
    assert client.get(f"/api/v1/workspaces/{demo.lyon}/digest", headers=h).status_code == 404


def test_digest_is_scoped_to_its_workspace(client, auth, demo, converter, session):
    lyon, paris = auth("lyon"), auth("paris")
    parse(client, lyon, demo.lyon, upload(client, lyon, demo.lyon, "CCTP.pdf"))
    parse(client, paris, demo.paris, upload(client, paris, demo.paris, "BPU.xlsx"))

    lyon_digest = client.get(f"/api/v1/workspaces/{demo.lyon}/digest", headers=lyon).json()
    paris_digest = client.get(f"/api/v1/workspaces/{demo.paris}/digest", headers=paris).json()
    assert [d["filename"] for d in lyon_digest["documents"]] == ["CCTP.pdf"]
    assert [d["filename"] for d in paris_digest["documents"]] == ["BPU.xlsx"]
    assert lyon_digest["conflicts"] == [] and paris_digest["conflicts"] == []

    # Lyon ne lit ni le digest ni les parsings de Paris.
    assert client.get(f"/api/v1/workspaces/{demo.paris}/digest", headers=lyon).status_code == 403
    paris_parse = session.scalar(
        select(DocumentParse).where(DocumentParse.workspace_id == uuid.UUID(demo.paris))
    )
    assert paris_parse.status == ParseStatus.PARSED
    r = client.post(f"/api/v1/workspaces/{demo.lyon}/documents/{paris_parse.document_id}/parse", headers=lyon)
    assert r.status_code == 404


def test_docling_engine_cannot_be_bound_to_a_workspace(client, auth, demo):
    r = client.post(
        f"/api/v1/workspaces/{demo.lyon}/applications",
        headers=auth("owner"),
        json={"application_id": "docling", "external_workspace_id": "x"},
    )
    assert r.status_code == 400, r.text
