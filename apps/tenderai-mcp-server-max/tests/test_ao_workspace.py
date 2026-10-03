from __future__ import annotations

import pytest
from mcp.server.fastmcp.exceptions import ToolError

from tests.conftest import REF_A, REF_B, WS_A, WS_B, b64_document, call


async def test_workspace_load_returns_space_and_capabilities(server, db):
    out = await call(
        server,
        "ao_workspace_load",
        {
            "workspace_id": WS_A,
            "reference": REF_A,
            "documents": [
                b64_document("RC.pdf", b"reglement", document_id="doc-1", kind="rc"),
                b64_document("CCTP.pdf", b"cahier"),
            ],
        },
    )
    assert out["workspace_id"] == WS_A and out["reference"] == REF_A
    assert out["mcp_workspace_id"]
    assert [d["filename"] for d in out["documents"]] == ["RC.pdf", "CCTP.pdf"]
    assert out["documents"][0]["kind"] == "rc" and out["documents"][0]["document_id"] == "doc-1"
    assert out["rejected"] == []
    keys = {c["key"] for c in out["capabilities"]}
    assert {"workspace", "document", "deadlines"} <= keys
    assert "content_base64" not in str(out)

    again = await call(server, "ao_workspace_load", {"workspace_id": WS_A, "reference": REF_A})
    assert again["mcp_workspace_id"] == out["mcp_workspace_id"]
    assert (await db.get_ao_workspace(WS_A))["last_document_count"] == 0


async def test_workspace_load_reports_rejected_pieces(server):
    bad = b64_document("BPU.xlsx", b"grille")
    bad["sha256"] = "f" * 64
    big = b64_document("Annexe.pdf", b"x" * (1024 * 1024 + 1))
    out = await call(
        server,
        "ao_workspace_load",
        {"workspace_id": WS_A, "reference": REF_A, "documents": [bad, big, b64_document("RC.pdf", b"ok")]},
    )
    assert [d["filename"] for d in out["documents"]] == ["RC.pdf"]
    reasons = {r["filename"]: r["reason"] for r in out["rejected"]}
    assert "SHA-256" in reasons["BPU.xlsx"] and "trop volumineux" in reasons["Annexe.pdf"]


async def test_workspace_and_reference_are_bound_together(server):
    await call(server, "ao_workspace_load", {"workspace_id": WS_A, "reference": REF_A})
    with pytest.raises(ToolError, match="déjà lié"):
        await call(server, "ao_workspace_load", {"workspace_id": WS_A, "reference": REF_B})
    with pytest.raises(ToolError, match="autre espace"):
        await call(server, "ao_workspace_load", {"workspace_id": WS_B, "reference": REF_A})


async def test_workspace_load_validates_inputs(server):
    with pytest.raises(ToolError, match="workspace_id invalide"):
        await call(server, "ao_workspace_load", {"workspace_id": "../etc", "reference": REF_A})
    with pytest.raises(ToolError, match="référence invalide"):
        await call(server, "ao_workspace_load", {"workspace_id": WS_A, "reference": "AO-42"})
