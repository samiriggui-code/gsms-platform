"""Équipe gérée dans le Core (invitation, rôles, accès par application) et connexion des applications
(GRACE, QAtrial, CRM) par le fournisseur OIDC du Core."""

from __future__ import annotations

import base64
import hashlib
from urllib.parse import parse_qs, urlsplit

import jwt
import pytest
from sqlalchemy import select

from gsms_core.cli import TEAM_ROLES, create_admin, create_member, main
from gsms_core.communications.models import Message

PASSWORD = "admin-password-1234"
SUPER = "samir.iggui@gsms-security.com"
GRACE_CB = "https://grace.gsms-security.com/api/auth/sso/callback"


class FakeSender:
    def __init__(self) -> None:
        self.sent: list[dict] = []

    def send(self, **kwargs) -> str:
        self.sent.append(kwargs)
        return f"<{len(self.sent)}@test>"


@pytest.fixture
def mailer(app):
    fake = FakeSender()
    app.state.mail_sender = fake
    app.state.settings.mail_enabled = True
    app.state.settings.app_url = "https://gsms-security.com"
    return fake


def _login(client, email: str, password: str = PASSWORD) -> dict:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def owner(client, session, demo, mailer):
    create_admin(session, SUPER, "Samir Iggui", PASSWORD)
    return _login(client, SUPER)


def _member(client, session, email: str, role: str) -> dict:
    create_member(session, email, email.split("@")[0], PASSWORD, TEAM_ROLES[role])
    return _login(client, email)


def _token_from(mail: dict) -> str:
    link = next(w for w in mail["text"].split() if "/activation#" in w)
    return link.split("#", 1)[1]


# --- équipe ----------------------------------------------------------------------------------------------


