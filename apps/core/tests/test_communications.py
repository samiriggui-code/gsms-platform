"""Messagerie (module Communications repris de Qualiopi) : planificateur idempotent, validation des
messages aux clients, alertes internes, message devenu sans objet, annulation avec motif, réessai,
adresse manquante, règles désactivées, accès réservé à l'équipe, rendu des modèles, SMTP réel simulé."""

from __future__ import annotations

import smtplib
import uuid
from datetime import date, timedelta

import pytest
from sqlalchemy import select

from gsms_core.cli import TEAM_ROLES, create_admin, create_member
from gsms_core.communications import service, templates
from gsms_core.communications.models import Message, MessageStatus
from gsms_core.communications.planner import plan
from gsms_core.communications.rules import load_rules
from gsms_core.communications.sender import SmtpSender
from gsms_core.digest.models import DigestStatus, WorkspaceDigestRecord
from gsms_core.digest.schemas import Conflict, ConflictValue, Deadline, MissingInformation, WorkspaceDigest
from gsms_core.documents.parsers.schemas import SourceRef
from gsms_core.events.models import Event

PASSWORD = "team-password-1234"


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


@pytest.fixture
def team(client, session, demo):
    create_admin(session, "samir.iggui@gsms-security.com", "Samir Iggui", PASSWORD)
    create_member(session, "analyste@gsms-security.com", "Analyste", PASSWORD, TEAM_ROLES["analyst"])
    create_member(session, "lecteur@gsms-security.com", "Lecteur", PASSWORD, TEAM_ROLES["viewer"])

    def login(email: str) -> dict[str, str]:
        r = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    return login


def _digest(session, ws: str, *, missing=(), conflicts=(), deadline: date | None = None) -> None:
    src = SourceRef(document_id=uuid.uuid4(), filename="BPU.xlsx", sheet="BPU", cell="D4")
    payload = WorkspaceDigest(
        workspace_id=uuid.UUID(ws),
        missing_information=[
            MissingInformation(code="MISSING_DOCUMENT", key=k, message=f"Pièce absente : {k}")
            for k in missing
        ],
        conflicts=[
            Conflict(
                code="STAFFING_QUANTITY_MISMATCH",
                key=k,
                message=f"Effectif {k} incohérent",
                values=[ConflictValue(value="1 x Agent SSIAP 1", source=src)],
            )
            for k in conflicts
        ],
        deadlines=[Deadline(id="d1", kind="remise_offres", label="Remise", due_date=deadline, source=src)]
        if deadline
        else [],
    )
    session.add(
        WorkspaceDigestRecord(
            workspace_id=uuid.UUID(ws),
            status=DigestStatus.BUILT,
            trigger="test",
            payload=payload.model_dump(mode="json"),
        )
    )
    session.commit()


def _messages(session, rule: str | None = None) -> list[Message]:
    session.expire_all()
    q = select(Message).order_by(Message.reference)
    if rule:
        q = q.where(Message.rule_key == rule)
    return list(session.scalars(q))


def test_rules_catalog_and_templates_are_valid():
    assert {r.cle for r in load_rules()} == {
        "pieces_manquantes_client",
        "echeance_remise_offres",
        "conflit_pieces",
        "depot_client",
        "synthese_hebdo",
    }
    r = templates.render(
        "pieces_manquantes",
        {
            "organisme": service.ORGANISME | {"reponse": None},
            "prestation": "AO <script>",
            "client": "ABC",
            "site": "Lyon",
            "pieces": ["CCAP"],
            "destinataire": "Paul",
            "action": {"libelle": "Déposer", "lien": "https://x"},
        },
    )
    assert "&lt;script&gt;" in r.html and "<script>" not in r.html
    assert "- CCAP" in r.text and r.subject == "Pièces à déposer — AO <script>"


