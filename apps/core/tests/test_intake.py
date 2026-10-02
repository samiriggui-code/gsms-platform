from __future__ import annotations

import uuid
from unittest.mock import patch

import httpx
from sqlalchemy import select

from gsms_core.connectors.base import CallContext
from gsms_core.connectors.crm import CrmClient
from gsms_core.events.models import Event
from gsms_core.intake.models import IntakeReceipt
from gsms_core.missions.models import Mission, MissionOrigin, MissionStatus, MissionType


def _payload(**overrides):
    base = {
        "type": "audit",
        "firstName": "Samir",
        "lastName": "Test",
        "email": "samir@example.com",
        "companyName": "Entrepôt Nord",
        "message": "Besoin d'un audit ERP",
        "source": "web",
    }
    base.update(overrides)
    return base


def test_intake_creates_mission_and_event(client, session):
    r = client.post(
        "/api/v1/intake",
        json=_payload(),
        headers={"Idempotency-Key": "intake-key-0001"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "received"
    assert body["mission_id"]
    assert body["workspace_id"]

    mission = session.get(Mission, uuid.UUID(body["mission_id"]))
    assert mission is not None
    assert mission.type == MissionType.AUDIT
    assert mission.status == MissionStatus.DRAFT
    assert mission.origin == MissionOrigin.INTAKE

    events = list(session.scalars(select(Event).where(Event.type == "intake.request.received")))
    assert len(events) == 1
    assert events[0].data["email"] == "samir@example.com"


def test_intake_idempotent_replay(client, session):
    headers = {"Idempotency-Key": "intake-key-replay"}
    first = client.post("/api/v1/intake", json=_payload(companyName="Société A"), headers=headers)
    second = client.post("/api/v1/intake", json=_payload(companyName="Société A"), headers=headers)
    assert first.status_code == 201
    assert second.status_code == 202
    assert first.json() == second.json()
    assert session.scalar(select(IntakeReceipt).where(IntakeReceipt.idempotency_key == "intake-key-replay"))
    missions = list(session.scalars(select(Mission).where(Mission.origin == MissionOrigin.INTAKE)))
    assert len(missions) == 1


def test_intake_requires_idempotency_key(client):
    r = client.post("/api/v1/intake", json=_payload())
    assert r.status_code == 400


def test_intake_contact_without_company_uses_inbox(client, session):
    r = client.post(
        "/api/v1/intake",
        json=_payload(type="contact", companyName=None, message="Bonjour GSMS"),
        headers={"Idempotency-Key": "intake-contact-1"},
    )
    assert r.status_code == 201, r.text
    mission = session.get(Mission, uuid.UUID(r.json()["mission_id"]))
    assert mission.type == MissionType.AUTRE
    assert mission.status == MissionStatus.DRAFT


def test_intake_rejects_audit_without_company(client):
    r = client.post(
        "/api/v1/intake",
        json=_payload(companyName=""),
        headers={"Idempotency-Key": "intake-bad-1"},
    )
    assert r.status_code == 422


def test_intake_relays_to_crm_when_configured(client, settings):
    calls: list[httpx.Request] = []

    def responder(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={"dealId": "deal-42"})

    settings.crm_url = "http://crm.test"
    settings.crm_public_key = "public-test-key"

    mock = CrmClient(
        "http://crm.test",
        public_key="public-test-key",
        transport=httpx.MockTransport(responder),
    )

    with patch("gsms_core.intake.router.accept_intake") as accept:
        from gsms_core.intake.service import accept_intake as real_accept

        def side_effect(db, body, *, idempotency_key, settings):
            return real_accept(db, body, idempotency_key=idempotency_key, settings=settings, crm=mock)

        accept.side_effect = side_effect
        r = client.post(
            "/api/v1/intake",
            json=_payload(companyName="Relay SA"),
            headers={"Idempotency-Key": "intake-relay-1"},
        )

    assert r.status_code == 201, r.text
    assert r.json()["status"] == "relayed"
    assert len(calls) == 1
    assert calls[0].url.path == "/api/public/audit-request"
    assert calls[0].headers["x-gsms-public-key"] == "public-test-key"


def test_crm_submit_public_intake_payload_shape():
    calls: list[httpx.Request] = []

    def responder(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={"id": "act-1"})

    ctx = CallContext(workspace_id="ws-1", actor="intake:a@b.c", correlation_id="c1")
    with CrmClient(
        "http://crm.test", public_key="k", transport=httpx.MockTransport(responder)
    ) as crm:
        out = crm.submit_public_intake(
            ctx,
            {
                "type": "contact",
                "firstName": "A",
                "email": "a@b.c",
                "message": "hello",
            },
        )
    assert out["id"] == "act-1"
    assert calls[0].url.path == "/api/public/contact"
    assert calls[0].headers["X-GSMS-Workspace-Id"] == "ws-1"
    assert calls[0].headers["x-gsms-public-key"] == "k"
