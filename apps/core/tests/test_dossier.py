from __future__ import annotations

from gsms_core.documents.dossier import DEFAULT_TEMPLATES, compute_completeness
from gsms_core.documents.models import DossierTemplate
from gsms_core.missions.models import MissionType


def test_compute_completeness_pure():
    c = compute_completeness("t", ["rc", "cctp", "ccap", "rc"], ["cctp", None, "autre", "cctp"])
    assert c.required == ["rc", "cctp", "ccap"]
    assert c.present == ["cctp"]
    assert c.missing == ["rc", "ccap"]
    assert c.ratio == round(1 / 3, 4)
    assert compute_completeness(None, [], []).ratio == 1.0


def test_dossier_endpoint_lists_missing_pieces(client, auth, demo, session):
    # Le seed crée les templates en base (= DEFAULT_TEMPLATES) et une mission commission à Lyon.
    missions = client.get(f"/api/v1/workspaces/{demo.lyon}/missions", headers=auth("lyon")).json()
    mission = next(m for m in missions if m["type"] == "COMMISSION_SECURITE")
    code, required = DEFAULT_TEMPLATES[MissionType.COMMISSION_SECURITE]

    for i, doc_type in enumerate(["registre_securite", "notice_securite"]):
        r = client.post(
            f"/api/v1/workspaces/{demo.lyon}/documents",
            headers=auth("lyon"),
            files={"file": (f"{doc_type}.pdf", f"contenu {i}".encode(), "application/pdf")},
            data={"doc_type": doc_type, "mission_id": mission["id"]},
        )
        assert r.status_code == 201
    # pièce hors mission : ne compte pas
    client.post(
        f"/api/v1/workspaces/{demo.lyon}/documents",
        headers=auth("lyon"),
        files={"file": ("plan.pdf", b"plan", "application/pdf")},
        data={"doc_type": "plan_evacuation"},
    )

    d = client.get(
        f"/api/v1/workspaces/{demo.lyon}/missions/{mission['id']}/dossier", headers=auth("lyon")
    ).json()
    assert d["template_code"] == code
    assert d["present"] == ["registre_securite", "notice_securite"]
    assert "plan_evacuation" in d["missing"]
    assert len(d["missing"]) == len(required) - 2
    assert d["completeness"] == round(2 / len(required), 4)


def test_dossier_uses_db_template_and_is_workspace_scoped(client, auth, demo, session):
    tpl = session.query(DossierTemplate).filter_by(mission_type=MissionType.AUDIT).one()
    tpl.required_doc_types = ["procedure_surete"]
    session.commit()
    paris_mission = client.get(f"/api/v1/workspaces/{demo.paris}/missions", headers=auth("paris")).json()[0]
    d = client.get(
        f"/api/v1/workspaces/{demo.paris}/missions/{paris_mission['id']}/dossier", headers=auth("paris")
    ).json()
    assert d["missing"] == ["procedure_surete"]
    r = client.get(
        f"/api/v1/workspaces/{demo.lyon}/missions/{paris_mission['id']}/dossier", headers=auth("lyon")
    )
    assert r.status_code == 404
