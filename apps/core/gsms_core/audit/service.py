"""Écriture et vérification du journal d'audit chaîné.

Concurrence : sur PostgreSQL, l'appel à :func:`record` doit être sérialisé (``pg_advisory_xact_lock``)
pour garantir une chaîne linéaire ; SQLite sérialise déjà les écritures.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from gsms_core.audit.models import AuditLog
from gsms_core.db import utcnow

GENESIS_HASH = "0" * 64
_AUDIT_LOCK_KEY = 0x65534D53  # "GSMS"


def _json_default(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    return str(value)


def canonical(value: Any) -> Any:
    """Normalise une valeur en JSON stable (uuid/datetime → str) pour qu'elle relise à l'identique."""
    return json.loads(json.dumps(value, default=_json_default, sort_keys=True))


def compute_hash(entry: AuditLog) -> str:
    payload = {
        "at": entry.at.isoformat(),
        "actor": entry.actor,
        "action": entry.action,
        "subject_uri": entry.subject_uri,
        "workspace_id": entry.workspace_id,
        "before": entry.before,
        "after": entry.after,
    }
    body = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256((entry.prev_hash + body).encode("utf-8")).hexdigest()


def record(
    session: Session,
    *,
    actor: str,
    action: str,
    subject_uri: str,
    workspace_id: uuid.UUID | str | None = None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
) -> AuditLog:
    if session.get_bind().dialect.name == "postgresql":
        session.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": _AUDIT_LOCK_KEY})
    last = session.scalar(select(AuditLog).order_by(AuditLog.id.desc()).limit(1))
    entry = AuditLog(
        at=utcnow(),
        actor=actor,
        action=action,
        subject_uri=subject_uri,
        workspace_id=str(workspace_id) if workspace_id else None,
        before=canonical(before) if before is not None else None,
        after=canonical(after) if after is not None else None,
        prev_hash=last.hash if last else GENESIS_HASH,
    )
    entry.hash = compute_hash(entry)
    session.add(entry)
    session.flush()
    return entry


@dataclass(frozen=True)
class ChainVerification:
    ok: bool
    checked: int
    broken_at: int | None = None
    reason: str | None = None


def verify_chain(session: Session) -> ChainVerification:
    prev = GENESIS_HASH
    checked = 0
    for entry in session.scalars(select(AuditLog).order_by(AuditLog.id)):
        if entry.prev_hash != prev:
            return ChainVerification(False, checked, entry.id, "prev_hash ne correspond pas")
        if compute_hash(entry) != entry.hash:
            return ChainVerification(False, checked, entry.id, "contenu altéré")
        prev = entry.hash
        checked += 1
    return ChainVerification(True, checked)
