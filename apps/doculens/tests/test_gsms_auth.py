"""Auth GSMS Documents : Bearer / API key + isolation workspace."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.api import endpoint as endpoint_module
from app.api.dependencies import db_session
from app.config.settings import get_settings
from app.main import app

WORKSPACE_A = "11111111-1111-1111-1111-111111111111"
WORKSPACE_B = "22222222-2222-2222-2222-222222222222"


@pytest.fixture
def client():
    return TestClient(app)


def _api_headers(workspace_id: str = WORKSPACE_A) -> Dict[str, str]:
    settings = get_settings()
    return {
        settings.api_key_header: settings.api_key or "test-api-key",
        "X-GSMS-Workspace-Id": workspace_id,
    }


def _platform_token(*, workspace_id: Optional[str], role: str = "consultant") -> str:
    settings = get_settings()
    secret = settings.gsms_platform_jwt_secret or settings.auth_secret_key
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(uuid4()),
        "org_id": str(uuid4()),
        "workspace_id": workspace_id,
        "role": role,
        "iss": "gsms-core",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=1)).timestamp()),
    }
    return jwt.encode(payload, secret, algorithm=settings.auth_algorithm)


@pytest.fixture
def auth_env(monkeypatch):
    monkeypatch.setenv("DOCULENS_API_KEY", "test-api-key")
    monkeypatch.setenv("GSMS_PLATFORM_JWT_SECRET", "platform-jwt-secret-for-tests-32ch")
    monkeypatch.setenv("DOCULENS_AUTH_SECRET", "local-auth-secret-for-tests-32chars")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_secured_route_rejects_unauthenticated(client, auth_env):
    response = client.get("/events/documents")
    assert response.status_code == 401


def test_api_key_requires_workspace_header(client, auth_env):
    settings = get_settings()
    response = client.get(
        "/events/documents",
        headers={settings.api_key_header: "test-api-key"},
    )
    assert response.status_code == 400
    assert "Workspace" in response.json()["detail"] or "workspace" in response.json()["detail"].lower()


def test_api_key_with_workspace_accepted_for_upload(monkeypatch, tmp_path, client, auth_env):
    stored: Dict[str, Any] = {}

    class DummyEvent:
        def __init__(self):
            self.id = uuid4()

    def fake_store(session, payload, *, workspace_id=None):
        stored.update(payload)
        if workspace_id:
            stored["workspace_id"] = workspace_id
        return DummyEvent(), "task-1"

    def fake_session():
        yield None

    monkeypatch.setattr(endpoint_module, "_ensure_ingestion_dir", lambda: tmp_path)
    monkeypatch.setattr(endpoint_module, "_store_event_and_dispatch", fake_store)
    app.dependency_overrides[db_session] = fake_session
    try:
        response = client.post(
            "/events/documents/upload",
            files={"file": ("pv.txt", b"PV commission", "text/plain")},
            data={"doc_type": "pv_commission_precedente"},
            headers=_api_headers(WORKSPACE_A),
        )
        assert response.status_code == 202
        # fake_store bypasses attach_workspace; real path injects it in _store_event_and_dispatch
        assert stored["event_type"] == "document_upload"
    finally:
        app.dependency_overrides.pop(db_session, None)


def test_platform_jwt_scopes_workspace(monkeypatch, client, auth_env):
    token = _platform_token(workspace_id=WORKSPACE_A)

    class FakeLabelService:
        def __init__(self, session, workspace_id=None):
            self.workspace_id = workspace_id

        def get_label_tree(self):
            return []

        def get_candidate_labels(self):
            return ["registre_securite", "dce"]

    def fake_session():
        yield None

    monkeypatch.setattr(endpoint_module, "LabelService", FakeLabelService)
    app.dependency_overrides[db_session] = fake_session
    try:
        response = client.get(
            "/events/labels",
            headers={
                "Authorization": f"Bearer {token}",
                "X-GSMS-Workspace-Id": WORKSPACE_A,
            },
        )
        assert response.status_code == 200
        assert response.json()["candidate_labels"] == ["registre_securite", "dce"]
    finally:
        app.dependency_overrides.pop(db_session, None)


def test_platform_jwt_forbids_foreign_workspace_for_viewer(client, auth_env):
    token = _platform_token(workspace_id=WORKSPACE_A, role="viewer")
    response = client.get(
        "/events/labels",
        headers={
            "Authorization": f"Bearer {token}",
            "X-GSMS-Workspace-Id": WORKSPACE_B,
        },
    )
    assert response.status_code == 403


def test_runtime_config_marks_auth_required(client, auth_env):
    response = client.get("/events/config")
    assert response.status_code == 200
    payload = response.json()
    assert payload["auth_required"] is True
    assert payload["app_name"] == "GSMS Documents" or "Documents" in payload["app_name"]
    assert payload["workspace_header"] == "X-GSMS-Workspace-Id"


def test_showcase_mutation_requires_auth_then_blocks(monkeypatch, client, auth_env):
    monkeypatch.setenv("DOCULENS_SHOWCASE_READ_ONLY", "true")
    get_settings.cache_clear()

    unauth = client.post("/events", json={"event_type": "qa_query", "query": "test"})
    assert unauth.status_code == 401

    mutation = client.post(
        "/events",
        json={"event_type": "qa_query", "query": "test"},
        headers=_api_headers(),
    )
    assert mutation.status_code == 403
    assert mutation.json()["detail"] == "This public showcase is read-only."
