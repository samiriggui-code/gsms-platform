"""HMAC Core notify (document.ingested / document.classified)."""

from __future__ import annotations

import hashlib
import hmac
import json
from unittest.mock import MagicMock, patch

from app.config.settings import get_settings
from app.gsms.core_notify import notify_document_classified, notify_document_ingested, notify_core


def test_notify_skipped_when_unconfigured(monkeypatch):
    monkeypatch.delenv("GSMS_CORE_URL", raising=False)
    monkeypatch.delenv("GSMS_CORE_WEBHOOK_SECRET", raising=False)
    get_settings.cache_clear()
    assert notify_document_ingested(workspace_id="ws", document_id="doc-1") is False


def test_notify_signs_body_and_posts(monkeypatch):
    monkeypatch.setenv("GSMS_CORE_URL", "https://gsms-security.com")
    monkeypatch.setenv("GSMS_CORE_WEBHOOK_SECRET", "hmac-secret")
    get_settings.cache_clear()

    captured = {}

    class FakeResponse:
        status = 202

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    def fake_urlopen(request, timeout=10):
        captured["url"] = request.full_url
        captured["headers"] = dict(request.header_items())
        captured["body"] = request.data
        return FakeResponse()

    with patch("app.gsms.core_notify.urlopen", side_effect=fake_urlopen):
        ok = notify_document_classified(
            workspace_id="11111111-1111-1111-1111-111111111111",
            document_id="doc-42",
            doc_type="registre_securite",
            confidence=0.91,
        )

    assert ok is True
    assert captured["url"].endswith("/api/v1/events/ingest/doculens")
    body = captured["body"]
    expected_sig = "sha256=" + hmac.new(b"hmac-secret", body, hashlib.sha256).hexdigest()
    headers = {k.lower(): v for k, v in captured["headers"].items()}
    assert headers.get("x-gsms-signature") == expected_sig
    payload = json.loads(body.decode("utf-8"))
    assert payload["type"] == "document.classified"
    assert payload["workspace_id"] == "11111111-1111-1111-1111-111111111111"
    assert payload["data"]["doc_type"] == "registre_securite"


def test_notify_soft_fails_on_http_error(monkeypatch):
    monkeypatch.setenv("GSMS_CORE_URL", "https://gsms-security.com")
    monkeypatch.setenv("GSMS_CORE_WEBHOOK_SECRET", "hmac-secret")
    get_settings.cache_clear()

    from urllib.error import HTTPError
    from io import BytesIO

    def boom(request, timeout=10):
        raise HTTPError(request.full_url, 500, "err", hdrs=None, fp=BytesIO())

    with patch("app.gsms.core_notify.urlopen", side_effect=boom):
        assert notify_core(
            event_type="document.ingested",
            workspace_id="ws",
            subject="document://x",
            data={},
        ) is False
