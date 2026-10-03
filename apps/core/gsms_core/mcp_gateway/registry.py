"""Liste blanche des outils MCP appelables par le Core (lecture/écriture explicite, pas de joker)."""

from __future__ import annotations

ALLOWED_TOOLS: dict[str, frozenset[str]] = {
    # MCP Appel d'offres — apps/tenderai-mcp-server-max. Chaque appel porte le workspace_id du dossier.
    # generate_financial_proposal n'est pas ouvert : il exige un proposal_id produit par build_bom
    # (matériel, hors circuit sûreté). Le chiffrage arrive avec les outils ao_* de l'étape 5.
    "tenderai": frozenset(
        {
            "ao_workspace_load",
            "parse_tender_rfp",
            "generate_compliance_matrix",
            "check_submission_deadline",
            "validate_document_completeness",
            "build_full_technical_proposal",
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
