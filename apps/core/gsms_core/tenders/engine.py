"""Moteur AO : le Core transmet un dossier WS-AO au MCP Appel d'offres (``ao_workspace_load``).

Le Core reste la source de vérité : il envoie l'identifiant du workspace, la référence et les pièces du
coffre-fort (en base64, 20 Mo au plus par pièce). Le MCP contrôle et renvoie les capacités disponibles. La
liaison d'application ``tender`` passe alors de ``pending:…`` à ACTIVE, avec l'identifiant de l'espace côté
MCP. L'état du dernier appel est gardé dans les métadonnées de la liaison.

Un MCP absent, mal configuré ou en erreur ne casse jamais les écrans : l'état passe « indisponible », avec le
motif, et le reste du dossier fonctionne normalement.
"""

from __future__ import annotations

import base64
import json
import logging
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.audit.service import record
from gsms_core.context.applications import ApplicationId
from gsms_core.context.models import BindingStatus, WorkspaceApplicationBinding
from gsms_core.context.workspace_manager import WorkspaceManager
from gsms_core.db import utcnow
from gsms_core.documents.models import Blob, Document, DocumentStatus, DocumentVersion
from gsms_core.identity.models import Workspace
from gsms_core.mcp_gateway.client import McpClient, McpError
from gsms_core.missions.uri import core_uri
from gsms_core.settings import Settings
from gsms_core.tenders import views
from gsms_core.tenders.dossier import REFERENCE_PREFIX
from gsms_core.tenders.models import TenderCase
from gsms_core.vault.storage import Vault

log = logging.getLogger("gsms_core.tenders.engine")

TOOL = "ao_workspace_load"
MAX_FILE_BYTES = 20 * 1024 * 1024
# Un chargement reste une seule requête HTTP raisonnable ; au-delà, les pièces suivantes ne partent pas.
MAX_TOTAL_BYTES = 120 * 1024 * 1024
TIMEOUT_SECONDS = 120.0

CONNECTED = "connecte"
UNAVAILABLE = "indisponible"
NOT_CONFIGURED = "non_configure"
NEVER = "jamais"

STATUS_LABELS = {
    CONNECTED: "Moteur AO connecté",
    UNAVAILABLE: "Moteur AO indisponible",
    NOT_CONFIGURED: "Moteur AO non configuré",
    NEVER: "Dossier pas encore transmis au moteur AO",
}


def _binding(session: Session, case: TenderCase) -> WorkspaceApplicationBinding | None:
    return session.scalar(
        select(WorkspaceApplicationBinding).where(
            WorkspaceApplicationBinding.gsms_workspace_id == case.workspace_id,
            WorkspaceApplicationBinding.application_id == ApplicationId.TENDER.value,
        )
    )


def engine_state(session: Session, case: TenderCase, settings: Settings) -> dict[str, Any]:
    """État affiché dans le portail, sans appel réseau."""
    binding = _binding(session, case)
    stored = dict(((binding.metadata_ or {}).get("engine") or {}) if binding else {})
    status = stored.get("status") or (NEVER if settings.tenderai_mcp_token else NOT_CONFIGURED)
    if status != CONNECTED and not settings.tenderai_mcp_token:
        status = NOT_CONFIGURED
    ws = session.get(Workspace, case.workspace_id)
    return {
        "status": status,
        "label": STATUS_LABELS[status],
        "connected": status == CONNECTED,
        "configured": bool(settings.tenderai_mcp_token),
        "reference": ws.reference if ws else None,
        "binding_status": binding.status.value if binding else None,
        "last_call_at": stored.get("last_call_at"),
        "last_success_at": stored.get("last_success_at"),
        "last_error": stored.get("last_error"),
        "documents_sent": stored.get("documents_sent", 0),
        "documents_rejected": stored.get("documents_rejected", []),
        "documents_skipped": stored.get("documents_skipped", []),
        "capabilities": stored.get("capabilities", []),
    }


