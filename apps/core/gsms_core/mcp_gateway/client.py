"""Client MCP minimal (transport streamable-http) : JSON-RPC 2.0 sur HTTP POST, auth Bearer.

Supporte une réponse ``application/json`` ou un flux ``text/event-stream`` (on lit les lignes ``data:``
jusqu'à la réponse portant notre ``id``). Session : en-tête ``Mcp-Session-Id`` renvoyé par ``initialize``.
"""

from __future__ import annotations

import itertools
import json
from typing import Any

import httpx

from gsms_core.mcp_gateway.registry import ALLOWED_TOOLS, check_allowed
from gsms_core.settings import Settings

PROTOCOL_VERSION = "2025-06-18"


class McpError(RuntimeError):
    def __init__(self, message: str, code: int | None = None, data: Any = None) -> None:
        super().__init__(message)
        self.code = code
        self.data = data


class McpClient:
    def __init__(
        self,
        server: str,
        url: str,
        token: str | None = None,
        *,
        timeout: float = 60.0,
        transport: httpx.AsyncBaseTransport | None = None,
        allowed_tools: dict[str, frozenset[str]] | None = None,
    ) -> None:
        self.server = server
        self.url = url
        headers = {"Accept": "application/json, text/event-stream", "Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self._http = httpx.AsyncClient(headers=headers, timeout=timeout, transport=transport)
        self._ids = itertools.count(1)
        self._allowed = allowed_tools or ALLOWED_TOOLS
        self.session_id: str | None = None
        self.server_info: dict[str, Any] | None = None

    async def aclose(self) -> None:
        await self._http.aclose()

    async def __aenter__(self) -> McpClient:
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self.aclose()

    def _headers(self, correlation_id: str | None) -> dict[str, str]:
        h: dict[str, str] = {}
        if self.session_id:
            h["Mcp-Session-Id"] = self.session_id
            h["MCP-Protocol-Version"] = PROTOCOL_VERSION
        if correlation_id:
            h["X-GSMS-Correlation-Id"] = correlation_id
        return h

    async def _rpc(
        self, method: str, params: dict[str, Any] | None, correlation_id: str | None = None
    ) -> Any:
        req_id = next(self._ids)
        payload = {"jsonrpc": "2.0", "id": req_id, "method": method, "params": params or {}}
        try:
            resp = await self._http.post(self.url, json=payload, headers=self._headers(correlation_id))
        except httpx.HTTPError as exc:
            raise McpError(f"{self.server}: transport {exc}") from exc
        if resp.status_code >= 400:
            raise McpError(f"{self.server}: HTTP {resp.status_code}", code=resp.status_code)
        if sid := resp.headers.get("mcp-session-id"):
            self.session_id = sid
        message = self._extract(resp, req_id)
        if "error" in message:
            err = message["error"] or {}
            raise McpError(f"{self.server}: {err.get('message', 'erreur')}", err.get("code"), err.get("data"))
        return message.get("result")

    @staticmethod
    def _extract(resp: httpx.Response, req_id: int) -> dict[str, Any]:
        ctype = resp.headers.get("content-type", "")
        if ctype.startswith("text/event-stream"):
            for line in resp.text.splitlines():
                if not line.startswith("data:"):
                    continue
                try:
                    msg = json.loads(line[5:].strip())
                except json.JSONDecodeError:
                    continue
                if isinstance(msg, dict) and msg.get("id") == req_id:
                    return msg
            raise McpError("réponse SSE sans message pour la requête")
        try:
            msg = resp.json()
        except ValueError as exc:
            raise McpError("réponse JSON invalide") from exc
        if not isinstance(msg, dict) or msg.get("id") != req_id:
            raise McpError("réponse JSON-RPC inattendue")
        return msg

    async def initialize(self) -> dict[str, Any]:
        result = await self._rpc(
            "initialize",
            {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {},
                "clientInfo": {"name": "gsms-core", "version": "0.1.0"},
            },
        )
        self.server_info = result or {}
        # Notification (sans id) : le serveur répond 202 sans corps.
        await self._http.post(
            self.url,
            json={"jsonrpc": "2.0", "method": "notifications/initialized"},
            headers=self._headers(None),
        )
        return self.server_info

    async def call_tool(
        self, name: str, arguments: dict[str, Any] | None = None, *, correlation_id: str | None = None
    ) -> dict[str, Any]:
        check_allowed(self.server, name, self._allowed)  # avant tout appel réseau
        if self.server_info is None:
            await self.initialize()
        result = await self._rpc("tools/call", {"name": name, "arguments": arguments or {}}, correlation_id)
        if isinstance(result, dict) and result.get("isError"):
            texts = [c.get("text", "") for c in result.get("content", []) if isinstance(c, dict)]
            raise McpError(f"{self.server}.{name}: {' '.join(texts) or 'erreur outil'}")
        return result or {}


def build_clients(
    settings: Settings, transport: httpx.AsyncBaseTransport | None = None
) -> dict[str, McpClient]:
    return {
        "tenderai": McpClient(
            "tenderai", settings.tenderai_mcp_url, settings.tenderai_mcp_token, transport=transport
        ),
        "lexsocket": McpClient(
            "lexsocket", settings.lexsocket_mcp_url, settings.lexsocket_mcp_token, transport=transport
        ),
    }
