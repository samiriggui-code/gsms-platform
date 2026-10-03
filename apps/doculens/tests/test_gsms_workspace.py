"""Isolation workspace dans les payloads d'events."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.gsms.context import set_request_scope
from app.gsms.workspace import assert_event_workspace, attach_workspace, workspace_from_event_data


def test_attach_workspace_injects_root_and_metadata():
    set_request_scope(workspace_id="ws-a", actor_id="user-1", role="consultant")
    payload = attach_workspace({"event_type": "document_upload", "filename": "x.pdf", "file_url": ""})
    assert payload["workspace_id"] == "ws-a"
    assert payload["metadata"]["workspace_id"] == "ws-a"


def test_assert_event_workspace_rejects_foreign():
    set_request_scope(workspace_id="ws-a", actor_id="user-1", role="consultant")
    with pytest.raises(HTTPException) as exc:
        assert_event_workspace({"workspace_id": "ws-b"})
    assert exc.value.status_code == 404


def test_workspace_from_event_data():
    assert workspace_from_event_data({"workspace_id": "ws-1"}) == "ws-1"
    assert workspace_from_event_data({"metadata": {"workspace_id": "ws-2"}}) == "ws-2"
