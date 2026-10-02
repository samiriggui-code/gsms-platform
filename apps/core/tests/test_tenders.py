from __future__ import annotations

import uuid

import pytest
from sqlalchemy import select

from gsms_core.events.bus import pending_outbox
from gsms_core.events.models import Event
from gsms_core.missions.models import Mission, MissionType
from gsms_core.tenders.models import GoNoGo
from gsms_core.tenders.scoring import Criterion, compute_score, evaluate
from gsms_core.tenders.service import TenderError, decide, open_case, score_case

CRITERIA = [
    Criterion("adequation_metier", weight=3, score=4),
    Criterion("capacite_production", weight=2, score=3),
    Criterion("rentabilite", weight=2, score=2),
    Criterion("relation_acheteur", weight=1, score=5),
]


def test_score_is_deterministic_weighted_mean():
    # (3*4 + 2*3 + 2*2 + 1*5) / (8 * 5) = 27/40
    assert compute_score(CRITERIA) == 67.5
    assert compute_score(list(reversed(CRITERIA))) == 67.5
    assert compute_score([]) == 0.0
    assert evaluate(CRITERIA).recommendation == GoNoGo.GO
    assert evaluate(CRITERIA, go_threshold=70).recommendation == GoNoGo.NO_GO


def test_eliminatory_criterion_forces_no_go():
    crit = [*CRITERIA, Criterion("visite_obligatoire_possible", weight=0.5, score=0, eliminatory=True)]
    result = evaluate(crit)
    assert result.recommendation == GoNoGo.NO_GO and result.blocking == ["visite_obligatoire_possible"]


def test_invalid_criterion():
    with pytest.raises(ValueError):
        Criterion("x", weight=1, score=6)
    with pytest.raises(ValueError):
        Criterion("x", weight=-1, score=1)


def test_case_lifecycle(session, demo):
    ws = uuid.UUID(demo.lyon)
    audit_mission = Mission(workspace_id=ws, type=MissionType.AUDIT, title="audit")
    ao = Mission(workspace_id=ws, type=MissionType.APPEL_OFFRES, title="AO gardiennage Lyon")
    session.add_all([audit_mission, ao])
    session.flush()
    with pytest.raises(TenderError):
        open_case(session, audit_mission, title="x", actor="user:1")

    case = open_case(session, ao, title="Gardiennage Part-Dieu", actor="user:1", buyer="Métropole")
    score_case(session, case, CRITERIA, actor="user:1")
    assert case.score == 67.5 and case.recommendation == GoNoGo.GO and case.decision == GoNoGo.PENDING

    with pytest.raises(TenderError, match="motivation"):
        decide(session, case, GoNoGo.NO_GO, decided_by="user:1", rationale="  ")
    with pytest.raises(TenderError, match="humain"):
        decide(session, case, GoNoGo.GO, decided_by="agent:eve", rationale="score ok")

    decide(session, case, GoNoGo.NO_GO, decided_by="user:1", rationale="Charge de travail trop élevée en Q4")
    assert case.decision == GoNoGo.NO_GO and case.decided_at is not None
    ev = session.scalars(select(Event).where(Event.type == "tender.go_no_go.decided")).one()
    assert ev.data["overrides_recommendation"] is True and ev.mission_id == ao.id
    assert [o.destination for o in pending_outbox(session)] == ["crm"]
    with pytest.raises(TenderError, match="déjà"):
        decide(session, case, GoNoGo.GO, decided_by="user:1", rationale="revirement")
