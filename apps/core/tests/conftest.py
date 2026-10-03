from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

import bcrypt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from gsms_core.db import Database
from gsms_core.identity.models import Membership, Organization, OrganizationKind, Role, User
from gsms_core.main import create_app
from gsms_core.scripts.seed_demo import seed
from gsms_core.security import hash_password
from gsms_core.settings import Settings

PASSWORD = "test-password"
WEBHOOK_SECRET = "test-grace-secret"
EMAILS = {
    "owner": "direction@abc-retail.example",
    "lyon": "responsable.lyon@abc-retail.example",
    "paris": "responsable.paris@abc-retail.example",
    "consultant": "consultant@gsms.example",
}

_gensalt = bcrypt.gensalt


@pytest.fixture(autouse=True, scope="session")
def _fast_bcrypt() -> Iterator[None]:
    bcrypt.gensalt = lambda rounds=4, prefix=b"2b": _gensalt(4, prefix)  # tests seulement
    yield
    bcrypt.gensalt = _gensalt


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        env="test",
        database_url="sqlite://",
        jwt_secret="test-secret-0123456789-0123456789-abcdef",
        storage_local_root=tmp_path / "blobs",
        webhook_secrets={"grace": WEBHOOK_SECRET, "qatrial": "test-qatrial-secret"},
        max_upload_mb=1,
    )


@pytest.fixture
def db(settings: Settings) -> Iterator[Database]:
    database = Database(settings.database_url)
    database.create_all()
    yield database
    database.engine.dispose()


@pytest.fixture
def app(settings: Settings, db: Database):
    return create_app(settings, db=db)


@pytest.fixture
def client(app) -> Iterator[TestClient]:
    with TestClient(app) as c:
        yield c


@pytest.fixture
def session(db: Database, app) -> Iterator[Session]:
    # dépend de ``app`` : le moteur de workflows doit être attaché au bus avec ces settings
    with db.session_factory() as s:
        yield s


@dataclass
class Demo:
    org_id: str
    lyon: str
    paris: str


@pytest.fixture
def demo(db: Database) -> Demo:
    with db.session_factory() as s:
        out = seed(s, PASSWORD)
    return Demo(org_id=out["organization"], lyon=out["workspaces"]["lyon"], paris=out["workspaces"]["paris"])


def login(client: TestClient, who: str, workspace_id: str | None = None) -> dict[str, str]:
    body = {"email": EMAILS[who], "password": PASSWORD}
    if workspace_id:
        body["workspace_id"] = workspace_id
    r = client.post("/api/v1/auth/login", json=body)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def auth(client: TestClient, demo: Demo):
    cache: dict[str, dict[str, str]] = {}

    def _auth(who: str) -> dict[str, str]:
        if who not in cache:
            cache[who] = login(client, who)
        return cache[who]

    return _auth


@pytest.fixture
def staff(client, session, demo):
    """Chargé d'affaires GSMS : membership sur l'organisation GSMS entière (rôle d'équipe)."""
    gsms = session.scalar(select(Organization).where(Organization.kind == OrganizationKind.GSMS))
    user = User(email="ca@gsms.example", name="Chargée d'affaires", password_hash=hash_password(PASSWORD))
    session.add(user)
    session.flush()
    session.add(Membership(user_id=user.id, organization_id=gsms.id, workspace_id=None, role=Role.MANAGER))
    session.commit()
    r = client.post("/api/v1/auth/login", json={"email": user.email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
