"""Liste blanche des outils MCP appelables par le Core (lecture/écriture explicite, pas de joker)."""

from __future__ import annotations

ALLOWED_TOOLS: dict[str, frozenset[str]] = {
    # TenderAI (répondre aux AO) — apps/tenderai-mcp-server-max
    "tenderai": frozenset(
        {
            "parse_tender_rfp",
            "generate_compliance_matrix",
            "check_submission_deadline",
            "validate_document_completeness",
            "build_full_technical_proposal",
            "generate_financial_proposal",
            "search_past_proposals",
        }
    ),
    # LexSocket (veille AO) — lecture seule
    "lexsocket": frozenset(
        {
            "search_tenders",
            "get_tender",
            "get_open_opportunities",
            "browse_by_deadline",
            "search_ted",
            "get_ted_notice",
        }
    ),
}


class ToolNotAllowed(PermissionError):
    pass


def check_allowed(server: str, tool: str, registry: dict[str, frozenset[str]] | None = None) -> None:
    allowed = (registry or ALLOWED_TOOLS).get(server, frozenset())
    if tool not in allowed:
        raise ToolNotAllowed(f"outil {tool!r} non autorisé sur {server!r}")
