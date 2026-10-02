from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from gsms_core.events.bus import pending_outbox, publish
from gsms_core.events.envelope import EventEnvelope
from gsms_core.events.models import Event
from gsms_core.work import rules
from gsms_core.work.models import Action, ActionStatus, Deadline, Severity
from gsms_core.workflows.models import WorkflowInstance
from tests.helpers import finding_event, post_signed

OCCURRED = datetime(2026, 10, 1, 9, 0, tzinfo=UTC)


@pytest.mark.parametrize(
    ("sev", "days"),
    [("critique", 7), ("majeure", 30), ("mineure", 90), ("critical", 7), ("major", 30), ("minor", 90)],
)
def test_due_date_from_severity(sev, days):
    assert rules.due_date_for(rules.normalize_severity(sev), OCCURRED) == OCCURRED + timedelta(days=days)


def test_capa_rule():
    assert rules.capa_required(Severity.CRITICAL)
    assert not rules.capa_required(Severity.MAJOR)
    assert rules.capa_required(Severity.MAJOR, explicit=True)
    assert rules.capa_required(Severity.MINOR, recurrence=True)


def _finding(session, ws: str, **kw) -> Event:
    payload = finding_event(ws, **kw)
    env = EventEnvelope(source="grace", actor="service:grace", **payload)
    ev, _ = publish(session, env)
    session.commit()
    return ev


def _instance(session) -> WorkflowInstance:
    return session.scalars(select(WorkflowInstance)).one()


def test_critical_finding_creates_action_and_requests_capa(session, demo):
    ev = _finding(session, demo.lyon, severity="critique")
    action = session.scalars(select(Action)).one()
    assert action.priority == Severity.CRITICAL
    assert action.due_at == OCCURRED + timedelta(days=7)
    assert action.capa_required and action.status == ActionStatus.OPEN
    assert str(action.workspace_id) == demo.lyon
    inst = _instance(session)
    assert inst.state == "open" and inst.subject_uri == f"action://{action.id}"
    assert inst.context["finding_uri"] == "grace://finding/4f2a"
    assert set(inst.waiting_for) == {"capa.created", "evidence.added"}
    capa = session.scalars(select(Event).where(Event.type == "capa.requested")).one()
    assert capa.causation_id == ev.id and capa.correlation_id == ev.correlation_id
    assert [o.destination for o in pending_outbox(session)] == ["qatrial"]
    assert session.scalars(select(Deadline)).one().due_at == action.due_at


def test_major_finding_without_capa_and_below_threshold(session, demo):
    _finding(session, demo.lyon, severity="majeure", fid="a")
    _finding(session, demo.lyon, severity="information", fid="b")
    _finding(session, demo.lyon, severity="critique", fid="c", status="conforme")
    actions = list(session.scalars(select(Action)))
    assert len(actions) == 1 and not actions[0].capa_required
    assert actions[0].due_at == OCCURRED + timedelta(days=30)
    assert session.scalars(select(Event).where(Event.type == "capa.requested")).first() is None


def test_threshold_setting_filters_minor(session, demo, app):
    app.state.workflows.settings = app.state.settings.model_copy(
        update={"remediation_severity_threshold": "major"}
    )
    _finding(session, demo.lyon, severity="mineure")
    assert session.scalars(select(Action)).first() is None
    _finding(session, demo.lyon, severity="majeure", fid="z")
    assert session.scalars(select(Action)).one().priority == Severity.MAJOR


def _core_event(ws: str, type_: str, subject: str, **data) -> EventEnvelope:
    return EventEnvelope(
        type=type_, source="core", subject=subject, workspace_id=uuid.UUID(ws), actor="user:test", data=data
    )


