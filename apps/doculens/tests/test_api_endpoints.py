import json
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api import endpoint as endpoint_module
from app.api.dependencies import db_session
from app.main import app
from app.config.settings import get_settings

WORKSPACE = "11111111-1111-1111-1111-111111111111"


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(monkeypatch):
    monkeypatch.setenv("DOCULENS_API_KEY", "test-api-key")
    get_settings.cache_clear()
    settings = get_settings()
    return {
        settings.api_key_header: "test-api-key",
        "X-GSMS-Workspace-Id": WORKSPACE,
    }


def test_get_runtime_config_reflects_settings(monkeypatch, client):
    monkeypatch.setenv("DOCULENS_SUMMARY_CHUNK_LIMIT", "15")
    monkeypatch.setenv("DOCULENS_QA_TOP_K", "7")
    monkeypatch.setenv("DOCULENS_SEARCH_RESULT_LIMIT", "9")
    monkeypatch.setenv("DOCULENS_API_KEY_HEADER", "X-Test-Key")
    get_settings.cache_clear()

    response = client.get("/events/config")
    assert response.status_code == 200
    payload = response.json()

    assert payload["summary_chunk_limit"] == 15
    assert payload["qa_top_k"] == 7
    assert payload["search_result_limit"] == 9
    assert payload["api_key_header"] == "X-Test-Key"
    assert payload["auth_required"] is True
    assert payload["showcase_read_only"] is False


def test_showcase_mode_rejects_mutations_but_keeps_reads_available(monkeypatch, client, auth_headers):
    monkeypatch.setenv("DOCULENS_SHOWCASE_READ_ONLY", "true")
    get_settings.cache_clear()

    unauth = client.post("/events", json={"event_type": "qa_query", "query": "test"})
    assert unauth.status_code == 401

    mutation = client.post(
        "/events",
        json={"event_type": "qa_query", "query": "test"},
        headers=auth_headers,
    )
    config = client.get("/events/config")

    assert mutation.status_code == 403
    assert mutation.json() == {"detail": "This public showcase is read-only."}
    assert config.status_code == 200
    assert config.json()["showcase_read_only"] is True


def test_upload_document_persists_file_and_dispatches(monkeypatch, tmp_path, client, auth_headers):
    stored_payload: Dict[str, Any] = {}

    class DummyEvent:
        def __init__(self, event_id: Optional[str] = None):
            self.id = event_id or uuid4()

    def fake_store_event(session, payload, *, workspace_id=None):
        stored_payload.update(payload)
        if workspace_id:
            stored_payload["workspace_id"] = workspace_id
        return DummyEvent(), "task-123"

    def fake_session():
        yield None

    monkeypatch.setattr(endpoint_module, "_ensure_ingestion_dir", lambda: tmp_path)
    monkeypatch.setattr(endpoint_module, "_store_event_and_dispatch", fake_store_event)
    app.dependency_overrides[db_session] = fake_session

    try:
        files = {"file": ("example.txt", b"content", "text/plain")}
        data = {"doc_type": "invoice", "metadata": json.dumps({"source": "tests"})}

        response = client.post(
            "/events/documents/upload",
            files=files,
            data=data,
            headers=auth_headers,
        )
        assert response.status_code == 202
        payload = response.json()

        assert payload["original_filename"] == "example.txt"
        assert payload["message"].startswith("Document upload accepted")
        assert "event_id" in payload

        stored_path = Path(stored_payload["filename"])
        assert stored_path.exists()
        assert stored_payload["metadata"]["uploaded_filename"] == "example.txt"
        assert stored_payload["metadata"]["source"] == "tests"
    finally:
        app.dependency_overrides.pop(db_session, None)


def test_upload_document_rejects_invalid_metadata(monkeypatch, tmp_path, client, auth_headers):
    called = False

    def fake_store_event(session, payload, *, workspace_id=None):
        nonlocal called
        called = True
        return None, ""

    def fake_session():
        yield None

    monkeypatch.setattr(endpoint_module, "_ensure_ingestion_dir", lambda: tmp_path)
    monkeypatch.setattr(endpoint_module, "_store_event_and_dispatch", fake_store_event)
    app.dependency_overrides[db_session] = fake_session

    try:
        files = {"file": ("example.txt", b"content", "text/plain")}
        data = {"metadata": "this-is-not-json"}

        response = client.post(
            "/events/documents/upload",
            files=files,
            data=data,
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert b"metadata must be valid JSON" in response.content
        assert called is False
    finally:
        app.dependency_overrides.pop(db_session, None)
