"""GO / NO-GO documenté : profil GSMS, matrice de faisabilité READY / WARNING / BLOCKED justifiée et sourcée,
grille de notation, décision humaine qui garde la trace de ce que montrait la matrice."""

from __future__ import annotations

from datetime import date, datetime, timedelta

import pytest
from sqlalchemy import select

from gsms_core.audit.models import AuditLog
from gsms_core.documents.parsers import DoclingAdapter
from gsms_core.events.models import Event
from gsms_core.tenders.feasibility import _deadline, _financial
from gsms_core.tenders.models import TenderCase
from gsms_core.tenders.profile import CompanyProfile
from tests.fake_docling import FakeConverter
from tests.test_tender_requirements import CCTP_AO, RC_AO

PROFILE = {
    "raison_sociale": "GSMS",
    "cnaps_autorisation": "AUT-069-2112-07-20-20230000000",
    "cnaps_validite": "2030-01-01",
    "certifications": ["ISO 9001"],
    "effectifs": {"SSIAP1": 20, "SSIAP2": 3},
    "delai_mobilisation_jours": 15,
    "chiffre_affaires_annuel": 2_000_000,
    "reprise_personnel": True,
    "sous_traitance": True,
}


@pytest.fixture
def converter(app):
    conv = FakeConverter({"RC.pdf": RC_AO, "CCTP.pdf": CCTP_AO})
    app.state.document_parser = DoclingAdapter(converter_factory=lambda: conv)
    return conv


def _dossier(client, staff, **extra):
    body = {"title": "Sûreté du CHU", "buyer": "HCL", **extra}
    r = client.post("/api/v1/tenders", headers=staff, json=body)
    assert r.status_code == 201, r.text
    d = r.json()
    return d, f"/api/v1/workspaces/{d['workspace_id']}/tenders/{d['mission_id']}"


def _dims(body):
    return {d["key"]: d for d in body["feasibility"]["dimensions"]}


def test_profile_is_team_only_and_validated(client, staff, auth):
    empty = client.get("/api/v1/tenders/profile", headers=staff).json()
    assert "autorisation CNAPS" in empty["missing"] and empty["qualifications"]["SSIAP1"] == "Agent SSIAP 1"
    assert client.get("/api/v1/tenders/profile", headers=auth("owner")).status_code == 403
    assert client.put("/api/v1/tenders/profile", headers=auth("consultant"), json=PROFILE).status_code == 403
    bad = client.put("/api/v1/tenders/profile", headers=staff, json={**PROFILE, "effectifs": {"PILOTE": 2}})
    assert bad.status_code == 422
    saved = client.put("/api/v1/tenders/profile", headers=staff, json=PROFILE)
    assert saved.status_code == 200, saved.text
    assert saved.json()["missing"] == [] and saved.json()["profile"]["effectifs"]["SSIAP2"] == 3
    assert saved.json()["updated_by"].startswith("user:")


def test_without_dce_the_dossier_is_blocked(client, staff):
    _d, base = _dossier(client, staff)
    body = client.get(f"{base}/go-no-go", headers=staff).json()
    assert body["feasibility"]["status"] == "BLOCKED"
    assert _dims(body)["documentaire"]["justification"].startswith("DCE non déposé")


