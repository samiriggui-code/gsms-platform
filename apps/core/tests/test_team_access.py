"""Comptes de l'équipe GSMS (vrais comptes, rôles DocuLens) : accès à toutes les prestations de tous
les clients avec leur rôle ; les comptes client restent cantonnés à leurs prestations."""

from __future__ import annotations

from gsms_core.cli import TEAM_ROLES, create_member
from gsms_core.identity.models import Organization, OrganizationKind, Workspace


def _login(client, email: str, password: str) -> dict[str, str]:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_team_member_sees_every_client_workspace_with_its_role(client, demo, session, auth):
    other = Organization(name="Autre client", kind=OrganizationKind.CLIENT)
    session.add(other)
    session.flush()
    session.add(Workspace(organization_id=other.id, name="Autre client — siège"))
    session.commit()
    create_member(
        session, "Analyste@GSMS-security.com", "Analyste", "analyst-password-1234", TEAM_ROLES["analyst"]
    )

    team = _login(client, "analyste@gsms-security.com", "analyst-password-1234")
    workspaces = {w["name"]: w["role"] for w in client.get("/api/v1/workspaces", headers=team).json()}
    assert {"ABC Retail Lyon Part-Dieu", "ABC Retail Paris Rivoli", "Autre client — siège"} <= set(workspaces)
    assert set(workspaces.values()) == {"consultant"}

    r = client.post(
        f"/api/v1/workspaces/{demo.lyon}/documents", headers=team, files={"file": ("note.pdf", b"%PDF note")}
    )
    assert r.status_code == 201

    # Un compte client ne voit toujours que ses propres prestations.
    names = [w["name"] for w in client.get("/api/v1/workspaces", headers=auth("lyon")).json()]
    assert names == ["ABC Retail Lyon Part-Dieu"]


def test_viewer_reads_but_cannot_deposit(client, demo, session):
    create_member(
        session, "lecteur@gsms-security.com", "Lecteur", "viewer-password-1234", TEAM_ROLES["viewer"]
    )
    viewer = _login(client, "lecteur@gsms-security.com", "viewer-password-1234")
    assert client.get(f"/api/v1/workspaces/{demo.paris}/documents", headers=viewer).status_code == 200
    r = client.post(
        f"/api/v1/workspaces/{demo.paris}/documents", headers=viewer, files={"file": ("x.pdf", b"%PDF")}
    )
    assert r.status_code == 403


def test_roles_follow_doculens_names():
    assert {k: v.value for k, v in TEAM_ROLES.items()} == {
        "admin": "admin",
        "analyst": "consultant",
        "reviewer": "auditor",
        "manager": "manager",
        "viewer": "viewer",
    }


def test_demo_is_client_side_only_and_idempotent(db, settings, session):
    from sqlalchemy import func, select

    from gsms_core.documents.models import Document
    from gsms_core.documents.parsers import DoclingAdapter
    from gsms_core.documents.storage import LocalFSStorage
    from gsms_core.identity.models import User
    from gsms_core.scripts.demo import run_demo
    from gsms_core.vault.storage import Vault
    from tests.fake_docling import BPU, CCTP, RC, FakeConverter

    converter = FakeConverter({"CCTP.md": CCTP, "RC.md": RC, "BPU.csv": BPU})
    parser = DoclingAdapter(converter_factory=lambda: converter)
    vault = Vault.from_settings(LocalFSStorage(settings.storage_local_root, settings.s3_bucket), settings)
    first = run_demo(session, vault, parser, "demo-password-change-me")
    assert [p["analyse"] for p in first["pieces"]] == ["PARSED", "PARSED", "PARSED"]
    emails = set(session.scalars(select(User.email)))
    assert not any(e.endswith("@gsms.example") and e != "consultant@gsms.example" for e in emails)

    again = run_demo(session, vault, parser, "demo-password-change-me")
    assert again["pieces"] == [] and again["prestation_appel_offres"] == first["prestation_appel_offres"]
    assert session.scalar(select(func.count()).select_from(Document)) == 3
