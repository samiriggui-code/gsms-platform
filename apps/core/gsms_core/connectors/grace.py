from __future__ import annotations

from typing import Any

from gsms_core.connectors.base import BaseConnector, CallContext, unwrap_list
from gsms_core.connectors.normalizer import FindingNormalizer, NormalizationResult


class GraceClient(BaseConnector):
    system = "grace"

    def __init__(self, *args: Any, normalizer: FindingNormalizer | None = None, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.normalizer = normalizer or FindingNormalizer()

    def list_findings(
        self,
        ctx: CallContext,
        *,
        client_id: str | None = None,
        site_id: str | None = None,
        status: str | None = None,
    ) -> NormalizationResult:
        params = {
            k: v for k, v in {"client_id": client_id, "site_id": site_id, "status": status}.items() if v
        }
        payload = self.request("GET", "/api/findings", ctx, params=params)
        return self.normalizer.normalize(unwrap_list(payload, "findings"))