def test_missing_pieces_are_planned_once_and_wait_for_validation(client, team, demo, session, sender):
    _digest(session, demo.lyon, missing=["ccap", "ae"])
    h = team("analyste@gsms-security.com")
    r = client.post("/api/v1/communications/planifier", headers=h)
    assert r.status_code == 200 and r.json()["crees"] >= 2
    msgs = _messages(session, "pieces_manquantes_client")
    emails = {m.recipient_email for m in msgs}
    assert emails == {"direction@abc-retail.example", "responsable.lyon@abc-retail.example"}
    assert {m.status for m in msgs} == {MessageStatus.A_VALIDER} and not sender.sent  # externes : validation
    assert all(len(m.body_sha256) == 64 and "CCAP" in m.body_text for m in msgs)

    again = client.post("/api/v1/communications/planifier", headers=h).json()
    assert again["crees"] == 0  # idempotent

    done = client.post(f"/api/v1/communications/{msgs[0].id}/valider", headers=h).json()
    assert done["statut"] == "ENVOYE" and done["valide_par"].startswith("Analyste <")
    assert (
        sender.sent[0]["to"] == msgs[0].recipient_email and "/app/coffre-fort?ws=" in sender.sent[0]["html"]
    )
    assert {e.type for e in session.scalars(select(Event))} >= {"communication.created", "communication.sent"}


def test_message_no_longer_relevant_is_cancelled_with_reason(client, team, demo, session, sender):
    _digest(session, demo.lyon, missing=["ccap"])
    h = team("analyste@gsms-security.com")
    client.post("/api/v1/communications/planifier", headers=h)
    msg = _messages(session, "pieces_manquantes_client")[0]
    _digest(session, demo.lyon, missing=[])  # le client a tout déposé entre-temps
    r = client.post(f"/api/v1/communications/{msg.id}/valider", headers=h).json()
    assert r["statut"] == "ANNULE" and "déposées" in r["motif_annulation"] and not sender.sent


def test_internal_alerts_leave_without_validation(client, team, demo, session, sender):
    _digest(session, demo.paris, conflicts=["SSIAP1"], deadline=date.today() + timedelta(days=7))
    r = client.post("/api/v1/communications/planifier", headers=team("samir.iggui@gsms-security.com")).json()
    assert r["envoyes"] >= 2
    sent_rules = {m.rule_key for m in _messages(session) if m.status == MessageStatus.ENVOYE}
    assert {"conflit_pieces", "echeance_remise_offres"} <= sent_rules
    alert = _messages(session, "echeance_remise_offres")[0]
    assert alert.subject.startswith("[J-7] Remise des offres") and alert.recipient_kind.value == "EQUIPE"
    staff = {m.recipient_email for m in _messages(session, "conflit_pieces")}
    assert "samir.iggui@gsms-security.com" in staff and "lecteur@gsms-security.com" not in staff


def test_cancel_requires_a_reason_and_retry_after_failure(client, team, demo, session, app):
    app.state.settings.mail_enabled = True
    app.state.mail_sender = FakeSender(fail=smtplib.SMTPAuthenticationError(535, b"bad credentials"))
    _digest(session, demo.lyon, missing=["ccap"])
    h = team("analyste@gsms-security.com")
    client.post("/api/v1/communications/planifier", headers=h)
    first, second = _messages(session, "pieces_manquantes_client")
    failed = client.post(f"/api/v1/communications/{first.id}/valider", headers=h).json()
    assert failed["statut"] == "ECHEC" and "SMTPAuthenticationError" in failed["erreur"]
    assert failed["tentatives"] == 1

    app.state.mail_sender = FakeSender()
    ok = client.post(f"/api/v1/communications/{first.id}/renvoyer", headers=h).json()
    assert ok["statut"] == "ENVOYE" and ok["tentatives"] == 2

    empty = client.post(f"/api/v1/communications/{second.id}/annuler", headers=h, json={"motif": ""})
    assert empty.status_code == 422
    cancelled = client.post(
        f"/api/v1/communications/{second.id}/annuler", headers=h, json={"motif": "doublon"}
    )
    assert cancelled.json()["statut"] == "ANNULE" and cancelled.json()["motif_annulation"] == "doublon"
    assert client.post(f"/api/v1/communications/{second.id}/valider", headers=h).status_code == 409


