"""Contexte métier : ContextResolver + WorkspaceManager (engagement → workspace déterministe)."""

from __future__ import annotations

import uuid

from gsms_core.context.applications import ApplicationId
from gsms_core.context.catalog import SERVICE_CATALOG
from gsms_core.context.resolver import ContextResolver
from gsms_core.context.workspace_manager import WorkspaceManager
from gsms_core.identity.models import Organization, OrganizationKind, Site, Workspace
from tests.conftest import EMAILS


def _auth(client, email: str = EMAILS["owner"]) -> dict:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": "test-password"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_catalog_and_applications_listed(client, demo):
    headers = _auth(client)
    apps = client.get("/api/v1/context/applications", headers=headers)
    assert apps.status_code == 200
    ids = {row["id"] for row in apps.json()}
    assert ApplicationId.DOCULENS.value in ids
    assert ApplicationId.CAMP_AI.value in ids

    types = client.get("/api/v1/context/engagement-types", headers=headers)
    assert types.status_code == 200
    type_ids = {row["id"] for row in types.json()}
    assert "tender" in type_ids
    assert "commission_preparation" in type_ids
    assert set(SERVICE_CATALOG) <= type_ids


def test_create_engagement_creates_deterministic_workspace(client, demo, session):
    headers = _auth(client)
    org = session.get(Organization, uuid.UUID(demo.org_id))
    assert org is not None and org.kind == OrganizationKind.CLIENT

    # Site Lyon from seed — find via workspace
    lyon_ws = session.get(Workspace, uuid.UUID(demo.lyon))
    assert lyon_ws is not None and lyon_ws.site_id is not None
    site = session.get(Site, lyon_ws.site_id)
    assert site is not None

    payload = {
        "client_id": demo.org_id,
        "site_id": str(site.id),
        "engagement_type": "tender",
        "title": "Réponse AO sécurité 2027",
        "description": "Surveillance Hôpital X",
        "attach_catalog_apps": True,
    }
    created = client.post("/api/v1/engagements", headers=headers, json=payload)
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["client_id"] == demo.org_id
    assert body["site_id"] == str(site.id)
    assert body["workspace_id"]
    assert body["engagement_id"]
    assert "doculens" in body["applications"]
    assert "tender" in body["applications"]
    assert "camp_ai" in body["applications"]

    # ContextResolver from engagement
    ctx = client.get(f"/api/v1/context/by-engagement/{body['engagement_id']}", headers=headers)
    assert ctx.status_code == 200, ctx.text
    data = ctx.json()
    assert data["workspace_id"] == body["workspace_id"]
    assert data["client_id"] == demo.org_id
    assert data["site_id"] == str(site.id)
    assert data["engagement_id"] == body["engagement_id"]
    assert data["engagement_type"] == "tender"
    assert data["headers"]["X-GSMS-Workspace-Id"] == body["workspace_id"]
    assert data["headers"]["X-GSMS-Client-Id"] == demo.org_id
    assert data["headers"]["X-GSMS-Engagement-Id"] == body["engagement_id"]
    assert any(a["application_id"] == "doculens" for a in data["applications"])

    # Path-scoped context
    scoped = client.get(f"/api/v1/workspaces/{body['workspace_id']}/context", headers=headers)
    assert scoped.status_code == 200
    assert scoped.json()["workspace_id"] == body["workspace_id"]


def test_attach_application_binding(client, demo):
    headers = _auth(client)
    ws_id = demo.lyon
    r = client.post(
        f"/api/v1/workspaces/{ws_id}/applications",
        headers=headers,
        json={
            "application_id": "doculens",
            "external_workspace_id": "doc_ws_8832",
        },
    )
    assert r.status_code == 201, r.text
    assert r.json()["external_workspace_id"] == "doc_ws_8832"

    listed = client.get(f"/api/v1/workspaces/{ws_id}/applications", headers=headers)
    assert listed.status_code == 200
    assert any(row["external_workspace_id"] == "doc_ws_8832" for row in listed.json())


def test_workspace_manager_rejects_unknown_type(session, demo):
    mgr = WorkspaceManager(session)
    from gsms_core.identity.models import Workspace

    lyon = session.get(Workspace, uuid.UUID(demo.lyon))
    try:
        mgr.create_workspace_for_engagement(
            client_id=uuid.UUID(demo.org_id),
            site_id=lyon.site_id,
            engagement_type="does_not_exist",
            title="x",
            actor="test",
        )
        assert False, "expected KeyError"
    except KeyError:
        pass


def test_resolver_from_workspace_unit(session, demo):
    ctx = ContextResolver(session).resolve_from_workspace(uuid.UUID(demo.lyon))
    assert ctx.workspace_id == uuid.UUID(demo.lyon)
    assert ctx.client_id == uuid.UUID(demo.org_id)
    assert "X-GSMS-Workspace-Id" in ctx.headers()
