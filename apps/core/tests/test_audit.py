from __future__ import annotations

from itertools import pairwise

from sqlalchemy import select, text

from gsms_core.audit.models import AuditLog
from gsms_core.audit.service import GENESIS_HASH, record, verify_chain


def _fill(session, n=4):
    for i in range(n):
        record(
            session,
            actor="user:test",
            action="thing.update",
            subject_uri=f"mission://{i}",
            before={"i": i},
            after={"i": i + 1, "label": "éé"},
        )
    session.commit()


def test_chain_verifies(session):
    _fill(session)
    rows = list(session.scalars(select(AuditLog).order_by(AuditLog.id)))
    assert rows[0].prev_hash == GENESIS_HASH
    assert all(b.prev_hash == a.hash for a, b in pairwise(rows))
    result = verify_chain(session)
    assert result.ok and result.checked == 4


def test_tampered_content_is_detected(session):
    _fill(session)
    session.execute(text("UPDATE audit_log SET after = :v WHERE id = 3"), {"v": '{"i": 999}'})
    session.commit()
    session.expire_all()
    result = verify_chain(session)
    assert not result.ok and result.broken_at == 3 and result.reason == "contenu altéré"


def test_deleted_entry_is_detected(session):
    _fill(session)
    session.execute(text("DELETE FROM audit_log WHERE id = 2"))
    session.commit()
    session.expire_all()
    result = verify_chain(session)
    assert not result.ok and result.broken_at == 3


def test_api_writes_are_audited(client, auth, demo, session):
    r = client.post(
        f"/api/v1/workspaces/{demo.lyon}/missions",
        json={"type": "CONFORMITE", "title": "RGPD"},
        headers=auth("consultant"),
    )
    assert r.status_code == 201
    entry = session.scalar(select(AuditLog).where(AuditLog.action == "mission.create"))
    assert entry.subject_uri == f"mission://{r.json()['id']}"
    assert entry.actor.startswith("user:")
    assert verify_chain(session).ok