def test_feasibility_matrix_is_justified_and_sourced(client, staff, converter, session):
    client.put("/api/v1/tenders/profile", headers=staff, json=PROFILE)
    deadline = (datetime.now() + timedelta(days=30)).replace(microsecond=0).isoformat()
    _d, base = _dossier(client, staff, submission_deadline=deadline, estimated_amount=400_000)
    for name in ("RC.pdf", "CCTP.pdf"):
        r = client.post(f"{base}/dce", headers=staff, files=[("files", (name, name.encode()))])
        assert r.status_code == 201

    body = client.get(f"{base}/go-no-go", headers=staff).json()
    dims = _dims(body)
    assert len(dims) == 11
    human = dims["humaine"]
    # 24 h/24 détecté : 1 chef d'équipe SSIAP 2 ≈ 5,5 agents, 3 mobilisables → à arbitrer.
    assert human["status"] == "WARNING" and "5,5" in human["justification"]
    assert human["sources"] and human["sources"][0]["label"].startswith("CCTP.pdf p. 2")
    assert dims["reglementaire"]["status"] == "READY" and "AUT-069" in dims["reglementaire"]["justification"]
    assert dims["financiere"]["status"] == "READY" and "20%" in dims["financiere"]["justification"]
    assert dims["delai"]["status"] == "READY"
    assert dims["certifications"]["status"] == "READY"
    assert dims["risques"]["status"] == "WARNING"
    assert dims["dependances"]["status"] == "WARNING"  # visite obligatoire pas encore faite
    assert dims["dependances"]["sources"][0]["label"].startswith("REQ-")
    assert body["feasibility"]["status"] == "WARNING"

    # Plus aucun chef d'équipe SSIAP 2 disponible : capacité humaine bloquante, dossier BLOCKED.
    client.put(
        "/api/v1/tenders/profile", headers=staff, json={**PROFILE, "effectifs": {"SSIAP1": 20, "SSIAP2": 0}}
    )
    blocked = client.get(f"{base}/go-no-go", headers=staff).json()
    assert blocked["feasibility"]["status"] == "BLOCKED" and _dims(blocked)["humaine"]["status"] == "BLOCKED"

    # La décision reste humaine et garde la trace de ce que montrait la matrice.
    decided = client.post(
        f"{base}/go-no-go/decision",
        headers=staff,
        json={"decision": "NO_GO", "rationale": "Pas de chef d'équipe SSIAP 2 disponible en novembre"},
    )
    assert decided.status_code == 200, decided.text
    ev = session.scalars(select(Event).where(Event.type == "tender.go_no_go.decided")).one()
    assert ev.data["feasibility"]["status"] == "BLOCKED"
    assert ev.data["feasibility"]["dimensions"]["humaine"] == "BLOCKED"
    audit = session.scalars(select(AuditLog).where(AuditLog.action == "tender.go_no_go.decide")).one()
    assert audit.after["feasibility"]["status"] == "BLOCKED"


def test_grid_and_dossier_edits(client, staff, session):
    _d, base = _dossier(client, staff)
    grid = {
        "criteria": [
            {"code": "adequation", "label": "Adéquation métier", "weight": 3, "score": 4},
            {"code": "rentabilite", "label": "Rentabilité", "weight": 2, "score": 2},
        ]
    }
    r = client.put(f"{base}/go-no-go/criteria", headers=staff, json=grid)
    assert r.status_code == 200, r.text
    assert r.json()["score"] == 64.0 and r.json()["recommendation"] == "GO"
    assert [c["label"] for c in r.json()["criteria"]] == ["Adéquation métier", "Rentabilité"]
    bad = client.put(
        f"{base}/go-no-go/criteria", headers=staff, json={"criteria": [{**grid["criteria"][0], "score": 9}]}
    )
    assert bad.status_code == 422

    patched = client.patch(f"{base}", headers=staff, json={"estimated_amount": 250000, "buyer": "  "})
    assert patched.status_code == 200, patched.text
    assert patched.json()["amount"] == 250000 and patched.json()["buyer"] is None
    assert client.patch(f"{base}", headers=staff, json={"title": " "}).status_code == 422

    client.post(f"{base}/go-no-go/decision", headers=staff, json={"decision": "GO", "rationale": "OK"})
    frozen = client.put(f"{base}/go-no-go/criteria", headers=staff, json=grid)
    assert frozen.status_code == 422


def test_financial_and_deadline_thresholds():
    case = TenderCase(title="x", estimated_amount=1_500_000)
    profile = CompanyProfile(chiffre_affaires_annuel=1_000_000)
    assert _financial(case, profile).status == "BLOCKED"
    case.estimated_amount = 600_000
    assert _financial(case, profile).status == "WARNING"
    assert _financial(TenderCase(title="x"), profile).status == "WARNING"

    today = date(2026, 10, 3)
    case.submission_deadline = datetime(2026, 10, 1, 12)
    assert _deadline(case, profile, today).status == "BLOCKED"
    case.submission_deadline = datetime(2026, 10, 5, 12)
    assert _deadline(case, profile, today).status == "BLOCKED"
    case.submission_deadline = datetime(2026, 10, 10, 12)
    assert _deadline(case, profile, today).status == "WARNING"
    case.submission_deadline = datetime(2026, 11, 15, 12)
    assert _deadline(case, profile, today).status == "READY"
