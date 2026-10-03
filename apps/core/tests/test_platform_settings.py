"""Paramétrage de la plateforme : réservé aux administrateurs, secrets chiffrés et jamais renvoyés,
test d'envoi, test de clé LLM, connectivité du Core."""

from __future__ import annotations

import httpx
import pytest
from sqlalchemy import select

from gsms_core.cli import TEAM_ROLES, create_admin, create_member
from gsms_core.platform.models import PlatformSetting
from gsms_core.platform.service import mail_config

PASSWORD = "admin-password-1234"


@pytest.fixture
def admin(client, session, demo):
    create_admin(session, "samir.iggui@gsms-security.com", "Samir", PASSWORD)
    r = client.post(
        "/api/v1/auth/login", json={"email": "samir.iggui@gsms-security.com", "password": PASSWORD}
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


MAIL = {
    "enabled": True,
    "host": "smtp.hostinger.com",
    "port": 465,
    "ssl": True,
    "starttls": False,
    "user": "admin@gsms-security.com",
    "from": "admin@gsms-security.com",
    "from_name": "GSMS Sécurité",
}


def test_only_platform_admins(client, auth, session, admin):
    for who in ("lyon", "owner", "consultant"):
        assert client.get("/api/v1/admin/settings/mail", headers=auth(who)).status_code == 403
    create_member(session, "analyste@gsms-security.com", "Analyste", PASSWORD, TEAM_ROLES["analyst"])
    r = client.post("/api/v1/auth/login", json={"email": "analyste@gsms-security.com", "password": PASSWORD})
    analyst = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/api/v1/admin/diagnostics", headers=analyst).status_code == 403
    assert client.get("/api/v1/admin/settings/mail", headers=admin).status_code == 200


def test_mail_settings_keep_the_password_secret(client, admin, session, app):
    r = client.put("/api/v1/admin/settings/mail", headers=admin, json={**MAIL, "password": "Secret-SMTP-123"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["password_set"] is True and body["source"] == "portail" and body["from"] == MAIL["from"]
    assert "Secret-SMTP-123" not in r.text
    row = session.scalar(select(PlatformSetting).where(PlatformSetting.key == "mail"))
    assert row.secret and "Secret-SMTP-123" not in row.secret  # chiffré par la clé maître

    # Sans « password » : inchangé ; chaîne vide : effacé.
    client.put("/api/v1/admin/settings/mail", headers=admin, json={**MAIL, "port": 587})
    session.expire_all()
    cfg = mail_config(session, app.state.settings, app.state.vault)
    assert (cfg.smtp_port, cfg.smtp_password) == (587, "Secret-SMTP-123")
    cleared = client.put("/api/v1/admin/settings/mail", headers=admin, json={**MAIL, "password": ""}).json()
    assert cleared["password_set"] is False


def test_mail_test_uses_saved_settings(client, admin, app):
    sent = []

    class Fake:
        def send(self, **kwargs):
            sent.append(kwargs)
            return "<1@test>"

    app.state.mail_sender = Fake()
    client.put("/api/v1/admin/settings/mail", headers=admin, json={**MAIL, "enabled": False})
    off = client.post("/api/v1/admin/settings/mail/test", headers=admin).json()
    assert off["ok"] is False and "désactivée" in off["detail"] and not sent

    client.put("/api/v1/admin/settings/mail", headers=admin, json=MAIL)
    on = client.post(
        "/api/v1/admin/settings/mail/test", headers=admin, json={"to": "test@example.com"}
    ).json()
    assert on["ok"] is True and sent[0]["to"] == "test@example.com"


def _llm_transport(status: int):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["x-api-key"] == "sk-ant-test-abcd"
        if status != 200:
            return httpx.Response(status, json={"error": "invalid"})
        return httpx.Response(200, json={"data": [{"id": "claude-sonnet-5-5"}, {"id": "claude-opus-5-5"}]})

    return httpx.Client(transport=httpx.MockTransport(handler))


def test_llm_key_is_masked_and_tested(client, admin, app):
    r = client.put(
        "/api/v1/admin/settings/llm",
        headers=admin,
        json={"provider": "anthropic", "model": "claude-sonnet-5-5", "api_key": "sk-ant-test-abcd"},
    )
    assert r.status_code == 200 and r.json()["api_key_hint"] == "…abcd" and "sk-ant-test" not in r.text

    app.state.llm_http = _llm_transport(200)
    ok = client.post("/api/v1/admin/settings/llm/test", headers=admin).json()
    assert ok["ok"] is True and "2 modèles" in ok["detail"]

    app.state.llm_http = _llm_transport(401)
    ko = client.post("/api/v1/admin/settings/llm/test", headers=admin).json()
    assert ko["ok"] is False and "refusée" in ko["detail"]

    bad = client.put("/api/v1/admin/settings/llm", headers=admin, json={"provider": "openai_compatible"})
    assert bad.status_code == 400


def test_core_connectivity(client, admin):
    checks = {c["name"]: c for c in client.get("/api/v1/admin/diagnostics", headers=admin).json()}
    assert checks["database"]["ok"] and checks["storage"]["ok"] and checks["audit"]["ok"]
    assert "chiffrées" in checks["storage"]["detail"]
    assert checks["llm"]["skipped"] and checks["crm"]["skipped"]
    assert set(checks) >= {
        "database",
        "storage",
        "audit",
        "docling",
        "smtp",
        "llm",
        "crm",
        "grace",
        "qatrial",
    }