def _pieces(
    session: Session, vault: Vault, case: TenderCase
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    """Pièces du dossier (dernière version, déchiffrée) en base64 ; trop volumineuses = non envoyées."""
    docs = list(
        session.scalars(
            select(Document)
            .where(
                Document.workspace_id == case.workspace_id,
                Document.mission_id == case.mission_id,
                Document.status != DocumentStatus.ARCHIVED,
                Document.current_version_id.is_not(None),
            )
            .order_by(Document.created_at)
        )
    )
    if not docs:
        return [], []
    rows = session.execute(
        select(DocumentVersion, Blob)
        .join(Blob, Blob.id == DocumentVersion.blob_id)
        .where(DocumentVersion.id.in_([d.current_version_id for d in docs]))
    )
    blobs = {v.document_id: b for v, b in rows}
    digest = views.digest_of(session, case.workspace_id)
    kinds = {d.document_id: d.business_type for d in (digest.documents if digest else [])}

    payload: list[dict[str, Any]] = []
    skipped: list[dict[str, str]] = []
    total = 0
    for doc in docs:
        blob = blobs.get(doc.id)
        if blob is None:
            continue
        if blob.size > MAX_FILE_BYTES:
            skipped.append({"filename": doc.title, "reason": "pièce de plus de 20 Mo, non transmise"})
            continue
        if total + blob.size > MAX_TOTAL_BYTES:
            skipped.append({"filename": doc.title, "reason": "volume total du chargement atteint"})
            continue
        content = b"".join(vault.iter_plaintext(session, blob))
        total += len(content)
        payload.append(
            {
                "filename": doc.title,
                "content_base64": base64.b64encode(content).decode("ascii"),
                "sha256": blob.sha256,
                "mime": blob.mime,
                "document_id": str(doc.id),
                "kind": kinds.get(doc.id) or doc.doc_type,
            }
        )
    return payload, skipped


def _tool_payload(result: dict[str, Any]) -> dict[str, Any]:
    """Résultat d'un outil MCP : contenu structuré s'il existe, sinon le JSON du premier bloc texte."""
    structured = result.get("structuredContent")
    if isinstance(structured, dict):
        inner = structured.get("result")
        return inner if set(structured) == {"result"} and isinstance(inner, dict) else structured
    for block in result.get("content") or []:
        if isinstance(block, dict) and isinstance(block.get("text"), str):
            try:
                parsed = json.loads(block["text"])
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                return parsed
    raise McpError("réponse du moteur AO illisible")


def _save_state(
    session: Session, case: TenderCase, state: dict[str, Any], *, external_id: str | None
) -> WorkspaceApplicationBinding:
    binding = _binding(session, case)
    previous = dict(binding.metadata_ or {}) if binding else {}
    engine = {**(previous.get("engine") or {}), **state}
    metadata = {**previous, "engine": engine}
    manager = WorkspaceManager(session)
    if external_id is not None:
        return manager.attach_application(
            workspace_id=case.workspace_id,
            application_id=ApplicationId.TENDER,
            external_workspace_id=external_id,
            mission_id=case.mission_id,
            status=BindingStatus.ACTIVE,
            metadata=metadata,
        )
    if binding is None:
        return manager.attach_application(
            workspace_id=case.workspace_id,
            application_id=ApplicationId.TENDER,
            external_workspace_id=f"pending:{ApplicationId.TENDER.value}:{case.mission_id}",
            mission_id=case.mission_id,
            status=BindingStatus.PENDING,
            metadata=metadata,
        )
    # Échec : la liaison garde son statut (une liaison déjà active reste valable), seul l'état change.
    binding.metadata_ = metadata
    binding.updated_at = utcnow()
    session.add(binding)
    session.flush()
    return binding


async def load_case(
    session: Session,
    vault: Vault,
    settings: Settings,
    case: TenderCase,
    *,
    actor: str,
    transport: httpx.AsyncBaseTransport | None = None,
) -> dict[str, Any]:
    """Transmet le dossier au moteur AO et enregistre le résultat ; ne lève jamais pour une panne du MCP."""
    now = utcnow().isoformat()
    ws = session.get(Workspace, case.workspace_id)
    reference = ws.reference if ws else None

    if not settings.tenderai_mcp_token:
        _save_state(
            session,
            case,
            {"status": NOT_CONFIGURED, "last_call_at": now, "last_error": None},
            external_id=None,
        )
        return engine_state(session, case, settings)
    if not reference or not reference.startswith(f"{REFERENCE_PREFIX}-"):
        _save_state(
            session,
            case,
            {
                "status": UNAVAILABLE,
                "last_call_at": now,
                "last_error": "dossier sans référence WS-AO : créez-le depuis « Nouveau dossier AO »",
            },
            external_id=None,
        )
        return engine_state(session, case, settings)

    documents, skipped = _pieces(session, vault, case)
    client = McpClient(
        "tenderai",
        settings.tenderai_mcp_url,
        settings.tenderai_mcp_token,
        timeout=TIMEOUT_SECONDS,
        transport=transport,
    )
    try:
        raw = await client.call_tool(
            TOOL,
            {"workspace_id": str(case.workspace_id), "reference": reference, "documents": documents},
            correlation_id=str(case.workspace_id),
        )
        out = _tool_payload(raw)
        mcp_workspace_id = str(out.get("mcp_workspace_id") or "")
        if not mcp_workspace_id:
            raise McpError("le moteur AO n'a pas renvoyé d'identifiant d'espace")
    except (McpError, httpx.HTTPError, ValueError) as exc:
        log.warning("moteur AO indisponible pour %s : %s", reference, exc)
        _save_state(
            session,
            case,
            {
                "status": UNAVAILABLE,
                "last_call_at": now,
                "last_error": _public_error(exc),
                "documents_skipped": skipped,
            },
            external_id=None,
        )
        _audit(session, case, actor, reference, ok=False, sent=0)
        return engine_state(session, case, settings)
    finally:
        await client.aclose()

    capabilities = [
        {"key": str(c.get("key")), "label": str(c.get("label") or c.get("key"))}
        for c in out.get("capabilities") or []
        if isinstance(c, dict) and c.get("key")
    ]
    sent = len(out.get("documents") or [])
    _save_state(
        session,
        case,
        {
            "status": CONNECTED,
            "last_call_at": now,
            "last_success_at": now,
            "last_error": None,
            "mcp_workspace_id": mcp_workspace_id,
            "documents_sent": sent,
            "documents_rejected": [
                {"filename": str(r.get("filename")), "reason": str(r.get("reason"))}
                for r in out.get("rejected") or []
                if isinstance(r, dict)
            ],
            "documents_skipped": skipped,
            "capabilities": capabilities,
        },
        external_id=mcp_workspace_id,
    )
    _audit(session, case, actor, reference, ok=True, sent=sent)
    return engine_state(session, case, settings)


def _public_error(exc: Exception) -> str:
    """Motif lisible, sans détail technique sensible (URL interne, jeton)."""
    if isinstance(exc, McpError) and exc.code in (401, 403):
        return "accès refusé par le moteur AO : vérifiez le jeton partagé"
    if isinstance(exc, McpError) and str(exc).startswith("tenderai: transport"):
        return "moteur AO injoignable"
    text = str(exc).removeprefix("tenderai: ").removeprefix(f"tenderai.{TOOL}: ")
    return text[:300] or "erreur du moteur AO"


def _audit(session: Session, case: TenderCase, actor: str, reference: str, *, ok: bool, sent: int) -> None:
    record(
        session,
        actor=actor,
        action="tender.engine.load",
        subject_uri=core_uri("mission", case.mission_id),
        workspace_id=case.workspace_id,
        after={"reference": reference, "status": CONNECTED if ok else UNAVAILABLE, "documents": sent},
    )
