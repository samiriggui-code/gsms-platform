from __future__ import annotations

import uuid
from typing import Any
from urllib.parse import quote

from gsms_core.connectors.base import BaseConnector, CallContext, ConnectorError


class CrmClient(BaseConnector):
    system = "crm"

    def __init__(
        self,
        base_url: str,
        token: str | None = None,
        *,
        public_key: str | None = None,
        timeout: float = 10.0,
        transport=None,
        on_call=None,
    ) -> None:
        super().__init__(base_url, token, timeout=timeout, transport=transport, on_call=on_call)
        self._public_key = public_key

    def get_company(self, ctx: CallContext, company_id: str) -> dict[str, Any]:
        return self.request("GET", f"/api/companies/{quote(company_id, safe='')}", ctx)

    def get_deal(self, ctx: CallContext, deal_id: str) -> dict[str, Any]:
        return self.request("GET", f"/api/deals/{quote(deal_id, safe='')}", ctx)

    def submit_public_intake(self, ctx: CallContext, payload: dict[str, Any]) -> dict[str, Any]:
        """POST ``/api/public/{audit-request|tender-request|contact}`` avec ``x-gsms-public-key``."""
        if not self._public_key:
            raise ConnectorError(self.system, "clé publique CRM absente")

        kind = str(payload.get("type") or "audit")
        path = {
            "audit": "/api/public/audit-request",
            "ao": "/api/public/tender-request",
            "contact": "/api/public/contact",
        }.get(kind)
        if path is None:
            raise ConnectorError(self.system, f"type d'intake inconnu : {kind}")

        first = str(payload.get("firstName") or "").strip()
        last = str(payload.get("lastName") or "").strip() or None
        email = str(payload.get("email") or "").strip()
        phone = str(payload.get("phone") or "").strip() or None
        company = str(payload.get("companyName") or "").strip()
        title = str(payload.get("title") or "").strip()
        subject = str(payload.get("subject") or "").strip()
        message = str(payload.get("message") or "").strip()
        external_id = f"core-{kind}-{uuid.uuid4()}"

        facts = [
            ("mission_type", {"audit": "audit", "ao": "appel-offres", "contact": "contact"}[kind]),
            ("etablissement_type", str(payload.get("etablissement") or "").strip()),
            ("echeance_commission", str(payload.get("echeanceCommission") or "").strip()),
            ("reference_ao", str(payload.get("referenceAo") or "").strip()),
            ("cta_origine", str(payload.get("cta") or "").strip()),
            ("offre_consultee", str(payload.get("offer") or "").strip()),
        ]
        fact_block = "\n".join(f"{k}: {v}" for k, v in facts if v)
        description = "\n\n".join(
            part for part in (message, f"[GSMS_INTAKE]\n{fact_block}" if fact_block else "") if part
        )

        contact = {"email": email, "firstName": first, "lastName": last, "phone": phone}
        contact = {k: v for k, v in contact.items() if v}

        if kind == "contact":
            body: dict[str, Any] = {
                "externalId": external_id,
                "companyName": company or None,
                "subject": subject or None,
                "message": description or "Contact depuis la vitrine GSMS",
                "contact": contact,
                "honeypot": "",
            }
        elif kind == "ao":
            body = {
                "externalId": external_id,
                "companyName": company,
                "title": title or "Demande accompagnement AO",
                "description": description or None,
                "contact": contact,
                "honeypot": "",
            }
        else:
            body = {
                "externalId": external_id,
                "companyName": company,
                "title": title or "Demande d'audit de sécurité",
                "description": description or None,
                "contact": contact,
                "honeypot": "",
            }

        return self.request(
            "POST",
            path,
            ctx,
            json=body,
            headers={"x-gsms-public-key": self._public_key, "Content-Type": "application/json"},
        )
