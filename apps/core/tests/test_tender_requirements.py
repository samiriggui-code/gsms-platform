"""Matrice d'exigences AO : extraction par thème, critères pondérés, synchronisation avec le Digest,
édition humaine, rectificatif du DCE (exigence disparue marquée, réponses conservées)."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import select

from gsms_core.digest.engine import DigestEngine
from gsms_core.documents.parsers import DoclingAdapter, ParseRequest
from gsms_core.events.models import Event
from gsms_core.missions.models import MissionType
from gsms_core.tenders.requirements import candidates
from tests.fake_docling import FakeConverter, FakeDoc, text

RC_AO = FakeDoc(
    [
        text("title", "Règlement de la consultation", 1, "#/texts/0"),
        text("section_header", "Article 5 — Pièces à fournir", 2, "#/texts/1"),
        text("list_item", "Mémoire technique", 2, "#/texts/2"),
        text("list_item", "DC1 et DC2 signés", 2, "#/texts/3"),
        text("list_item", "Attestation d'assurance en cours de validité", 2, "#/texts/4"),
        text("section_header", "Article 7 — Critères de jugement des offres", 3, "#/texts/5"),
        text(
            "text",
            "Les offres seront jugées selon les critères suivants : Prix : 40 % ; Valeur technique : 60 %.",
            3,
            "#/texts/6",
        ),
        text("text", "La visite des lieux est obligatoire avant la remise de l'offre.", 3, "#/texts/7"),
        text("text", "Date limite de remise des offres : 15/11/2026 à 12h00.", 4, "#/texts/8"),
        text("text", "Toute offre incomplète sera rejetée.", 4, "#/texts/9"),
    ],
    pages=4,
)

CCTP_LINES = [
    text("title", "Cahier des clauses techniques particulières", 1, "#/texts/0"),
    text("section_header", "Article 4 — Moyens humains", 2, "#/texts/1"),
    text(
        "text",
        "Le titulaire doit assurer en permanence la présence de 2 agents SSIAP 1"
        " et d'un chef d'équipe SSIAP 2.",
        2,
        "#/texts/2",
    ),
    text(
        "text",
        "Les agents devront être titulaires de la carte professionnelle délivrée par le CNAPS.",
        2,
        "#/texts/3",
    ),
    text("text", "La prestation est assurée 24h/24 et 7j/7, y compris les jours fériés.", 3, "#/texts/4"),
    text(
        "text",
        "Le titulaire est tenu de reprendre le personnel en place conformément à l'avenant 5 de la convention"
        " collective.",
        3,
        "#/texts/5",
    ),
    text("text", "Tout manquement donnera lieu à des pénalités de 500 € par jour.", 4, "#/texts/6"),
]
CCTP_AO = FakeDoc(CCTP_LINES, pages=4)
# Rectificatif : la clause de reprise du personnel disparaît, le reste est inchangé.
CCTP_RECTIF = FakeDoc([line for line in CCTP_LINES if "reprendre" not in line[0].text], pages=4)


@pytest.fixture
def converter(app):
    conv = FakeConverter({"RC.pdf": RC_AO, "CCTP.pdf": CCTP_AO})
    app.state.document_parser = DoclingAdapter(converter_factory=lambda: conv)
    return conv


def _normalize(tmp_path, name: str, doc: FakeDoc, ws: uuid.UUID):
    path = tmp_path / name
    path.write_bytes(b"x")
    adapter = DoclingAdapter(converter_factory=lambda: FakeConverter({name: doc}))
    return adapter.parse(ParseRequest(path=path, document_id=uuid.uuid4(), workspace_id=ws, filename=name))


def test_digest_reads_tender_clauses_and_weighted_criteria(tmp_path):
    ws = uuid.uuid4()
    docs = [_normalize(tmp_path, "RC.pdf", RC_AO, ws), _normalize(tmp_path, "CCTP.pdf", CCTP_AO, ws)]
    digest = DigestEngine().build(ws, docs, engagement_type=MissionType.APPEL_OFFRES)

    assert [(c.label, c.weight, c.unit) for c in digest.criteria] == [
        ("Prix", 40, "%"),
        ("Valeur technique", 60, "%"),
    ]
    assert digest.criteria[0].source.filename == "RC.pdf" and digest.criteria[0].source.page == 3

    by_cat = {c.category: c for c in digest.clauses}
    assert {"qualifications", "horaires", "reprise_personnel", "visite", "penalites"} <= set(by_cat)
    assert by_cat["reprise_personnel"].mandatory and by_cat["reprise_personnel"].source.page == 3
    assert not by_cat["horaires"].mandatory  # constat, pas une phrase prescriptive

    # Hors appel d'offres, le Digest ne lit pas les clauses métier AO.
    other = DigestEngine().build(ws, docs, engagement_type=MissionType.AUDIT)
    assert other.clauses == [] and other.criteria == []

    found = candidates(digest)
    types = [c.type for c in found]
    assert "penalites" not in types  # va dans l'onglet Risques
    assert types.count("moyens_humains") == 2 and types.count("critere") == 2
    assert types.count("piece") == 3 and "eliminatoire" in types
    # La phrase des effectifs n'est pas répétée en clause « qualifications ».
    ssiap = [c for c in found if "SSIAP" in c.text]
    assert {c.type for c in ssiap} == {"moyens_humains"}
    assert len({c.key for c in found}) == len(found)


def _dossier(client, staff):
    r = client.post("/api/v1/tenders", headers=staff, json={"title": "Sûreté du CHU", "buyer": "HCL"})
    assert r.status_code == 201, r.text
    d = r.json()
    return d, f"/api/v1/workspaces/{d['workspace_id']}/tenders/{d['mission_id']}"


def _upload(client, staff, base, name, payload):
    r = client.post(f"{base}/dce", headers=staff, files=[("files", (name, payload))])
    assert r.status_code == 201, r.text


def test_matrix_is_built_from_the_dce_and_keeps_human_answers(client, staff, converter, session):
    _d, base = _dossier(client, staff)
    _upload(client, staff, base, "RC.pdf", b"rc")
    _upload(client, staff, base, "CCTP.pdf", b"cctp v1")

    body = client.get(f"{base}/compliance", headers=staff).json()
    rows = body["rows"]
    assert [r["code"] for r in rows] == [f"REQ-{i:03d}" for i in range(1, len(rows) + 1)]
    by_type = {}
    for r in rows:
        by_type.setdefault(r["type"], []).append(r)
    assert {"piece", "moyens_humains", "qualifications", "horaires", "reprise_personnel", "critere"} <= set(
        by_type
    )
    assert "penalites" not in by_type
    reprise = by_type["reprise_personnel"][0]
    assert reprise["source_label"] == "CCTP.pdf p. 3 · Article 4 — Moyens humains"
    assert reprise["source"]["page"] == 3 and reprise["status"] == "TODO" and reprise["mandatory"]
    assert {p["target_document"] for p in by_type["piece"]} == {"technique", "administratif"}
    assert body["summary"]["mandatory_covered"] == 0 and body["summary"]["coverage_rate"] == 0

    # Réponse humaine sur l'exigence de qualification.
    qualif = by_type["qualifications"][0]
    patched = client.patch(
        f"{base}/requirements/{qualif['id']}",
        headers=staff,
        json={
            "status": "COVERED",
            "owner": "Responsable RH",
            "planned_response": "Cartes CNAPS de tous les agents jointes en annexe.",
            "evidence": "Registre des cartes professionnelles",
            "target_document": "annexes",
        },
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["status"] == "COVERED" and patched.json()["updated_by"] == "Chargée d'affaires"
    assert (
        client.patch(f"{base}/requirements/{qualif['id']}", headers=staff, json={"text": "x"}).status_code
        == 422
    )
    bad_target = client.patch(
        f"{base}/requirements/{qualif['id']}", headers=staff, json={"target_document": "ailleurs"}
    )
    assert bad_target.status_code == 422
    assert session.scalars(select(Event).where(Event.type == "tender.requirement.updated")).first()

    summary = client.get(f"{base}/compliance", headers=staff).json()["summary"]
    assert summary["mandatory_covered"] == 1 and summary["by_status"]["COVERED"] == 1

    # Relancer la synchronisation ne crée rien de nouveau.
    again = client.post(f"{base}/requirements/sync", headers=staff).json()
    assert again["added"] == 0 and again["stale"] == 0

    # Rectificatif du CCTP : la reprise du personnel disparaît → marquée, jamais supprimée.
    converter.docs["CCTP.pdf"] = CCTP_RECTIF
    _upload(client, staff, base, "CCTP.pdf", b"cctp v2")
    after = {r["id"]: r for r in client.get(f"{base}/requirements", headers=staff).json()}
    assert after[reprise["id"]]["stale"] is True
    kept = after[qualif["id"]]
    assert kept["stale"] is False and kept["status"] == "COVERED" and kept["owner"] == "Responsable RH"
    assert len(after) == len(rows)  # pas de renumérotation, pas de doublon


def test_manual_requirement_analysis_and_risks(client, staff, converter):
    _d, base = _dossier(client, staff)
    _upload(client, staff, base, "RC.pdf", b"rc")
    _upload(client, staff, base, "CCTP.pdf", b"cctp")

    manual = client.post(
        f"{base}/requirements",
        headers=staff,
        json={"text": "Présenter le plan de continuité en cas de grève", "type": "moyens_humains"},
    )
    assert manual.status_code == 201, manual.text
    assert manual.json()["origin"] == "manual" and manual.json()["source_label"] == "Ajout manuel"
    bad = client.post(f"{base}/requirements", headers=staff, json={"text": "xyz abc", "type": "inconnu"})
    assert bad.status_code == 422

    analysis = client.get(f"{base}/analysis", headers=staff).json()
    assert analysis["criteria_total"] == 100
    assert [c["label"] for c in analysis["criteria"]] == ["Prix", "Valeur technique"]
    titles = [s["title"] for s in analysis["sections"]]
    assert "Reprise du personnel" in titles and "Horaires et vacations" in titles

    risks = client.get(f"{base}/risks", headers=staff).json()
    assert risks[0]["severity"] == "critique"  # l'offre incomplète rejetée passe en tête
    assert any(r["kind"] == "penalite" and r["source"].startswith("CCTP.pdf p. 4") for r in risks)


def test_clients_cannot_read_the_matrix(client, staff, auth, converter):
    _d, base = _dossier(client, staff)
    assert client.get(f"{base}/compliance", headers=auth("owner")).status_code == 403
