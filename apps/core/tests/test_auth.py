from __future__ import annotations

import jwt

from tests.conftest import EMAILS, login


def test_health(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_login_rejects_bad_password(client, demo):
    r = client.post("/api/v1/auth/login", json={"email": EMAILS["lyon"], "password": "nope"})
    assert r.status_code == 401


def test_login_token_claims_and_me(client, demo, settings):
    headers = login(client, "lyon")
    token = headers["Authorization"].split()[1]
    claims = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], issuer="gsms-core")
    assert claims["workspace_id"] == demo.lyon
    assert claims["org_id"] == demo.org_id
    assert claims["role"] == "client_member"

    me = client.get("/api/v1/auth/me", headers=headers).json()
    assert me["email"] == EMAILS["lyon"]
    assert me["organization_name"] == "ABC Retail"
    assert [w["id"] for w in me["workspaces"]] == [demo.lyon]


def test_workspaces_listing_respects_memberships(client, auth, demo):
    lyon = client.get("/api/v1/workspaces", headers=auth("lyon")).json()
    owner = client.get("/api/v1/workspaces", headers=auth("owner")).json()
    assert {w["id"] for w in lyon} == {demo.lyon}
    # membership org entière (workspace_id NULL) → tous les sites
    assert {w["id"] for w in owner} == {demo.lyon, demo.paris}
    assert all(w["role"] == "client_admin" for w in owner)


def test_switch_workspace(client, auth, demo):
    r = client.post("/api/v1/auth/switch-workspace", json={"workspace_id": demo.paris}, headers=auth("lyon"))
    assert r.status_code == 403
    r = client.post("/api/v1/auth/switch-workspace", json={"workspace_id": demo.paris}, headers=auth("owner"))
    assert r.status_code == 200
    assert r.json()["workspace_id"] == demo.paris


def test_missing_or_forged_token_is_rejected(client, demo, settings):
    assert client.get("/api/v1/auth/me").status_code == 401
    forged = jwt.encode(
        {"sub": "x", "org_id": "y", "role": "owner", "exp": 9999999999, "iss": "gsms-core"},
        "another-secret-another-secret-another",
        algorithm="HS256",
    )
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


def test_token_workspace_claim_is_not_authoritative(client, demo, settings):
    """Un jeton signé qui prétend viser Paris ne donne pas accès à Paris : la membership est vérifiée."""
    from gsms_core.security import TokenClaims, create_access_token, decode_access_token

    real = decode_access_token(settings, login(client, "lyon")["Authorization"].split()[1])
    import uuid

    forged = create_access_token(
        settings,
        TokenClaims(sub=real.sub, org_id=real.org_id, workspace_id=uuid.UUID(demo.paris), role="owner"),
    )
    r = client.get(f"/api/v1/workspaces/{demo.paris}/missions", headers={"Authorization": f"Bearer {forged}"})
    assert r.status_code == 403
