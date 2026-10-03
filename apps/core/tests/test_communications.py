"""Messagerie : relance des pièces manquantes (préparée, validée par l'équipe, envoyée), désactivation,
échec SMTP, annulation, aperçu échappé, accès refusé aux comptes client, envoi SMTP réel simulé."""

from __future__ import annotations

import smtplib

import pytest
from sqlalchemy import select

from gsms_core.communications.models import Message
from gsms_core.communications.sender import SmtpSender
from gsms_core.events.models import Event


class FakeSender:
    def __init__(self, fail: Exception | None = None) -> None:
        self.sent: list[dict] = []
        self.fail = fail

    def send(self, **kwargs) -> str:
        if self.fail:
            raise self.fail
        self.sent.append(kwargs)
        return f"<{len(self.sent)}@test>"


@pytest.fixture
def sender(app):
    fake = FakeSender()
    app.state.mail_sender = fake
    app.state.settings.mail_enabled = True
    return fake


def _base(demo) -> str:
    return f"/api/v1/workspaces/{demo.lyon}/communications"


def test_missing_pieces_are_prepared_validated_then_sent(client, auth, demo, sender, session):
    team = auth("consultant")
    r = client.post(
        f"{_base(demo)}/relance-pieces", headers=team, json={"pieces": ["CCAP", "Acte d'engagement"]}
    )
    assert r.status_code == 201, r.text
    messages = r.json()
    recipients = {m["recipient_email"] for m in messages}
    assert recipients == {"direction@abc-retail.example", "responsable.lyon@abc-retail.example"}
    assert {m["status"] for m in messages} == {
        "TO_VALIDATE"
    } and not sender.sent  # rien ne part sans validation

    first = messages[0]
    done = client.post(f"{_base(demo)}/{first['id']}/valider", headers=team)
    assert done.status_code == 200 and done.json()["status"] == "SENT"
    [mail] = sender.sent
    assert "CCAP" in mail["text"] and f"/app/coffre-fort?ws={demo.lyon}" in mail["html"]
    assert client.post(f"{_base(demo)}/{first['id']}/valider", headers=team).status_code == 409

    types = {e.type for e in session.scalars(select(Event))}
    assert {"communication.created", "communication.sent"} <= types


def test_disabled_mail_fails_cleanly_and_can_be_resent(client, auth, demo, app, sender):
    app.state.settings.mail_enabled = False
    team = auth("consultant")
    msg = client.post(f"{_base(demo)}/relance-pieces", headers=team, json={"pieces": ["CCAP"]}).json()[0]
    r = client.post(f"{_base(demo)}/{msg['id']}/valider", headers=team).json()
    assert r["status"] == "FAILED" and "désactivée" in r["last_error"] and not sender.sent

    app.state.settings.mail_enabled = True
    again = client.post(f"{_base(demo)}/{msg['id']}/renvoyer", headers=team).json()
    assert again["status"] == "SENT" and again["attempts"] == 2


def test_smtp_error_is_recorded(client, auth, demo, app, sender):
    app.state.mail_sender = FakeSender(fail=smtplib.SMTPAuthenticationError(535, b"bad credentials"))
    team = auth("consultant")
    msg = client.post(f"{_base(demo)}/relance-pieces", headers=team, json={"pieces": ["CCAP"]}).json()[0]
    r = client.post(f"{_base(demo)}/{msg['id']}/valider", headers=team).json()
    assert r["status"] == "FAILED" and "SMTPAuthenticationError" in r["last_error"]


def test_cancel_and_preview_is_escaped(client, auth, demo, sender):
    team = auth("consultant")
    msg = client.post(
        f"{_base(demo)}/relance-pieces", headers=team, json={"pieces": ["<script>alert(1)</script>"]}
    ).json()[0]
    page = client.get(f"{_base(demo)}/{msg['id']}/apercu", headers=team)
    assert "<script>" not in page.text and "&lt;script&gt;" in page.text
    assert "default-src 'none'" in page.headers["content-security-policy"]

    r = client.post(f"{_base(demo)}/{msg['id']}/annuler", headers=team, json={"reason": "doublon"})
    assert r.json()["status"] == "CANCELLED"
    assert client.post(f"{_base(demo)}/{msg['id']}/valider", headers=team).status_code == 409


def test_clients_have_no_access_to_the_messaging(client, auth, demo, sender):
    lyon = auth("lyon")
    assert client.get(_base(demo), headers=lyon).status_code == 403
    r = client.post(f"{_base(demo)}/relance-pieces", headers=lyon, json={"pieces": ["CCAP"]})
    assert r.status_code == 403


def test_without_pieces_or_digest_nothing_is_prepared(client, auth, demo, sender, session):
    r = client.post(f"{_base(demo)}/relance-pieces", headers=auth("consultant"))
    assert r.status_code == 409
    assert session.scalar(select(Message).limit(1)) is None


def test_smtp_sender_builds_a_real_message(monkeypatch, settings):
    sent = {}

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            sent["server"] = (host, port)

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def login(self, user, password):
            sent["login"] = user

        def send_message(self, msg, mail_options=()):
            sent["msg"] = msg

    monkeypatch.setattr(smtplib, "SMTP_SSL", FakeSMTP)
    settings.smtp_host, settings.smtp_port, settings.smtp_ssl = "smtp.hostinger.com", 465, True
    settings.smtp_user, settings.smtp_password = "admin@gsms-security.com", "x"
    settings.smtp_from = "admin@gsms-security.com"
    msg_id = SmtpSender(settings).send(
        to="client@example.com", to_name="Client", subject="Sujet é", html="<p>a</p>", text="a"
    )
    assert sent["server"] == ("smtp.hostinger.com", 465) and sent["login"] == "admin@gsms-security.com"
    assert sent["msg"]["From"].addresses[0].addr_spec == "admin@gsms-security.com"
    assert msg_id.endswith("@gsms-security.com>")


def test_cli_mail_test_without_workspace(db, settings, monkeypatch, capsys):
    from gsms_core import cli

    sent = []

    class Fake:
        def __init__(self, cfg):
            pass

        def send(self, **kwargs):
            sent.append(kwargs)
            return "<1@test>"

    monkeypatch.setattr("gsms_core.communications.sender.SmtpSender", Fake)
    settings.mail_enabled = True
    assert cli._mail_test(settings, db, "moi@example.com") == 0
    assert sent and "Envoyé à moi@example.com" in capsys.readouterr().out
