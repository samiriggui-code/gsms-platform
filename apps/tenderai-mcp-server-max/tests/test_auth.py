from __future__ import annotations

import pytest

from app.config import ConfigError, Settings, check_http_auth
from app.middleware.auth import BearerTokenMiddleware


def test_http_without_auth_refuses_to_start():
    with pytest.raises(ConfigError, match="MCP_API_KEY"):
        check_http_auth(Settings(transport="http"))
    with pytest.raises(ConfigError):
        check_http_auth(Settings(transport="http", mcp_api_key="   "))


def test_http_with_token_or_oauth_starts():
    check_http_auth(Settings(transport="http", mcp_api_key="secret-token"))
    check_http_auth(Settings(transport="http", oauth_issuer_url="https://mcp.example.test"))
    check_http_auth(Settings(transport="stdio"))


def test_default_model_is_a_real_identifier():
    model = Settings().llm_model
    assert model == "claude-opus-5-5"
    assert "2024" not in model


async def _request(app, headers: list[tuple[bytes, bytes]], method: str = "POST") -> int:
    sent: list[dict] = []

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        sent.append(message)

    await app({"type": "http", "method": method, "path": "/mcp", "headers": headers}, receive, send)
    return sent[0]["status"]


async def _ok_app(scope, receive, send):
    await send({"type": "http.response.start", "status": 200, "headers": []})
    await send({"type": "http.response.body", "body": b"ok"})


async def test_bearer_middleware():
    app = BearerTokenMiddleware(_ok_app, "bon-jeton")
    assert await _request(app, [(b"authorization", b"Bearer bon-jeton")]) == 200
    assert await _request(app, [(b"authorization", b"Bearer mauvais")]) == 401
    assert await _request(app, [(b"authorization", b"Bearer bon-jeto")]) == 401
    assert await _request(app, []) == 401
    assert await _request(app, [(b"authorization", b"Basic bon-jeton")]) == 401
    assert await _request(app, [], method="OPTIONS") == 200


def test_bearer_comparison_is_constant_time():
    import inspect

    source = inspect.getsource(BearerTokenMiddleware)
    assert "hmac.compare_digest" in source
