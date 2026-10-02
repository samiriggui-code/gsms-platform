from __future__ import annotations

import uuid
from datetime import timedelta

from gsms_core.db import utcnow
from gsms_core.events.models import Event
from gsms_core.missions.models import Mission, MissionStatus, MissionType
from gsms_core.work.models import Action, ActionStatus, Deadline, DeadlineKind, FindingRef, Severity


def test_dashboard_empty_but_ok(client, auth, demo):
    r = client.get(f"/api/v1/workspaces/{demo.lyon}/dashboard", headers=auth("lyon"))
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"attention", "deadlines", "missions", "activity"}
    assert isinstance(body["attention"], list)
    assert isinstance(body["deadlines"], list)
    assert isinstance(body["missions"], list)
    assert isinstance(body["activity"], list)


def test_dashboard_forbidden_other_workspace(client, auth, demo):
    r = client.get(f"/api/v1/workspaces/{demo.paris}/dashboard", headers=auth("lyon"))
    assert r.status_code == 403


def test_dashboard_aggregates(client, auth, demo, session):
    ws = uuid.UUID(demo.lyon)
    now = utcnow()
    session.add_all(
        [
            Mission(
                workspace_id=ws,
                type=MissionType.AUDIT,
                title="Audit ERP Lyon",
                status=MissionStatus.OPEN,
                due_at=now + timedelta(days=10),
            ),
            Mission(
                workspace_id=ws,
                type=MissionType.ACCOMPAGNEMENT,
                title="Mission clôturée",
                status=MissionStatus.COMPLETED,
            ),
            Action(
                workspace_id=ws,
                title="Corriger extincteurs",
                status=ActionStatus.OPEN,
                priority=Severity.CRITICAL,
                due_at=now + timedelta(days=2),
            ),
            FindingRef(
                workspace_id=ws,
                source_uri="grace://finding/1",
                severity=Severity.MAJOR,
                status="non_conforme",
                title="Issue majeure",
            ),
            Deadline(
                workspace_id=ws,
                subject_uri="mission://audit-erp/remise",
                kind=DeadlineKind.REGULATORY,
                due_at=now + timedelta(days=5),
            ),
            Event(
                id="evt-dashboard-1",
                type="mission.opened",
                source="core",
                subject_uri="mission://x",
                workspace_id=ws,
                actor="user:test",
                data={},
                correlation_id="corr-1",
            ),
        ]
    )
    session.commit()

    r = client.get(f"/api/v1/workspaces/{demo.lyon}/dashboard", headers=auth("lyon"))
    assert r.status_code == 200
    body = r.json()
    assert any(i["title"] == "Corriger extincteurs" for i in body["attention"])
    assert any(i["title"] == "Issue majeure" for i in body["attention"])
    assert any(i["title"] == "mission://audit-erp/remise" for i in body["deadlines"])
    assert any(i["title"] == "Audit ERP Lyon" for i in body["missions"])
    assert not any(i["title"] == "Mission clôturée" for i in body["missions"])
    assert any(i["title"] == "mission.opened" for i in body["activity"])


def test_dashboard_requires_auth(client, demo):
    assert client.get(f"/api/v1/workspaces/{demo.lyon}/dashboard").status_code == 401
