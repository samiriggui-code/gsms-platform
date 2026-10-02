from __future__ import annotations

from typing import Any
from urllib.parse import quote

from gsms_core.connectors.base import BaseConnector, CallContext


class CrmClient(BaseConnector):
    system = "crm"

    def get_company(self, ctx: CallContext, company_id: str) -> dict[str, Any]:
        return self.request("GET", f"/api/companies/{quote(company_id, safe='')}", ctx)

    def get_deal(self, ctx: CallContext, deal_id: str) -> dict[str, Any]:
        return self.request("GET", f"/api/deals/{quote(deal_id, safe='')}", ctx)
