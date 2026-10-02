from __future__ import annotations

import asyncio
import json

import httpx
import pytest

from gsms_core.mcp_gateway.client import McpClient, McpError, build_clients
from gsms_core.mcp_gateway.registry import ToolNotAllowed


class FakeMcpServer:
    def __init__(self, sse: bool = False, tool_error: bool = False):
        self.sse = sse
        self.tool_error = tool_error
        self.requests: list[httpx.Request] = []

    def __call__(self, req: httpx.Request) -> httpx.Response:
        self.requests.append(req)
        assert req.headers["Authorization"] == "Bearer mcp-token"
        msg = json.loads(req.content)
        if "id" not in msg:
            return httpx.Response(202)
        if msg["method"] == "initialize":
            result = {"protocolVersion": "2025-06-18", "serverInfo": {"name": "tenderai"}, "capabilities": {}}
            return httpx.Response(
                200,
                json={"jsonrpc": "2.0", "id": msg["id"], "result": result},
                headers={"Mcp-Session-Id": "sess-1"},
            )
        assert req.headers["Mcp-Session-Id"] == "sess-1"
        if msg["params"]["name"] == "explode":
            return httpx.Response(
                200,
                json={"jsonrpc": "2.0", "id": msg["id"], "error": {"code": -32602, "message": "bad args"}},
            )
        result = {
            "content": [{"type": "text", "text": json.dumps(msg["params"]["arguments"])}],
            "isError": self.tool_error,
        }
        reply = {"jsonrpc": "2.0", "id": msg["id"], "result": result}
        if self.sse:
            progress = json.dumps({"jsonrpc": "2.0", "method": "notifications/progress"})
            body = f"event: message\ndata: {progress}\n\n"
            body += f"event: message\ndata: {json.dumps(reply)}\n\n"
            return httpx.Response(200, text=body, headers={"content-type": "text/event-stream"})
        return httpx.Response(200, json=reply)


def _client(server: FakeMcpServer, **kw) -> McpClient:
    return McpClient(
        "tenderai", "http://tenderai.test/mcp", "mcp-token", transport=httpx.MockTransport(server), **kw
    )


@pytest.mark.parametrize("sse", [False, True])
def test_initialize_then_call_tool(sse):
    server = FakeMcpServer(sse=sse)

    async def run():
        async with _client(server) as mcp:
            return await mcp.call_tool(
                "parse_tender_rfp", {"file_url": "https://minio/presigned"}, correlation_id="corr-9"
            )

    result = asyncio.run(run())
    assert json.loads(result["content"][0]["text"]) == {"file_url": "https://minio/presigned"}
    methods = [json.loads(r.content)["method"] for r in server.requests]
    assert methods == ["initialize", "notifications/initialized", "tools/call"]
    assert server.requests[-1].headers["X-GSMS-Correlation-Id"] == "corr-9"


def test_whitelist_rejects_without_network_call():
    server = FakeMcpServer()

    async def run():
        async with _client(server) as mcp:
            await mcp.call_tool("delete_everything", {})

    with pytest.raises(ToolNotAllowed):
        asyncio.run(run())
    assert server.requests == []


def test_rpc_and_tool_errors_raise():
    async def run(server, tool):
        async with _client(
            server, allowed_tools={"tenderai": frozenset({"explode", "parse_tender_rfp"})}
        ) as mcp:
            await mcp.call_tool(tool, {})

    with pytest.raises(McpError, match="bad args"):
        asyncio.run(run(FakeMcpServer(), "explode"))
    with pytest.raises(McpError):
        asyncio.run(run(FakeMcpServer(tool_error=True), "parse_tender_rfp"))


def test_build_clients_from_settings(settings):
    clients = build_clients(settings)
    assert set(clients) == {"tenderai", "lexsocket"}
    assert clients["lexsocket"].url == settings.lexsocket_mcp_url
    for c in clients.values():
        asyncio.run(c.aclose())
