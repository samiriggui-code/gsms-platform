from __future__ import annotations

from typing import Any

from gsms_core.connectors.base import BaseConnector, CallContext, unwrap_list
from gsms_core.connectors.normalizer import FindingNormalizer, NormalizationResult


class QAtrialClient(BaseConnector):
    system = "qatrial"

    def __init__(self, *args: Any, normalizer: FindingNormalizer | None = None, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.normalizer = normalizer or FindingNormalizer()

    def list_findings(self, ctx: CallContext, *, project_id: str | None = None) -> NormalizationResult:
        params = {"project_id": project_id} if project_id else {}
        payload = self.request("GET", "/api/findings", ctx, params=params)
        return self.normalizer.normalize(unwrap_list(payload, "findings"))

    def create_capa(
        self,
        ctx: CallContext,
        *,
        project_id: str,
        title: str,
        severity: str,
        description: str | None = None,
        source_uri: str | None = None,
        due_date: str | None = None,
    ) -> dict[str, Any]:
        body = {
            "projectId": project_id,
            "title": title,
            "severity": severity,
            "description": description,
            "sourceUri": source_uri,
            "dueDate": due_date,
        }
        return self.request("POST", "/api/capa", ctx, json={k: v for k, v in body.items() if v is not None})
