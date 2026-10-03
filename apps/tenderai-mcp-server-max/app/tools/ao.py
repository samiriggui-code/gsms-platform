"""Outils ``ao_*`` : moteur Appel d'offres appelé par le Core GSMS, dossier par dossier.

Le Core est la source de vérité. Il transmet l'identifiant du workspace, sa référence ``WS-AO-AAAA-NNNN`` et
les pièces (base64). Le MCP contrôle, traite et renvoie ; il ne conserve aucune pièce.
"""

from __future__ import annotations

import logging
import re
import uuid
from typing import Any

from mcp.server.fastmcp import FastMCP

from app.db.database import Database
from app.files import FileExchangeError, decode_document

logger = logging.getLogger(__name__)

REFERENCE_RE = re.compile(r"^WS-AO-\d{4}-\d{4,}$")
MAX_DOCUMENTS = 500

# Capacités ouvertes au Core à ce stade (le chiffrage arrive avec ao_engine, étape 5).
CAPABILITIES: list[dict[str, Any]] = [
    {
        "key": "workspace",
        "label": "Chargement du dossier et contrôle des pièces",
        "tools": ["ao_workspace_load"],
    },
    {
        "key": "document",
        "label": "Lecture d'un règlement de consultation",
        "tools": ["parse_tender_rfp"],
    },
    {
        "key": "deadlines",
        "label": "Jalons avant la date de remise",
        "tools": ["check_submission_deadline"],
    },
    {
        "key": "completeness",
        "label": "Contrôle des sections du mémoire",
        "tools": ["validate_document_completeness"],
    },
    {
        "key": "memory",
        "label": "Rédaction du mémoire technique",
        "tools": ["build_full_technical_proposal", "search_past_proposals"],
    },
]


class AoInputError(ValueError):
    pass


def check_workspace(workspace_id: str, reference: str | None = None) -> str:
    """Identifiant de workspace du Core (UUID) et, si fournie, référence lisible au bon format."""
    try:
        normalized = str(uuid.UUID(str(workspace_id)))
    except (ValueError, TypeError) as exc:
        raise AoInputError("workspace_id invalide : identifiant de workspace du Core attendu") from exc
    if reference is not None and not REFERENCE_RE.match(reference):
        raise AoInputError("référence invalide : format WS-AO-AAAA-NNNN attendu")
    return normalized


async def resolve_scope(db: Database, workspace_id: str | None) -> str | None:
    """Périmètre d'un appel : ``None`` (usage autonome) ou un espace déjà chargé par ao_workspace_load."""
    if not workspace_id:
        return None
    ws_id = check_workspace(workspace_id)
    if await db.get_ao_workspace(ws_id) is None:
        raise AoInputError("dossier non chargé : appelez d'abord ao_workspace_load")
    return ws_id


async def load_workspace(
    db: Database,
    *,
    workspace_id: str,
    reference: str,
    documents: list[dict[str, Any]] | None,
    max_bytes: int,
) -> dict[str, Any]:
    ws_id = check_workspace(workspace_id, reference)
    documents = documents or []
    if len(documents) > MAX_DOCUMENTS:
        raise AoInputError(f"trop de pièces : {MAX_DOCUMENTS} au plus par chargement")

    received: list[dict[str, Any]] = []
    rejected: list[dict[str, str]] = []
    for doc in documents:
        name = str(doc.get("filename") or "?") if isinstance(doc, dict) else "?"
        try:
            inbound = decode_document(doc, max_bytes)
        except FileExchangeError as exc:
            rejected.append({"filename": name, "reason": str(exc)})
            continue
        received.append(
            {
                "filename": inbound.filename,
                "document_id": doc.get("document_id"),
                "kind": doc.get("kind"),
                "size": inbound.size,
                "sha256": inbound.sha256,
                "mime": inbound.mime,
            }
        )

    try:
        space = await db.load_ao_workspace(
            workspace_id=ws_id, reference=reference, document_count=len(received)
        )
    except ValueError as exc:
        raise AoInputError(str(exc)) from exc
    logger.info(
        "Espace AO chargé : %s (%s) — %d pièces reçues, %d refusées",
        reference, ws_id, len(received), len(rejected),
    )
    return {
        "mcp_workspace_id": space["id"],
        "workspace_id": ws_id,
        "reference": reference,
        "documents": received,
        "rejected": rejected,
        "capabilities": CAPABILITIES,
        "max_file_mb": max_bytes // (1024 * 1024),
        "loaded_at": space["last_loaded_at"],
    }


def register_ao_tools(mcp: FastMCP, db: Database, max_bytes: int) -> None:
    @mcp.tool()
    async def ao_workspace_load(
        workspace_id: str, reference: str, documents: list[dict] | None = None
    ) -> dict:
        """Charge un dossier d'appel d'offres du Core GSMS et renvoie les capacités disponibles.

        Premier outil à appeler pour un dossier. Les pièces sont contrôlées (taille, empreinte) puis
        oubliées : le Core reste le stockage de référence.

        Args:
            workspace_id: identifiant du workspace du dossier dans le Core (UUID)
            reference: référence lisible du dossier, format WS-AO-AAAA-NNNN
            documents: pièces du coffre-fort, chacune {filename, content_base64, sha256, mime,
                document_id, kind} ; 20 Mo au plus par pièce

        Returns:
            mcp_workspace_id, pièces reçues et refusées (avec le motif), capacités disponibles
        """
        return await load_workspace(
            db, workspace_id=workspace_id, reference=reference, documents=documents, max_bytes=max_bytes
        )