def test_invitation_by_email_then_activation(client, session, owner, mailer):
    r = client.post(
        "/api/v1/admin/team",
        headers=owner,
        json={"email": "Nouveau@GSMS-security.com", "name": "Nouvel Analyste", "role": "consultant"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["member"]["status"] == "invite" and body["member"]["email"] == "nouveau@gsms-security.com"
    assert body["email"]["sent"] is True
    assert body["activation_url"].startswith("https://gsms-security.com/activation#")

    mail = mailer.sent[-1]
    assert mail["to"] == "nouveau@gsms-security.com" and "Votre accès" in mail["subject"]
    token = _token_from(mail)
    assert token in mail["html"]
    # Le lien n'est pas lisible depuis la messagerie (journal) : seule sa version masquée est gardée.
    stored = session.scalar(select(Message).where(Message.rule_key == "invitation_equipe"))
    assert token not in stored.body_html and token not in stored.body_text

    # Pas de connexion tant que le mot de passe n'est pas choisi.
    assert (
        client.post(
            "/api/v1/auth/login", json={"email": "nouveau@gsms-security.com", "password": "x" * 12}
        ).status_code
        == 401
    )
    info = client.post("/api/v1/auth/activation/check", json={"token": token}).json()
    assert info["email"] == "nouveau@gsms-security.com" and info["purpose"] == "invitation"
    short = client.post("/api/v1/auth/activation", json={"token": token, "password": "court"})
    assert short.status_code == 400
    ok = client.post(
        "/api/v1/auth/activation", json={"token": token, "password": "Un-Mot-De-Passe-Solide-42"}
    )
    assert ok.status_code == 200, ok.text
    assert (
        client.post(
            "/api/v1/auth/activation", json={"token": token, "password": "Autre-Mdp-Solide-42"}
        ).status_code
        == 410
    )
    _login(client, "nouveau@gsms-security.com", "Un-Mot-De-Passe-Solide-42")

    team = client.get("/api/v1/admin/team", headers=owner).json()
    member = next(m for m in team["members"] if m["email"] == "nouveau@gsms-security.com")
    assert member["status"] == "actif" and member["last_login_at"]
    apps = {a["app"]: a for a in member["apps"]}
    assert apps["grace"]["role"] == "ASSESSOR" and apps["qatrial"]["role"] == "qa_engineer"
    assert apps["crm"]["role"] == "member" and apps["doculens"]["role"] == "analyst"


def test_team_rules(client, session, owner, demo):
    admin = _member(client, session, "admin@gsms-security.com", "admin")
    analyst = _member(client, session, "analyste@gsms-security.com", "analyst")
    for headers in (analyst, _login(client, "direction@abc-retail.example", "test-password")):
        assert client.get("/api/v1/admin/team", headers=headers).status_code == 403
    assert client.get("/api/v1/admin/roles", headers=analyst).status_code == 200

    # Un administrateur ne crée ni ne modifie d'administrateur ; il gère les autres rôles.
    r = client.post(
        "/api/v1/admin/team",
        headers=admin,
        json={"email": "x@gsms-security.com", "name": "Xavier", "role": "admin"},
    )
    assert r.status_code == 403
    team = client.get("/api/v1/admin/team", headers=admin).json()
    ids = {m["email"]: m["id"] for m in team["members"]}
    assert (
        client.patch(f"/api/v1/admin/team/{ids[SUPER]}", headers=admin, json={"role": "viewer"}).status_code
        == 403
    )
    r = client.patch(
        f"/api/v1/admin/team/{ids['analyste@gsms-security.com']}", headers=admin, json={"role": "auditor"}
    )
    assert r.status_code == 200 and r.json()["role"] == "auditor"

    # Personne ne change son propre rôle ; il reste toujours un super admin.
    r = client.patch(f"/api/v1/admin/team/{ids[SUPER]}", headers=owner, json={"is_active": False})
    assert r.status_code == 403
    # Un compte client ne peut pas être invité dans l'équipe avec la même adresse.
    r = client.post(
        "/api/v1/admin/team",
        headers=owner,
        json={"email": "direction@abc-retail.example", "name": "Client", "role": "viewer"},
    )
    assert r.status_code == 409

    # Désactivation : plus de connexion.
    r = client.patch(
        f"/api/v1/admin/team/{ids['analyste@gsms-security.com']}", headers=owner, json={"is_active": False}
    )
    assert r.status_code == 200 and r.json()["status"] == "desactive"
    assert (
        client.post(
            "/api/v1/auth/login", json={"email": "analyste@gsms-security.com", "password": PASSWORD}
        ).status_code
        == 401
    )


def test_last_owner_is_protected(client, session, owner):
    second = _member(client, session, "second@gsms-security.com", "admin")
    team = client.get("/api/v1/admin/team", headers=owner).json()
    ids = {m["email"]: m["id"] for m in team["members"]}
    # Promu super admin, le second peut retirer le rôle du premier ; pas l'inverse s'il ne reste qu'un.
    assert (
        client.patch(
            f"/api/v1/admin/team/{ids['second@gsms-security.com']}", headers=owner, json={"role": "owner"}
        ).status_code
        == 200
    )
    second = _login(client, "second@gsms-security.com")
    assert (
        client.patch(f"/api/v1/admin/team/{ids[SUPER]}", headers=second, json={"role": "admin"}).status_code
        == 200
    )
    r = client.patch(
        f"/api/v1/admin/team/{ids['second@gsms-security.com']}", headers=owner, json={"role": "admin"}
    )
    assert r.status_code == 403  # owner n'est plus super admin


def test_reset_link_keeps_password_until_used(client, session, owner, mailer):
    _member(client, session, "lecteur@gsms-security.com", "viewer")
    team = client.get("/api/v1/admin/team", headers=owner).json()
    uid = next(m["id"] for m in team["members"] if m["email"] == "lecteur@gsms-security.com")
    r = client.post(f"/api/v1/admin/team/{uid}/link", headers=owner, json={"send_email": True})
    assert r.status_code == 200 and r.json()["purpose"] == "reset"
    token = _token_from(mailer.sent[-1])
    _login(client, "lecteur@gsms-security.com")  # l'ancien mot de passe reste valable
    weak = client.post("/api/v1/auth/activation", json={"token": token, "password": "lecteur-2026-ok"})
    assert weak.status_code == 400 and "identifiant" in weak.json()["detail"]
    ok = client.post("/api/v1/auth/activation", json={"token": token, "password": "Nouveau-Mdp-Solide-7"})
    assert ok.status_code == 200
    _login(client, "lecteur@gsms-security.com", "Nouveau-Mdp-Solide-7")
    # Le message journalisé ne peut pas être renvoyé tel quel (lien non conservé).
    msg = session.scalar(select(Message).where(Message.rule_key == "reinitialisation_mot_de_passe"))
    assert "Nouveau mot de passe" in msg.subject


# --- OIDC ------------------------------------------------------------------------------------------------


def _pkce() -> tuple[str, str]:
    verifier = "v" * 64
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    return verifier, challenge


@pytest.fixture
def grace_client(client, owner):
    r = client.put("/api/v1/admin/sso/clients/grace", headers=owner, json={"redirect_uris": [GRACE_CB]})
    assert r.status_code == 200, r.text
    secret = r.json()["client_secret"]
    assert secret
    return secret


def _authorize(client, headers, client_id="grace", redirect_uri=GRACE_CB, **extra) -> str:
    _, challenge = _pkce()
    payload = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid profile email",
        "state": "etat-123",
        "nonce": "nonce-456",
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    } | extra
    r = client.post("/api/v1/oidc/authorize", headers=headers, json=payload)
    assert r.status_code == 200, r.text
    return r.json()["redirect_to"]


def _query(url: str) -> dict:
    return {k: v[0] for k, v in parse_qs(urlsplit(url).query).items()}


def test_full_oidc_flow(client, session, owner, grace_client):
    analyst = _member(client, session, "analyste@gsms-security.com", "analyst")
    disco = client.get("/api/v1/oidc/discovery").json()
    assert disco["issuer"] == "https://gsms-security.com"
    assert disco["token_endpoint"] == "https://gsms-security.com/oidc/token"

    target = _authorize(client, analyst)
    assert target.startswith(GRACE_CB + "?")
    q = _query(target)
    assert q["state"] == "etat-123"
    verifier, _ = _pkce()
    form = {
        "grant_type": "authorization_code",
        "code": q["code"],
        "redirect_uri": GRACE_CB,
        "code_verifier": verifier,
    }
    basic = base64.b64encode(f"grace:{grace_client}".encode()).decode()
    r = client.post("/api/v1/oidc/token", data=form, headers={"Authorization": f"Basic {basic}"})
    assert r.status_code == 200, r.text
    assert r.headers["cache-control"] == "no-store"
    tokens = r.json()

    jwks = client.get("/api/v1/oidc/jwks").json()
    key = jwt.PyJWK(jwks["keys"][0]).key
    claims = jwt.decode(
        tokens["id_token"], key, algorithms=["RS256"], audience="grace", issuer="https://gsms-security.com"
    )
    assert claims["nonce"] == "nonce-456" and claims["email"] == "analyste@gsms-security.com"
    assert claims["gsms_role"] == "ASSESSOR" and claims["gsms_core_role"] == "consultant"
    assert claims["email_verified"] is True

    info = client.get("/api/v1/oidc/userinfo", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert info.status_code == 200 and info.json()["gsms_role"] == "ASSESSOR"

    # Code à usage unique.
    again = client.post("/api/v1/oidc/token", data=form, headers={"Authorization": f"Basic {basic}"})
    assert again.status_code == 400 and again.json()["error"] == "invalid_grant"


def test_oidc_rejections(client, session, owner, grace_client):
    analyst = _member(client, session, "analyste@gsms-security.com", "analyst")
    viewer = _member(client, session, "lecteur@gsms-security.com", "viewer")

    # Adresse de retour non déclarée : pas de redirection (erreur affichée par le portail).
    r = client.post(
        "/api/v1/oidc/authorize",
        headers=analyst,
        json={"client_id": "grace", "redirect_uri": "https://evil.example/cb", "scope": "openid"},
    )
    assert r.status_code == 400

    # Mauvais secret, mauvais PKCE.
    q = _query(_authorize(client, analyst))
    bad = client.post(
        "/api/v1/oidc/token",
        data={
            "grant_type": "authorization_code",
            "code": q["code"],
            "redirect_uri": GRACE_CB,
            "client_id": "grace",
            "client_secret": "faux",
            "code_verifier": "v" * 64,
        },
    )
    assert bad.status_code == 401 and bad.json()["error"] == "invalid_client"
    q = _query(_authorize(client, analyst))
    wrong = client.post(
        "/api/v1/oidc/token",
        data={
            "grant_type": "authorization_code",
            "code": q["code"],
            "redirect_uri": GRACE_CB,
            "client_id": "grace",
            "client_secret": grace_client,
            "code_verifier": "w" * 64,
        },
    )
    assert wrong.status_code == 400 and "PKCE" in wrong.json()["error_description"]

    # Lecteur : pas d'accès au CRM par défaut.
    client.put(
        "/api/v1/admin/sso/clients/crm",
        headers=owner,
        json={"redirect_uris": ["https://crm.gsms-security.com/api/auth/callback/gsms"]},
    )
    denied = _query(
        _authorize(
            client,
            viewer,
            client_id="crm",
            redirect_uri="https://crm.gsms-security.com/api/auth/callback/gsms",
        )
    )
    assert denied["error"] == "access_denied" and "code" not in denied

    # Dérogation : accès GRACE coupé pour l'analyste, puis rôle REVIEWER.
    team = client.get("/api/v1/admin/team", headers=owner).json()
    uid = next(m["id"] for m in team["members"] if m["email"] == "analyste@gsms-security.com")
    r = client.put(f"/api/v1/admin/team/{uid}/apps/grace", headers=owner, json={"enabled": False})
    assert r.status_code == 200
    assert _query(_authorize(client, analyst))["error"] == "access_denied"
    r = client.put(
        f"/api/v1/admin/team/{uid}/apps/grace", headers=owner, json={"enabled": True, "role": "REVIEWER"}
    )
    grace = next(a for a in r.json()["apps"] if a["app"] == "grace")
    assert grace["role"] == "REVIEWER" and grace["overridden"] is True
    bad_role = client.put(
        f"/api/v1/admin/team/{uid}/apps/grace", headers=owner, json={"enabled": True, "role": "owner"}
    )
    assert bad_role.status_code == 400

    # Compte client : jamais d'accès aux applications internes.
    client_user = _login(client, "direction@abc-retail.example", "test-password")
    assert _query(_authorize(client, client_user))["error"] == "access_denied"


def test_deactivated_member_cannot_exchange_code(client, session, owner, grace_client):
    analyst = _member(client, session, "analyste@gsms-security.com", "analyst")
    q = _query(_authorize(client, analyst))
    team = client.get("/api/v1/admin/team", headers=owner).json()
    uid = next(m["id"] for m in team["members"] if m["email"] == "analyste@gsms-security.com")
    client.patch(f"/api/v1/admin/team/{uid}", headers=owner, json={"is_active": False})
    r = client.post(
        "/api/v1/oidc/token",
        data={
            "grant_type": "authorization_code",
            "code": q["code"],
            "redirect_uri": GRACE_CB,
            "client_id": "grace",
            "client_secret": grace_client,
            "code_verifier": "v" * 64,
        },
    )
    assert r.status_code == 400 and r.json()["error"] == "invalid_grant"


def test_secret_rotation_and_cli(client, session, owner, grace_client, capsys, settings, db, monkeypatch):
    rotated = client.post("/api/v1/admin/sso/clients/grace/secret", headers=owner).json()["client_secret"]
    assert rotated and rotated != grace_client
    listing = client.get("/api/v1/admin/sso/clients", headers=owner).json()
    by_app = {c["app"]: c for c in listing["clients"]}
    assert by_app["grace"]["configured"] and not by_app["crm"]["configured"]
    assert "secret" not in str(by_app["grace"]["client"]).lower().replace("secret_rotated_at", "")

    monkeypatch.setattr("gsms_core.cli.get_settings", lambda: settings)
    monkeypatch.setattr("gsms_core.cli.Database", lambda url: db)
    settings.app_url = "https://gsms-security.com"
    assert main(["sso-client", "qatrial"]) == 0
    out = capsys.readouterr().out
    assert "SSO_CLIENT_ID=qatrial" in out and "https://qatrial.gsms-security.com/api/auth/sso/callback" in out
    assert main(["sso-client", "qatrial"]) == 0
    assert "Secret inchangé" in capsys.readouterr().out


DOCULENS_CB = "https://doculens.gsms-security.com/auth/callback"


def test_doculens_public_client_opens_a_core_session(client, session, owner):
    from gsms_core.oidc import service as oidc

    _, secret = oidc.save_client(session, "doculens", [DOCULENS_CB], "test")
    session.commit()
    assert secret is None  # client public : pas de secret
    analyst = _member(client, session, "analyste@gsms-security.com", "analyst")

    # PKCE obligatoire pour un client public.
    no_pkce = client.post(
        "/api/v1/oidc/authorize",
        headers=analyst,
        json={"client_id": "doculens", "redirect_uri": DOCULENS_CB, "scope": "openid", "state": "s"},
    )
    assert _query(no_pkce.json()["redirect_to"])["error"] == "invalid_request"

    code = _query(_authorize(client, analyst, client_id="doculens", redirect_uri=DOCULENS_CB))["code"]
    body = {"client_id": "doculens", "code": code, "redirect_uri": DOCULENS_CB, "code_verifier": "v" * 64}
    r = client.post("/api/v1/auth/oidc-session", json=body)
    assert r.status_code == 200, r.text
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"})
    assert me.json()["email"] == "analyste@gsms-security.com"
    # Usage unique ; le point d'accès des clients à secret n'ouvre rien pour un client public.
    assert client.post("/api/v1/auth/oidc-session", json=body).status_code == 401
    code = _query(_authorize(client, analyst, client_id="doculens", redirect_uri=DOCULENS_CB))["code"]
    token = client.post(
        "/api/v1/oidc/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": DOCULENS_CB,
            "client_id": "doculens",
        },
    )
    assert token.status_code == 401
    # Un autre client (GRACE) ne peut pas ouvrir de session du Core.
    bad = client.post("/api/v1/auth/oidc-session", json=body | {"client_id": "grace"})
    assert bad.status_code == 401

    # Compte client : DocuLens est réservé à l'équipe.
    client_user = _login(client, "direction@abc-retail.example", "test-password")
    denied = _authorize(client, client_user, client_id="doculens", redirect_uri=DOCULENS_CB)
    assert _query(denied)["error"] == "access_denied"