def test_folders_counts_reader_and_preview(client, team, demo, session, sender):
    _digest(session, demo.lyon, missing=["ccap"])
    h = team("analyste@gsms-security.com")
    client.post("/api/v1/communications/planifier", headers=h)
    box = client.get("/api/v1/communications", headers=h).json()
    pieces = [m for m in box["messages"] if m["regle"] == "pieces_manquantes_client"]
    assert box["compteurs"]["A_VALIDER"] == 2 and len(pieces) == 2
    m = pieces[0]
    assert m["prestation"]["id"] == demo.lyon and m["regle_libelle"].startswith("Pièces manquantes")
    full = client.get(f"/api/v1/communications/{m['id']}", headers=h).json()
    assert full["html"].startswith("<!doctype html>") and full["texte"]
    page = client.get(f"/api/v1/communications/{m['id']}/apercu", headers=h)
    assert "default-src 'none'" in page.headers["content-security-policy"]
    only_paris = client.get("/api/v1/communications", headers=h, params={"workspace_id": demo.paris}).json()
    assert only_paris["messages"] == []


def test_missing_address_and_disabled_rules(client, team, demo, session, sender):
    from gsms_core.identity.models import User

    direction = session.scalar(select(User).where(User.email == "direction@abc-retail.example"))
    direction.email = ""  # compte client sans adresse exploitable
    session.commit()
    _digest(session, demo.lyon, missing=["ccap"], conflicts=["SSIAP1"])
    admin = team("samir.iggui@gsms-security.com")
    r = client.put(
        "/api/v1/admin/settings/relances",
        headers=admin,
        json={"regles_desactivees": ["conflit_pieces"], "adresse_reponse": "contact@gsms-security.com"},
    )
    assert r.status_code == 200 and r.json()["regles_desactivees"] == ["conflit_pieces"]
    client.post("/api/v1/communications/planifier", headers=admin)
    assert _messages(session, "conflit_pieces") == []
    assert MessageStatus.SANS_ADRESSE in {m.status for m in _messages(session, "pieces_manquantes_client")}
    bad = client.put(
        "/api/v1/admin/settings/relances", headers=admin, json={"regles_desactivees": ["inconnue"]}
    )
    assert bad.status_code == 400


def test_only_staff_reads_and_only_managers_act(client, team, demo, auth, session, sender):
    for who in ("lyon", "owner"):
        assert client.get("/api/v1/communications", headers=auth(who)).status_code == 403
    viewer = team("lecteur@gsms-security.com")
    assert client.get("/api/v1/communications", headers=viewer).status_code == 200
    assert client.post("/api/v1/communications/planifier", headers=viewer).status_code == 403


def test_weekly_summary_and_worker(db, settings, session, demo, team, monkeypatch):
    monday = date.today() - timedelta(days=date.today().weekday())
    result = plan(session, settings, monday)
    session.commit()
    assert result["crees"] >= 1
    [summary] = _messages(session, "synthese_hebdo")
    assert summary.recipient_email == "samir.iggui@gsms-security.com" and summary.workspace_id is None

    from gsms_core import cli

    monkeypatch.setattr("gsms_core.communications.sender.SmtpSender", lambda cfg: FakeSender())
    settings.mail_enabled = True
    assert cli._worker(settings, db, interval=1, once=True) == 0


def test_cli_mail_test(db, settings, monkeypatch, capsys):
    from gsms_core import cli

    fake = FakeSender()
    monkeypatch.setattr("gsms_core.communications.sender.SmtpSender", lambda cfg: fake)
    settings.mail_enabled = True
    assert cli._mail_test(settings, db, "moi@example.com") == 0
    assert fake.sent and "Envoyé à moi@example.com" in capsys.readouterr().out


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
        to="client@example.com",
        to_name="Client",
        subject="Sujet é",
        html="<p>a</p>",
        text="a",
        reply_to="r@x.fr",
    )
    assert sent["server"] == ("smtp.hostinger.com", 465) and sent["login"] == "admin@gsms-security.com"
    assert sent["msg"]["Reply-To"] == "r@x.fr" and msg_id.endswith("@gsms-security.com>")
