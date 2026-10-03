"""Financial Proposal tools — vendor quotes, BOM, pricing, financial proposal generation."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from mcp.server.fastmcp import FastMCP

from app.db.database import Database
from app.files import DEFAULT_MAX_BYTES, decode_document, materialize
from app.services.docwriter import DocWriterService
from app.services.llm import LLMService
from app.services.parser import ParserService
from app.tools.ao import resolve_scope

logger = logging.getLogger(__name__)


def register_financial_tools(
    mcp: FastMCP,
    db: Database,
    llm: LLMService,
    parser: ParserService,
    docwriter: DocWriterService,
    data_dir: Path,
    default_currency: str,
    default_margin_pct: float,
    company_name: str = "GSMS",
    max_bytes: int = DEFAULT_MAX_BYTES,
) -> None:
    """Register all financial proposal tools on the MCP server."""

    @mcp.tool()
    async def ingest_vendor_quote(
        vendor_name: str,
        quote_file: str = "",
        document: dict | None = None,
        workspace_id: str | None = None,
    ) -> dict:
        """Parse a vendor quote document, extract its pricing line items and keep them.

        Supports PDF and XLSX formats. Creates or updates the vendor record and stores
        the extracted lines as a vendor quote (quote_id), reusable to build a BOM.

        Args:
            vendor_name: Name of the vendor
            quote_file: Path to the quote document on this server (standalone use only)
            document: {filename, content_base64, sha256?} — instead of quote_file
            workspace_id: Core workspace of the tender (loaded first with ao_workspace_load)

        Returns:
            Dict with quote_id, vendor_id, items_parsed, total, and parsed_items list
        """
        scope = await resolve_scope(db, workspace_id)
        if document is not None:
            inbound = decode_document(document, max_bytes)
            with materialize(inbound) as tmp_path:
                parsed = await parser.parse_file(str(tmp_path))
            source_name, source_sha = inbound.filename, inbound.sha256
        elif scope is None and quote_file:
            parsed = await parser.parse_file(quote_file)
            source_name, source_sha = Path(quote_file).name, ""
        else:
            raise ValueError("devis requis : document (base64), ou quote_file en usage autonome")

        # Use LLM to extract structured pricing data
        extract_prompt = (
            "Extract pricing line items from this vendor quote as JSON:\n"
            "{\n"
            '  "currency": "USD or OMR or EUR",\n'
            '  "items": [\n'
            "    {\n"
            '      "category": "hardware|software|services|licensing|support",\n'
            '      "item_name": "product/service name",\n'
            '      "description": "brief description",\n'
            '      "manufacturer": "manufacturer name",\n'
            '      "part_number": "part number if available",\n'
            '      "quantity": 1,\n'
            '      "unit": "unit|license|month|year",\n'
            '      "unit_cost": 0.00\n'
            "    }\n"
            "  ]\n"
            "}\n\n"
            "Return ONLY valid JSON.\n\n"
            f"Document text:\n{parsed['text'][:10000]}"
        )

        result_text = await llm.generate(
            system_prompt="You are an expert at parsing vendor quotations and extracting pricing data.",
            user_prompt=extract_prompt,
        )

        try:
            extracted = json.loads(result_text.strip())
        except json.JSONDecodeError:
            if "```json" in result_text:
                json_str = result_text.split("```json")[1].split("```")[0].strip()
                extracted = json.loads(json_str)
            elif "```" in result_text:
                json_str = result_text.split("```")[1].split("```")[0].strip()
                extracted = json.loads(json_str)
            else:
                raise ValueError(f"Could not parse LLM response as JSON: {result_text[:200]}")

        # Upsert vendor
        vendor = await db.upsert_vendor(
            name=vendor_name,
            currency=extracted.get("currency", default_currency),
        )

        items = [item for item in extracted.get("items", []) if isinstance(item, dict)]
        total = sum(
            float(item.get("quantity", 1) or 0) * float(item.get("unit_cost", 0) or 0) for item in items
        )
        currency = extracted.get("currency", default_currency)
        quote = await db.create_vendor_quote(
            vendor_id=vendor["id"],
            items=items,
            total=total,
            currency=currency,
            source_name=source_name,
            sha256=source_sha,
            workspace_id=scope,
        )

        logger.info("Ingested vendor quote: %s (%d items, total=%.2f)", vendor_name, len(items), total)

        return {
            "quote_id": quote["id"],
            "vendor_id": vendor["id"],
            "vendor_name": vendor_name,
            "items_parsed": len(items),
            "total": total,
            "currency": currency,
            "parsed_items": items,
        }

    @mcp.tool()
    async def build_bom(
        rfp_id: str, vendor_quotes: list[dict] | None = None, quote_ids: list[str] | None = None
    ) -> dict:
        """Build a Bill of Materials from multiple vendor quotes.

        Creates a financial proposal record and inserts BOM items from the provided
        vendor quote data, and/or from quotes already stored by ingest_vendor_quote.

        Args:
            rfp_id: ID of the parsed RFP
            vendor_quotes: List of dicts, each with "vendor_name" and "items" (list of line items)
            quote_ids: IDs returned by ingest_vendor_quote (stored lines are reused)

        Returns:
            Dict with proposal_id, item_count, subtotal, and by_category breakdown
        """
        rfp = await db.get_rfp_in_workspace(rfp_id, None)
        if not rfp:
            raise ValueError(f"RFP not found: {rfp_id}")

        vendor_quotes = list(vendor_quotes or [])
        for quote_id in quote_ids or []:
            stored = await db.get_vendor_quote(quote_id)
            if stored is None or stored.get("workspace_id"):
                raise ValueError(f"devis introuvable : {quote_id}")
            vendor = await db.get_vendor(stored["vendor_id"])
            vendor_quotes.append({"vendor_name": vendor["name"] if vendor else "Unknown", "items": stored["items"]})
        if not vendor_quotes:
            raise ValueError("vendor_quotes ou quote_ids requis")

        # Create financial proposal
        proposal = await db.create_proposal(
            rfp_id=rfp_id,
            proposal_type="financial",
            title=f"Financial Proposal — {rfp['title']}",
        )

        item_count = 0
        sort_order = 0

        for quote in vendor_quotes:
            vendor_name = quote.get("vendor_name", "Unknown")
            vendor = await db.get_vendor_by_name(vendor_name)
            vendor_id = vendor["id"] if vendor else None

            for item in quote.get("items", []):
                await db.add_bom_item(
                    proposal_id=proposal["id"],
                    category=item.get("category", "general"),
                    item_name=item.get("item_name", "Unknown Item"),
                    unit_cost=float(item.get("unit_cost", 0)),
                    description=item.get("description", ""),
                    vendor_id=vendor_id,
                    manufacturer=item.get("manufacturer", vendor_name),
                    part_number=item.get("part_number", ""),
                    quantity=float(item.get("quantity", 1)),
                    unit=item.get("unit", "unit"),
                    margin_pct=default_margin_pct,
                    warranty_months=item.get("warranty_months", 12),
                    sort_order=sort_order,
                )
                item_count += 1
                sort_order += 1

        # Get totals
        totals = await db.get_bom_totals(proposal["id"])

        logger.info("Built BOM for RFP %s: %d items, total=%.2f", rfp_id, item_count, totals["total"])

        return {
            "proposal_id": proposal["id"],
            "item_count": item_count,
            "subtotal": totals["total"],
            "by_category": totals["by_category"],
            "currency": default_currency,
        }

    @mcp.tool()
    async def calculate_final_pricing(
        proposal_id: str, margin_rules: dict | None = None
    ) -> dict:
        """Calculate final pricing for a financial proposal with margin adjustments.

        Applies margin rules per category and recalculates all totals. The SQLite
        computed column handles the total_cost calculation automatically.

        Args:
            proposal_id: ID of the financial proposal
            margin_rules: Optional dict mapping category names to margin percentages.
                         Example: {"hardware": 12, "software": 20, "services": 25}

        Returns:
            Dict with total, by_category breakdown, currency, and item_count
        """
        proposal = await db.get_proposal(proposal_id)
        if not proposal:
            raise ValueError(f"Proposal not found: {proposal_id}")

        bom_items = await db.get_bom_for_proposal(proposal_id)
        if not bom_items:
            raise ValueError(f"No BOM items found for proposal {proposal_id}")

        # Apply margin rules if provided
        if margin_rules:
            for item in bom_items:
                category = item.get("category", "").lower()
                if category in margin_rules:
                    new_margin = margin_rules[category]
                    if item["margin_pct"] != new_margin:
                        await db.update_bom_item(item["id"], margin_pct=new_margin)

        # Re-fetch totals after margin updates
        totals = await db.get_bom_totals(proposal_id)

        logger.info("Calculated pricing for proposal %s: total=%.2f", proposal_id, totals["total"])

        return {
            "proposal_id": proposal_id,
            "total": totals["total"],
            "by_category": totals["by_category"],
            "item_count": totals["item_count"],
            "currency": default_currency,
            "margin_rules_applied": margin_rules or {"default": default_margin_pct},
        }

    @mcp.tool()
    async def generate_financial_proposal(rfp_id: str, proposal_id: str) -> str:
        """Generate a complete financial proposal DOCX with pricing tables and terms.

        Also generates a BOM spreadsheet (XLSX) alongside the DOCX document.

        Args:
            rfp_id: ID of the parsed RFP
            proposal_id: ID of the financial proposal (with BOM items)

        Returns:
            File path to the generated financial proposal DOCX
        """
        rfp = await db.get_rfp_in_workspace(rfp_id, None)
        if not rfp:
            raise ValueError(f"RFP not found: {rfp_id}")

        proposal = await db.get_proposal(proposal_id)
        if not proposal:
            raise ValueError(f"Proposal not found: {proposal_id}")

        bom_items = await db.get_bom_for_proposal(proposal_id)
        if not bom_items:
            raise ValueError(f"No BOM items found for proposal {proposal_id}")

        metadata = {
            "client": rfp["client"],
            "company": company_name,
            "rfp_number": rfp.get("rfp_number", ""),
            "rfp_id": rfp_id,
            "title": rfp["title"],
            "currency": default_currency,
        }

        # Generate DOCX
        docx_path = docwriter.create_financial_proposal(bom_items, metadata)

        # Also generate BOM spreadsheet
        xlsx_path = docwriter.create_bom_spreadsheet(bom_items, metadata)

        # Update proposal with output path
        await db.update_proposal(proposal_id, output_path=docx_path, status="review")

        logger.info("Generated financial proposal: %s (BOM: %s)", docx_path, xlsx_path)
        return docx_path
