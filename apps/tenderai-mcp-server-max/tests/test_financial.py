from __future__ import annotations

from tests.conftest import b64_document, call, docx_bytes, xlsx_bytes


async def test_vendor_quote_lines_are_stored_and_reused(server, db):
    quote = b64_document("devis.xlsx", xlsx_bytes([["Radio", 4, 120], ["Installation", 1, 300]]))
    out = await call(server, "ingest_vendor_quote", {"vendor_name": "Fournisseur radio", "document": quote})
    assert out["items_parsed"] == 2 and out["total"] == 780.0

    stored = await db.get_vendor_quote(out["quote_id"])
    assert [i["item_name"] for i in stored["items"]] == ["Radio", "Installation"]
    assert stored["source_name"] == "devis.xlsx" and stored["total"] == 780.0

    rfp = await call(
        server, "parse_tender_rfp", {"document": b64_document("RC.docx", docx_bytes("Règlement"))}
    )
    bom = await call(server, "build_bom", {"rfp_id": rfp["rfp_id"], "quote_ids": [out["quote_id"]]})
    assert bom["item_count"] == 2


async def test_financial_proposal_uses_company_name(server, db, tmp_path):
    from docx import Document

    rfp = await call(server, "parse_tender_rfp", {"document": b64_document("RC.docx", docx_bytes("Règlement"))})
    bom = await call(
        server,
        "build_bom",
        {"rfp_id": rfp["rfp_id"], "vendor_quotes": [{"vendor_name": "X", "items": [{"item_name": "Radio", "unit_cost": 10}]}]},
    )
    path = await call(server, "generate_financial_proposal", {"rfp_id": rfp["rfp_id"], "proposal_id": bom["proposal_id"]})
    text = "\n".join(p.text for p in Document(path).paragraphs)
    assert "GSMS" in text
    assert "TenderAI" not in text
