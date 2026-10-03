"""Client HTTP de base : chaque appel porte le contexte GSMS (invariant 3, §6) et est journalisé."""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

import httpx

log = logging.getLogger("gsms_core.connectors")


@dataclass(frozen=True)
class CallContext:
    workspace_id: uuid.UUID | str
    actor: str
    mission_id: uuid.UUID | str | None = None
    client_id: uuid.UUID | str | None = None
    site_id: uuid.UUID | str | None = None
    engagement_id: uuid.UUID | str | None = None
    tenant_id: uuid.UUID | str | None = None
    correlation_id: str = field(default_factory=lambda: uuid.uuid4().hex)

    def headers(self) -> dict[str, str]:
        h = {
            "X-GSMS-Workspace-Id": str(self.workspace_id),
            "X-GSMS-Actor": self.actor,
            "X-GSMS-Correlation-Id": self.correlation_id,
        }
        if self.mission_id:
            h["X-GSMS-Mission-Id"] = str(self.mission_id)
        if self.engagement_id:
            h["X-GSMS-Engagement-Id"] = str(self.engagement_id)
            h.setdefault("X-GSMS-Mission-Id", str(self.engagement_id))
        if self.client_id:
            h["X-GSMS-Client-Id"] = str(self.client_id)
        if self.site_id:
            h["X-GSMS-Site-Id"] = str(self.site_id)
        if self.tenant_id:
            h["X-GSMS-Tenant-Id"] = str(self.tenant_id)
        return h


@dataclass(frozen=True)
class CallRecord:
    system: str
    method: str
    path: str
    status: int | None
    duration_ms: float
    correlation_id: str


class ConnectorError(RuntimeError):
    def __init__(self, system: str, message: str, status: int | None = None) -> None:
        super().__init__(f"[{system}] {message}")
        self.system = system
        self.status = status


CallLogger = Callable[[CallRecord, CallContext], None]


class BaseConnector:
    system: str = "base"

    def __init__(
        self,
        base_url: str,
        token: str | None = None,
        *,
        timeout: float = 10.0,
        transport: httpx.BaseTransport | None = None,
        on_call: CallLogger | None = None,
    ) -> None:
        headers = {"Accept": "application/json", "User-Agent": "gsms-core/0.1"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self._client = httpx.Client(
            base_url=base_url.rstrip("/"), headers=headers, timeout=timeout, transport=transport
        )
        self._on_call = on_call

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> BaseConnector:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def request(self, method: str, path: str, ctx: CallContext, **kwargs: Any) -> Any:
        start = time.perf_counter()
        status: int | None = None
        try:
            headers = {**ctx.headers(), **(kwargs.pop("headers", None) or {})}
            resp = self._client.request(method, path, headers=headers, **kwargs)
            status = resp.status_code
            if resp.status_code >= 400:
                raise ConnectorError(
                    self.system, f"{method} {path} → HTTP {resp.status_code}", resp.status_code
                )
            return resp.json() if resp.content else None
        except httpx.HTTPError as exc:
            raise ConnectorError(self.system, f"{method} {path} : {exc}") from exc
        finally:
            rec = CallRecord(
                self.system,
                method,
                path,
                status,
                round((time.perf_counter() - start) * 1000, 2),
                ctx.correlation_id,
            )
            log.info(
                "connector call %s %s %s -> %s (%sms) corr=%s",
                rec.system,
                method,
                path,
                status,
                rec.duration_ms,
                rec.correlation_id,
            )
            if self._on_call:
                self._on_call(rec, ctx)


def unwrap_list(payload: Any, *keys: str) -> list[dict[str, Any]]:
    """Accepte ``[...]`` ou ``{"items"|"data"|"findings": [...]}``."""
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in (*keys, "items", "data", "results"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
    raise ConnectorError("parse", "réponse inattendue : liste attendue")
