"""Cloisonnement par dossier : un RFP n'est visible que depuis le workspace qui l'a créé."""

from __future__ import annotations

import json

import pytest
from mcp.server.fastmcp.exceptions import ToolError

from tests.conftest import REF_A, REF_B, WS_A, WS_B, b64_document, call, docx_bytes


async def _parse_in(server, workspace_id: str) -> str:
    out = await call(
        server,
        "parse_tender_rfp",
        {"workspace_id": workspace_id, "document": b64_document("RC.docx", docx_bytes("Règlement de consultation"))},
    )
    return out["rfp_id"]


@pytest.fixture
async def loaded(server):
    await call(server, "ao_workspace_load", {"workspace_id": WS_A, "reference": REF_A})
    await call(server, "ao_workspace_load", {"workspace_id": WS_B, "reference": REF_B})
    return server


async def test_parse_in_workspace_keeps_no_file(loaded, db, tmp_path):
    rfp_id = await _parse_in(loaded, WS_A)
    rfp = await db.get_rfp(rfp_id)
    assert rfp["workspace_id"] == WS_A
    assert rfp["file_path"] == "RC.docx"
    assert not (tmp_path / "data" / "rfp_documents").exists()


async def test_workspace_requires_base64_and_prior_load(server, loaded):
    with pytest.raises(ToolError, match="base64"):
        await call(loaded, "parse_tender_rfp", {"workspace_id": WS_A, "file_path": "C:/RC.pdf"})
    other = "33333333-3333-4333-8333-333333333333"
    with pytest.raises(ToolError, match="ao_workspace_load"):
        await call(loaded, "check_submission_deadline", {"rfp_id": "x", "workspace_id": other})


async def test_rfp_is_invisible_from_other_workspace(loaded):
    rfp_id = await _parse_in(loaded, WS_A)

    ok = await call(loaded, "check_submission_deadline", {"rfp_id": rfp_id, "workspace_id": WS_A})
    assert ok["deadline"] == "2099-01-15"

    for args in (
        {"rfp_id": rfp_id, "workspace_id": WS_B},  # autre dossier
        {"rfp_id": rfp_id},  # usage autonome : ne voit pas les dossiers du Core
    ):
        with pytest.raises(ToolError, match="introuvable"):
            await call(loaded, "check_submission_deadline", args)
        with pytest.raises(ToolError, match="introuvable"):
            await call(loaded, "validate_document_completeness", args)
        with pytest.raises(ToolError, match="introuvable"):
            await call(loaded, "generate_compliance_matrix", {**args, "output_format": "json"})
        with pytest.raises(ToolError, match="introuvable"):
            await call(loaded, "build_full_technical_proposal", {**args, "sections": ["Executive Summary"]})


async def test_compliance_matrix_never_claims_compliance(loaded):
    rfp_id = await _parse_in(loaded, WS_A)
    out = await call(
        loaded, "generate_compliance_matrix", {"rfp_id": rfp_id, "workspace_id": WS_A, "output_format": "json"}
    )
    rows = json.loads(out) if isinstance(out, str) else out
    assert len(rows) == 2
    assert {r["status"] for r in rows} == {"À vérifier"}


async def test_docx_outputs_return_base64_in_workspace(loaded, tmp_path):
    rfp_id = await _parse_in(loaded, WS_A)
    out = await call(loaded, "generate_compliance_matrix", {"rfp_id": rfp_id, "workspace_id": WS_A})
    assert out["filename"].endswith(".docx") and out["content_base64"] and len(out["sha256"]) == 64
    produced = tmp_path / "data" / "generated_proposals"
    assert not any(produced.glob("*.docx"))
