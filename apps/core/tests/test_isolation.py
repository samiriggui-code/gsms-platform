"""Isolation par workspace : un utilisateur de Lyon ne lit rien de Paris."""

from __future__ import annotations

import uuid

from gsms_core.documents import service as doc_service
from gsms_core.identity.models import Membership, Role, User
from gsms_core.security import hash_password
from tests.conftest import PASSWORD


def _paris_mission(client, auth, demo) -> str:
    missions = client.get(f"/api/v1/workspaces/{demo.paris}/missions", headers=auth("paris")).json()
    assert len(missions) == 1
    return missions[0]["id"]


def test_lyon_user_cannot_list_paris_missions(client, auth, demo):
    assert client.get(f"/api/v1/workspaces/{demo.paris}/missions", headers=auth("lyon")).status_code == 403
    assert client.get(f"/api/v1/workspaces/{demo.lyon}/missions", headers=auth("lyon")).status_code == 200


def test_paris_mission_not_found_through_lyon_workspace(client, auth, demo):
    mission_id = _paris_mission(client, auth, demo)
    r = client.get(f"/api/v1/workspaces/{demo.lyon}/missions/{mission_id}", headers=auth("lyon"))
    assert r.status_code == 404
    r = client.get(f"/api/v1/workspaces/{demo.paris}/missions/{mission_id}", headers=auth("lyon"))
    assert r.status_code == 403


def test_documents_are_isolated(client, auth, demo, session):
    up = client.post(
        f"/api/v1/workspaces/{demo.paris}/documents",
        headers=auth("paris"),
        files={"file": ("plan.pdf", b"%PDF paris plan", "application/pdf")},
        data={"doc_type": "plan_site"},
    )
    assert up.status_code == 201, up.text
    doc_id = up.json()["document"]["id"]

    assert client.get(f"/api/v1/workspaces/{demo.paris}/documents", headers=auth("lyon")).status_code == 403
    assert (
        client.get(f"/api/v1/workspaces/{demo.lyon}/documents/{doc_id}", headers=auth("lyon")).status_code
        == 404
    )
    assert client.get(f"/api/v1/workspaces/{demo.lyon}/documents", headers=auth("lyon")).json() == []
    # filtre workspace appliqué dans le repository, pas seulement dans la route
    assert doc_service.list_documents(session, uuid.UUID(demo.lyon)) == []
    assert len(doc_service.list_documents(session, uuid.UUID(demo.paris))) == 1


def test_cannot_attach_upload_to_other_workspace_mission(client, auth, demo):
    mission_id = _paris_mission(client, auth, demo)
    r = client.post(
        f"/api/v1/workspaces/{demo.lyon}/documents",
        headers=auth("lyon"),
        files={"file": ("x.txt", b"x", "text/plain")},
        data={"mission_id": mission_id},
    )
    assert r.status_code == 404


def test_roles_gate_writes(client, auth, demo, session):
    body = {"type": "AUDIT", "title": "Audit annuel"}
    # client_member : lecture + dépôt, pas de création de mission
    assert (
        client.post(f"/api/v1/workspaces/{demo.lyon}/missions", json=body, headers=auth("lyon")).status_code
        == 403
    )
    r = client.post(f"/api/v1/workspaces/{demo.lyon}/missions", json=body, headers=auth("consultant"))
    assert r.status_code == 201
    assert r.json()["workspace_id"] == demo.lyon

    viewer = User(email="viewer@abc-retail.example", name="Viewer", password_hash=hash_password(PASSWORD))
    session.add(viewer)
    session.flush()
    session.add(
        Membership(
            user_id=viewer.id,
            organization_id=uuid.UUID(demo.org_id),
            workspace_id=uuid.UUID(demo.lyon),
            role=Role.VIEWER,
        )
    )
    session.commit()
    tok = client.post("/api/v1/auth/login", json={"email": viewer.email, "password": PASSWORD}).json()
    h = {"Authorization": f"Bearer {tok['access_token']}"}
    assert client.get(f"/api/v1/workspaces/{demo.lyon}/missions", headers=h).status_code == 200
    r = client.post(
        f"/api/v1/workspaces/{demo.lyon}/documents",
        headers=h,
        files={"file": ("x.txt", b"viewer", "text/plain")},
    )
    assert r.status_code == 403
