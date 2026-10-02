from __future__ import annotations

import json

from gsms_core.security import sign_hmac_sha256
from tests.conftest import WEBHOOK_SECRET


def finding_event(workspace_id: str, *, severity: str = "majeure", fid: str = "4f2a", **data) -> dict:
    return {
        "type": "grace.finding.created",
        "subject": f"grace://finding/{fid}",
        "workspace_id": workspace_id,
        "occurred_at": "2026-10-01T09:00:00Z",
        "data": {
            "severity": severity,
            "status": "non_conforme",
            "title": "Extincteurs non vérifiés",
            "control_ref": "ctrl-incendie-extincteurs-01",
            **data,
        },
    }


def post_signed(client, payload: dict, source: str = "grace", secret: str = WEBHOOK_SECRET, signature=None):
    body = json.dumps(payload).encode()
    sig = signature if signature is not None else sign_hmac_sha256(secret, body)
    return client.post(
        f"/api/v1/events/ingest/{source}",
        content=body,
        headers={"Content-Type": "application/json", "X-GSMS-Signature": sig},
    )
