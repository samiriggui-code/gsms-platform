"""Helpers d'isolation par site (workspace) pour les events JSONB."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException, status

from app.gsms.context import current_workspace_id, require_current_workspace_id


def attach_workspace(payload: dict[str, Any], workspace_id: Optional[str] = None) -> dict[str, Any]:
    """Injecte ``workspace_id`` dans le payload d'event (racine + metadata)."""
    ws = workspace_id or require_current_workspace_id()
    out = dict(payload)
    out["workspace_id"] = ws
    meta = out.get("metadata")
    if isinstance(meta, dict):
        meta = dict(meta)
    else:
        meta = {}
    meta["workspace_id"] = ws
    out["metadata"] = meta
    return out


def assert_event_workspace(event_data: Optional[dict[str, Any]], workspace_id: Optional[str] = None) -> str:
    """Vérifie qu'un event appartient au workspace courant. Retourne le workspace_id."""
    expected = workspace_id or current_workspace_id() or require_current_workspace_id()
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-GSMS-Workspace-Id est obligatoire (isolation par site).",
        )
    actual = None
    if isinstance(event_data, dict):
        actual = event_data.get("workspace_id")
        if not actual:
            meta = event_data.get("metadata")
            if isinstance(meta, dict):
                actual = meta.get("workspace_id")
    if actual != expected:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    return expected


def workspace_from_event_data(event_data: Optional[dict[str, Any]]) -> Optional[str]:
    if not isinstance(event_data, dict):
        return None
    ws = event_data.get("workspace_id")
    if ws:
        return str(ws)
    meta = event_data.get("metadata")
    if isinstance(meta, dict) and meta.get("workspace_id"):
        return str(meta["workspace_id"])
    return current_workspace_id()