def test_full_transitions(session, demo):
    _finding(session, demo.lyon, severity="critique", capa_required=True)
    action = session.scalars(select(Action)).one()
    uri = f"action://{action.id}"

    publish(
        session,
        _core_event(
            demo.lyon,
            "qatrial.capa.created",
            "qatrial://capa/118",
            action_uri=uri,
            capa_uri="qatrial://capa/118",
        ),
    )
    assert action.capa_uri == "qatrial://capa/118" and _instance(session).state == "open"

    # evidence.added sans version : garde refusée
    publish(session, _core_event(demo.lyon, "evidence.added", uri))
    assert _instance(session).state == "open"

    publish(session, _core_event(demo.lyon, "evidence.added", uri, document_version_id=str(uuid.uuid4())))
    assert _instance(session).state == "verification" and action.status == ActionStatus.VERIFYING

    publish(session, _core_event(demo.lyon, "action.rejected", uri))
    assert _instance(session).state == "open" and action.status == ActionStatus.IN_PROGRESS

    publish(session, _core_event(demo.lyon, "evidence.added", uri, document_version_id=str(uuid.uuid4())))
    publish(session, _core_event(demo.lyon, "action.verified", uri))
    inst = _instance(session)
    assert inst.state == "closed" and inst.waiting_for == []
    assert action.status == ActionStatus.CLOSED and action.closed_at is not None
    assert session.scalars(select(Event).where(Event.type == "action.closed")).one().subject_uri == uri
    assert [h["to"] for h in inst.context["history"]] == [
        "open",
        "verification",
        "open",
        "verification",
        "closed",
    ]
    # un instance fermée n'avance plus
    publish(session, _core_event(demo.lyon, "action.rejected", uri))
    assert _instance(session).state == "closed"


def test_events_from_other_workspace_do_not_advance(session, demo):
    _finding(session, demo.lyon, severity="majeure")
    uri = f"action://{session.scalars(select(Action)).one().id}"
    publish(session, _core_event(demo.paris, "evidence.added", uri, document_version_id=str(uuid.uuid4())))
    assert _instance(session).state == "open"


def test_end_to_end_via_api(client, auth, demo, session):
    assert post_signed(client, finding_event(demo.lyon, severity="majeure")).status_code == 202
    actions = client.get(f"/api/v1/workspaces/{demo.lyon}/actions", headers=auth("consultant")).json()
    assert len(actions) == 1 and actions[0]["status"] == "OPEN"
    action_id = actions[0]["id"]
    base = f"/api/v1/workspaces/{demo.lyon}/actions/{action_id}"

    # vérification impossible tant qu'aucune preuve n'est déposée
    assert client.post(f"{base}/verify", json={}, headers=auth("consultant")).status_code == 409

    up = client.post(
        f"/api/v1/workspaces/{demo.lyon}/documents",
        headers=auth("lyon"),
        files={"file": ("facture.pdf", b"verification extincteurs", "application/pdf")},
    ).json()
    r = client.post(
        f"{base}/evidence", json={"document_version_id": up["version"]["id"]}, headers=auth("lyon")
    )
    assert r.status_code == 201 and r.json()["document_version_id"] == up["version"]["id"]
    assert client.get(base, headers=auth("lyon")).json()["status"] == "VERIFYING"

    # client_member ne peut pas valider ; le consultant oui
    assert client.post(f"{base}/verify", json={}, headers=auth("lyon")).status_code == 403
    r = client.post(f"{base}/verify", json={"accepted": True}, headers=auth("consultant"))
    assert r.status_code == 200 and r.json()["status"] == "CLOSED"


def test_evidence_must_reference_version_in_same_workspace(client, auth, demo):
    post_signed(client, finding_event(demo.lyon, severity="majeure"))
    action_id = client.get(f"/api/v1/workspaces/{demo.lyon}/actions", headers=auth("lyon")).json()[0]["id"]
    paris_up = client.post(
        f"/api/v1/workspaces/{demo.paris}/documents",
        headers=auth("paris"),
        files={"file": ("p.pdf", b"paris-only", "application/pdf")},
    ).json()
    r = client.post(
        f"/api/v1/workspaces/{demo.lyon}/actions/{action_id}/evidence",
        json={"document_version_id": paris_up["version"]["id"]},
        headers=auth("lyon"),
    )
    assert r.status_code == 404
