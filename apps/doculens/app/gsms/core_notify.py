"""Notification HMAC vers le Core GSMS (``POST /api/v1/events/ingest/doculens``)."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


def _sign(secret: str, body: bytes) -> str:
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def notify_core(
    *,
    event_type: str,
    workspace_id: str,
    subject: str,
    data: dict[str, Any],
    mission_id: Optional[str] = None,
    event_id: Optional[str] = None,
    actor: Optional[str] = None,
) -> bool:
    """Envoie un événement signé au Core. Retourne False si non configuré ou en échec soft."""
    settings = get_settings()
    base = (settings.gsms_core_url or "").rstrip("/")
    secret = settings.gsms_core_webhook_secret
    if not base or not secret:
        logger.debug("Core notify skipped (GSMS_CORE_URL / webhook secret unset)")
        return False

    payload: dict[str, Any] = {
        "id": event_id or str(uuid.uuid4()),
        "type": event_type,
        "subject": subject,
        "workspace_id": workspace_id,
        "occurred_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "data": data,
    }
    if mission_id:
        payload["mission_id"] = mission_id
    if actor:
        payload["actor"] = actor

    body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    url = f"{base}/api/v1/events/ingest/doculens"
    request = Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-GSMS-Signature": _sign(secret, body),
        },
    )
    timeout = settings.gsms_core_timeout_seconds
    try:
        with urlopen(request, timeout=timeout) as response:  # noqa: S310 — URL from trusted settings
            status = getattr(response, "status", 200)
            if 200 <= status < 300:
                logger.info("Notified Core %s workspace=%s subject=%s", event_type, workspace_id, subject)
                return True
            logger.warning("Core notify unexpected status %s for %s", status, event_type)
            return False
    except HTTPError as exc:
        logger.warning("Core notify HTTP %s for %s: %s", exc.code, event_type, exc.reason)
        return False
    except URLError as exc:
        logger.warning("Core notify network error for %s: %s", event_type, exc.reason)
        return False
    except Exception:
        logger.exception("Core notify failed for %s", event_type)
        return False


def notify_document_ingested(
    *,
    workspace_id: str,
    document_id: str,
    doc_type: Optional[str] = None,
    filename: Optional[str] = None,
    mission_id: Optional[str] = None,
    core_document_id: Optional[str] = None,
    core_version_id: Optional[str] = None,
) -> bool:
    subject_id = core_document_id or document_id
    return notify_core(
        event_type="document.ingested",
        workspace_id=workspace_id,
        subject=f"document://{subject_id}",
        mission_id=mission_id,
        data={
            "document_id": core_document_id or document_id,
            "doculens_document_id": document_id,
            "version_id": core_version_id,
            "doc_type": doc_type,
            "filename": filename,
        },
    )


def notify_document_classified(
    *,
    workspace_id: str,
    document_id: str,
    doc_type: str,
    confidence: Optional[float] = None,
    mission_id: Optional[str] = None,
    core_document_id: Optional[str] = None,
) -> bool:
    subject_id = core_document_id or document_id
    return notify_core(
        event_type="document.classified",
        workspace_id=workspace_id,
        subject=f"document://{subject_id}",
        mission_id=mission_id,
        data={
            "document_id": core_document_id or document_id,
            "doculens_document_id": document_id,
            "doc_type": doc_type,
            "confidence": confidence,
        },
    )
