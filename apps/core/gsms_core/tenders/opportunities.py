"""Veille AO via LexSocket MCP (``get_open_opportunities`` / ``search_tenders``)."""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from gsms_core.mcp_gateway.client import McpClient, McpError
from gsms_core.settings import Settings
from gsms_core.tenders.schemas import OpportunityOut

log = logging.getLogger("gsms_core.tenders.opportunities")


async def fetch_opportunities(
    settings: Settings,
    *,
    q: str | None = None,
    cpv: str | None = None,
    nuts: str | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
    deadline_before: str | None = None,
    transport: httpx.AsyncBaseTransport | None = None,
    correlation_id: str | None = None,
) -> list[OpportunityOut]:
    """Appelle LexSocket. Sans token / en erreur → liste vide (UI dégradée, pas 502)."""
    if not settings.lexsocket_mcp_token:
        log.info("LexSocket : token absent, veille vide")
        return []

    arguments: dict[str, Any] = {}
    if q:
        arguments["query"] = q
    if cpv:
        arguments["cpv"] = cpv
    if nuts:
        arguments["nuts"] = nuts
    if min_amount is not None:
        arguments["min_amount"] = min_amount
    if max_amount is not None:
        arguments["max_amount"] = max_amount
    if deadline_before:
        arguments["deadline_before"] = deadline_before

    tool = "search_tenders" if arguments else "get_open_opportunities"
    client = McpClient(
        "lexsocket",
        settings.lexsocket_mcp_url,
        settings.lexsocket_mcp_token,
        transport=transport,
    )
    try:
        result = await client.call_tool(tool, arguments, correlation_id=correlation_id)
        return normalize_opportunities(result)
    except (McpError, Exception) as exc:
        log.warning("veille LexSocket indisponible (%s): %s", tool, exc)
        return []
    finally:
        await client.aclose()


def normalize_opportunities(result: Any) -> list[OpportunityOut]:
    rows = _extract_rows(result)
    out: list[OpportunityOut] = []
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            continue
        title = str(row.get("title") or row.get("name") or row.get("label") or "").strip()
        if not title:
            continue
        oid = str(row.get("id") or row.get("notice_id") or row.get("reference") or f"opp-{index}")
        amount = row.get("amount") or row.get("estimated_value") or row.get("value")
        try:
            amount_f = float(amount) if amount is not None else None
        except (TypeError, ValueError):
            amount_f = None
        deadline = row.get("deadline") or row.get("submission_deadline") or row.get("closing_date")
        out.append(
            OpportunityOut(
                id=oid,
                title=title,
                buyer=_as_str(row.get("buyer") or row.get("buyer_name") or row.get("contracting_authority")),
                cpv=_as_str(row.get("cpv") or row.get("cpv_code")),
                nuts=_as_str(row.get("nuts") or row.get("location") or row.get("place")),
                amount=amount_f,
                deadline=str(deadline) if deadline is not None else None,
            )
        )
    return out


def _extract_rows(result: Any) -> list[Any]:
    if isinstance(result, list):
        return result
    if not isinstance(result, dict):
        return []
    for key in ("items", "opportunities", "tenders", "results", "data"):
        value = result.get(key)
        if isinstance(value, list):
            return value
    content = result.get("content")
    if isinstance(content, list):
        for block in content:
            if not isinstance(block, dict):
                continue
            text = block.get("text")
            if not isinstance(text, str) or not text.strip():
                continue
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                continue
            return _extract_rows(parsed)
    return []


def _as_str(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, dict):
        name = value.get("name") or value.get("label")
        return str(name) if name else None
    text = str(value).strip()
    return text or None
