from __future__ import annotations

import uuid

from sqlalchemy import select

from gsms_core.events.models import Event
from tests.helpers import finding_event, post_signed


def test_valid_signature_is_accepted(client, demo, session):
    r = post_signed(client, finding_event(demo.lyon, severity="information"))
    assert r.status_code == 202, r.text
    ev = session.get(Event, r.json()["id"])
    assert ev.source == "grace" and ev.actor == "service:grace"
    assert ev.correlation_id == ev.id


def test_bad_or_missing_signature_is_rejected(client, demo, session):
    assert post_signed(client, finding_event(demo.lyon), secret="wrong-secret").status_code == 401
    assert post_signed(client, finding_event(demo.lyon), signature="").status_code == 401
    # secret d'une autre source
    assert post_signed(client, finding_event(demo.lyon), secret="test-qatrial-secret").status_code == 401
    assert session.scalars(select(Event)).first() is None


def test_unknown_source_and_workspace(client, demo):
    assert post_signed(client, finding_event(demo.lyon), source="unknown").status_code == 404
    assert post_signed(client, finding_event(str(uuid.uuid4()))).status_code == 422
    bad_type = {**finding_event(demo.lyon), "type": "Not A Type"}
    assert post_signed(client, bad_type).status_code == 422


def test_ingest_is_idempotent_by_event_id(client, demo, session):
    payload = {**finding_event(demo.lyon, severity="information"), "id": "evt_grace_0001"}
    assert post_signed(client, payload).json() == {"id": "evt_grace_0001", "duplicate": False}
    assert post_signed(client, payload).json() == {"id": "evt_grace_0001", "duplicate": True}


def test_events_listing_is_workspace_scoped(client, auth, demo):
    post_signed(client, finding_event(demo.paris, severity="information"))
    lyon = client.get(f"/api/v1/workspaces/{demo.lyon}/events", headers=auth("lyon"))
    paris = client.get(
        f"/api/v1/workspaces/{demo.paris}/events?type=grace.finding.created", headers=auth("paris")
    )
    assert lyon.status_code == 200 and lyon.json() == []
    assert [e["subject_uri"] for e in paris.json()] == ["grace://finding/4f2a"]
    assert client.get(f"/api/v1/workspaces/{demo.paris}/events", headers=auth("lyon")).status_code == 403
