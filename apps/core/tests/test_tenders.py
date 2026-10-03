from __future__ import annotations

import json
import uuid

import httpx
import pytest
from sqlalchemy import select

from gsms_core.events.bus import pending_outbox
from gsms_core.events.models import Event
from gsms_core.missions.models import Mission, MissionType
from gsms_core.tenders.models import GoNoGo
from gsms_core.tenders.opportunities import normalize_opportunities
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


def test_tenders_http_list_summary_go_no_go(client, auth, demo, session):
    ws = uuid.UUID(demo.lyon)
    ao = Mission(workspace_id=ws, type=MissionType.APPEL_OFFRES, title="AO HTTP")
    session.add(ao)
    session.flush()
    case = open_case(session, ao, title="Marché gardiennage", actor="user:1", buyer="Ville")
    score_case(session, case, CRITERIA, actor="user:1")
    session.commit()

    h = auth("consultant")
    listed = client.get(f"/api/v1/workspaces/{demo.lyon}/tenders", headers=h)
    assert listed.status_code == 200
    assert any(i["id"] == str(ao.id) for i in listed.json())

    summary = client.get(f"/api/v1/workspaces/{demo.lyon}/tenders/{ao.id}", headers=h)
    assert summary.status_code == 200
    assert summary.json()["buyer"] == "Ville"
    assert summary.json()["title"] == "Marché gardiennage"

    gng = client.get(f"/api/v1/workspaces/{demo.lyon}/tenders/{ao.id}/go-no-go", headers=h)
    assert gng.status_code == 200
    body = gng.json()
    assert body["score"] == 67.5
    assert body["recommendation"] == "GO"
    assert body["decision"] is None
    assert len(body["criteria"]) == 4

    decided = client.post(
        f"/api/v1/workspaces/{demo.lyon}/tenders/{ao.id}/go-no-go/decision",
        headers=h,
        json={"decision": "GO", "rationale": "Capacité et marge OK pour Q4"},
    )
    assert decided.status_code == 200, decided.text
    assert decided.json()["decision"]["value"] == "GO"

    forbidden = client.get(f"/api/v1/workspaces/{demo.paris}/tenders/{ao.id}", headers=auth("lyon"))
    assert forbidden.status_code == 403


def test_tenders_opportunities_via_lexsocket_mcp(client, auth, demo, app, settings):
    settings.lexsocket_mcp_token = "mcp-token"
    settings.lexsocket_mcp_url = "http://lexsocket.test/mcp"
    app.state.settings = settings

    class LexServer:
        def __call__(self, req: httpx.Request) -> httpx.Response:
            msg = json.loads(req.content)
            if "id" not in msg:
                return httpx.Response(202)
            if msg["method"] == "initialize":
                return httpx.Response(
                    200,
                    json={
                        "jsonrpc": "2.0",
                        "id": msg["id"],
                        "result": {"protocolVersion": "2025-06-18", "serverInfo": {"name": "lex"}},
                    },
                    headers={"Mcp-Session-Id": "lex-1"},
                )
            assert msg["params"]["name"] == "get_open_opportunities"
            payload = {
                "items": [
                    {
                        "id": "ted-1",
                        "title": "Gardiennage ERP Lyon",
                        "buyer": "Métropole",
                        "cpv": "79710000",
                        "nuts": "FRK2",
                        "amount": 120000,
                        "deadline": "2026-11-01",
                    }
                ]
            }
            return httpx.Response(
                200,
                json={
                    "jsonrpc": "2.0",
                    "id": msg["id"],
                    "result": {"content": [{"type": "text", "text": json.dumps(payload)}]},
                },
            )

    app.state.mcp_transport = httpx.MockTransport(LexServer())
    r = client.get(f"/api/v1/workspaces/{demo.lyon}/tenders/opportunities", headers=auth("lyon"))
    assert r.status_code == 200, r.text
    assert r.json()[0]["title"] == "Gardiennage ERP Lyon"
    assert r.json()[0]["cpv"] == "79710000"


def test_tenders_opportunities_empty_without_token(client, auth, demo):
    r = client.get(f"/api/v1/workspaces/{demo.lyon}/tenders/opportunities", headers=auth("lyon"))
    assert r.status_code == 200
    assert r.json() == []


def test_normalize_opportunities_from_content_block():
    raw = {
        "content": [
            {
                "type": "text",
                "text": json.dumps(
                    {"opportunities": [{"id": "1", "title": "SSIAP", "buyer": {"name": "CHU"}}]}
                ),
            }
        ]
    }
    rows = normalize_opportunities(raw)
    assert len(rows) == 1
    assert rows[0].buyer == "CHU"
