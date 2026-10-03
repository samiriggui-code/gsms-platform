"""Dossier AO : workspace dédié (référence WS-AO-AAAA-NNNN), dépôt du DCE, onglets, cycle de validation."""

from __future__ import annotations

import io
import uuid
import zipfile

import pytest
from sqlalchemy import select

from gsms_core.documents.parsers import DoclingAdapter
from gsms_core.events.bus import pending_outbox
from gsms_core.events.models import Event
from gsms_core.identity.models import Organization, OrganizationKind, Role, Workspace
from gsms_core.tenders.dossier import _entry_name, next_reference
from gsms_core.tenders.models import DossierStatus, GoNoGo, TenderCase
from tests.fake_docling import BPU, CCTP, RC, FakeConverter

FILES = {"CCTP.pdf": CCTP, "RC.pdf": RC, "BPU.xlsx": BPU, "Règlement.pdf": RC}


@pytest.fixture
def converter(app):
    conv = FakeConverter(dict(FILES))
    app.state.document_parser = DoclingAdapter(converter_factory=lambda: conv)
    return conv


def create(client, headers, title="Gardiennage CHU de Lyon", **extra):
    r = client.post(
        "/api/v1/tenders",
        headers=headers,
        json={"title": title, "buyer": "Hospices civils de Lyon", "consultation_ref": "2026-AO-17", **extra},
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_create_dossier_gets_its_own_gsms_workspace_and_reference(client, staff, session):
    first = create(client, staff)
    second = create(client, staff, title="Sûreté gare")
    year = first["reference"].split("-")[2]
    assert first["reference"] == f"WS-AO-{year}-0001" and second["reference"] == f"WS-AO-{year}-0002"
    assert first["dossier_status"] == "DRAFT" and first["dossier_status_label"] == "Brouillon"
    assert first["consultation_ref"] == "2026-AO-17"

    ws = session.get(Workspace, uuid.UUID(first["workspace_id"]))
    org = session.get(Organization, ws.organization_id)
    assert org.kind == OrganizationKind.GSMS and ws.reference == first["reference"]
    assert ws.created_from_mission_id == uuid.UUID(first["mission_id"])

    listed = client.get("/api/v1/tenders", headers=staff).json()
    assert {i["reference"] for i in listed} == {first["reference"], second["reference"]}
    current = client.get(f"/api/v1/workspaces/{first['workspace_id']}/tenders/current", headers=staff).json()
    assert current["mission_id"] == first["mission_id"]

    created = session.scalars(select(Event).where(Event.type == "workspace.created")).all()
    assert any(e.data.get("reference") == first["reference"] for e in created)


def test_reference_sequence_is_per_year(session, demo):
    gsms = session.scalar(select(Organization).where(Organization.kind == OrganizationKind.GSMS))
    session.add_all(
        [
            Workspace(organization_id=gsms.id, name="a", reference="WS-AO-2025-0007"),
            Workspace(organization_id=gsms.id, name="b", reference="WS-AO-2026-0041"),
        ]
    )
    session.flush()
    assert next_reference(session, 2026) == "WS-AO-2026-0042"
    assert next_reference(session, 2027) == "WS-AO-2027-0001"


def test_buyer_and_clients_never_see_ao_dossiers(client, auth, staff):
    create(client, staff)
    # Le compte client (même l'administrateur de son organisation) ne voit aucun dossier AO de GSMS.
    assert client.get("/api/v1/tenders", headers=auth("owner")).json() == []
    # Et un membre d'une organisation cliente ne peut pas en créer.
    r = client.post("/api/v1/tenders", headers=auth("consultant"), json={"title": "x"})
    assert r.status_code == 403


def _zip(entries: dict[str, bytes], *, utf8: bool = True) -> bytes:
    buf = io.BytesIO()
    renames: dict[bytes, bytes] = {}
    with zipfile.ZipFile(buf, "w") as zf:
        for name, data in entries.items():
            if utf8:
                zf.writestr(name, data)
                continue
            # Archive Windows : nom en UTF-8 sans le drapeau 0x800 (zipfile ne sait pas l'écrire).
            raw = name.encode("utf-8")
            placeholder = b"X" * len(raw)
            renames[placeholder] = raw
            zf.writestr(placeholder.decode(), data)
    out = buf.getvalue()
    for placeholder, raw in renames.items():
        out = out.replace(placeholder, raw)
    return out


def test_dce_zip_is_filed_parsed_and_shown_in_tabs(client, staff, converter):
    d = create(client, staff)
    ws, mission = d["workspace_id"], d["mission_id"]
    archive = _zip(
        {
            "DCE/RC.pdf": b"rc",
            "DCE/CCTP.pdf": b"cctp",
            "DCE/BPU.xlsx": b"bpu",
            "__MACOSX/DCE/._RC.pdf": b"x",
            "DCE/annexes.zip": b"PK",
        }
    )
    r = client.post(
        f"/api/v1/workspaces/{ws}/tenders/{mission}/dce",
        headers=staff,
        files=[("files", ("DCE.zip", archive, "application/zip"))],
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert sorted(f["filename"] for f in body["files"]) == ["BPU.xlsx", "CCTP.pdf", "RC.pdf"]
    assert all(f["analysis_requested"] for f in body["files"])
    assert [s["name"] for s in body["skipped"]] == ["DCE/annexes.zip"]

    pieces = client.get(f"/api/v1/workspaces/{ws}/tenders/{mission}/pieces", headers=staff).json()
    received = {p["kind"]: p for p in pieces if p["provided"]}
    assert set(received) == {"rc", "cctp", "bpu"} and received["rc"]["parse_status"] == "PARSED"
    missing = {p["kind"] for p in pieces if not p["provided"]}
    assert missing == {"ccap", "ae"}  # BPU couvre l'alternative BPU / DPGF / DQE

    deadlines = client.get(f"/api/v1/workspaces/{ws}/tenders/{mission}/deadlines", headers=staff).json()
    remise = [x for x in deadlines if x["kind"] == "remise_offres"]
    assert remise and remise[0]["due_at"].startswith("2026-11-15")
    assert remise[0]["source"].startswith("RC.pdf p. 3")

    docs = client.get(f"/api/v1/workspaces/{ws}/tenders/{mission}/documents", headers=staff).json()
    assert len(docs) == 3 and all(len(x["sha256"]) == 64 and x["folder"] for x in docs)

    history = client.get(f"/api/v1/workspaces/{ws}/tenders/{mission}/history", headers=staff).json()
    actions = {h["action"] for h in history}
    assert {"engagement.create", "tender.create", "document.upload"} <= actions
    assert any(h["actor"] == "Chargée d'affaires" for h in history)

    # Le coffre-fort range le DCE de ce workspace AO (sans site) dans l'arborescence.
    tree = client.get("/api/v1/vault/tree", headers=staff)
    assert tree.status_code == 200, tree.text
    assert d["reference"] in tree.text


def test_dce_redeposit_is_a_new_version_not_a_duplicate(client, staff, converter):
    d = create(client, staff)
    url = f"/api/v1/workspaces/{d['workspace_id']}/tenders/{d['mission_id']}/dce"
    first = client.post(url, headers=staff, files=[("files", ("RC.pdf", b"v1"))]).json()["files"][0]
    same = client.post(url, headers=staff, files=[("files", ("RC.pdf", b"v1"))]).json()["files"][0]
    rectif = client.post(url, headers=staff, files=[("files", ("RC.pdf", b"v2"))]).json()["files"][0]
    assert first["document_id"] == same["document_id"] == rectif["document_id"]
    assert first["version_created"] and not same["version_created"] and rectif["version_created"]
    docs = client.get(
        f"/api/v1/workspaces/{d['workspace_id']}/tenders/{d['mission_id']}/documents", headers=staff
    ).json()
    assert [x["version"] for x in docs] == [2]


def test_windows_zip_names_are_decoded():
    data = _zip({"Règlement.pdf": b"x"}, utf8=False)
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        assert _entry_name(zf.infolist()[0]) == "Règlement.pdf"


def test_lifecycle_is_human_and_guarded(client, staff, session):
    d = create(client, staff)
    base = f"/api/v1/workspaces/{d['workspace_id']}/tenders/{d['mission_id']}"

    def move(to, comment=None):
        return client.post(f"{base}/status", headers=staff, json={"to": to, "comment": comment})

    st = client.get(f"{base}/status", headers=staff).json()
    assert st["status"] == "DRAFT" and [t["to"] for t in st["transitions"]] == ["REVIEW"]

    assert move("SUBMITTED", "trop tôt").status_code == 422  # pas de saut d'étape
    assert move("REVIEW").status_code == 200
    r = move("READY")
    assert r.status_code == 422 and "GO" in r.json()["detail"]  # pas de dossier prêt sans décision GO

    decided = client.post(
        f"{base}/go-no-go/decision", headers=staff, json={"decision": "GO", "rationale": "Capacité OK"}
    )
    assert decided.status_code == 200
    assert move("READY").status_code == 200
    assert move("APPROVED").status_code == 422  # commentaire obligatoire
    assert move("APPROVED", "Relu et validé par la direction").status_code == 200
    done = move("SUBMITTED", "Déposé sur PLACE, accusé n° 123")
    assert done.status_code == 200, done.text
    body = done.json()
    assert body["status"] == "SUBMITTED" and body["transitions"] == []
    assert [h["to_status"] for h in body["history"]] == ["SUBMITTED", "APPROVED", "READY", "REVIEW"]
    assert body["history"][0]["comment"] == "Déposé sur PLACE, accusé n° 123"

    submitted = session.scalars(select(Event).where(Event.type == "tender.submitted")).one()
    assert submitted.data["reference"] == d["reference"] and submitted.actor.startswith("user:")
    destinations = [o.destination for o in pending_outbox(session)]
    assert destinations.count("crm") >= 5  # 4 changements de statut + dépôt (+ décision GO)

    # Plus de DCE après le dépôt.
    r = client.post(f"{base}/dce", headers=staff, files=[("files", ("RC.pdf", b"x"))])
    assert r.status_code == 422


def test_lifecycle_service_refuses_non_humans(session, staff, client):
    from gsms_core.tenders.lifecycle import LifecycleForbidden, change_status

    d = create(client, staff)
    case = session.scalar(select(TenderCase).where(TenderCase.mission_id == uuid.UUID(d["mission_id"])))
    case.decision = GoNoGo.GO
    with pytest.raises(LifecycleForbidden):
        change_status(session, case, DossierStatus.REVIEW, actor="agent:eve", role=Role.MANAGER)
    with pytest.raises(LifecycleForbidden):
        change_status(session, case, DossierStatus.REVIEW, actor="user:x", role=Role.CLIENT_ADMIN)
