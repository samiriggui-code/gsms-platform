from __future__ import annotations

import pytest
from pydantic import ValidationError

from gsms_core.cli import create_admin
from gsms_core.identity.models import Membership, Organization, OrganizationKind, Role, User
from gsms_core.security import verify_password
from gsms_core.settings import Settings


def test_create_admin_creates_owner_of_gsms_org(session):
    assert create_admin(session, "Admin@GSMS-security.com", "Admin", "a-strong-password") == "créé"
    user = session.query(User).filter_by(email="admin@gsms-security.com").one()
    gsms = session.query(Organization).filter_by(kind=OrganizationKind.GSMS).one()
    membership = session.query(Membership).filter_by(user_id=user.id, organization_id=gsms.id).one()
    assert membership.role == Role.OWNER and membership.workspace_id is None
    assert verify_password("a-strong-password", user.password_hash)


def test_create_admin_is_idempotent_and_updates_password(session):
    create_admin(session, "admin@gsms-security.com", "Admin", "a-strong-password")
    assert create_admin(session, "admin@gsms-security.com", "Admin 2", "another-strong-pw") == "mis à jour"
    assert session.query(User).filter_by(email="admin@gsms-security.com").count() == 1
    assert session.query(Organization).filter_by(kind=OrganizationKind.GSMS).count() == 1


def test_create_admin_rejects_short_password(session):
    with pytest.raises(ValueError):
        create_admin(session, "admin@gsms-security.com", "Admin", "short")


def test_prod_refuses_dev_secret_and_sqlite():
    with pytest.raises(ValidationError):
        Settings(env="prod", database_url="postgresql+psycopg://u:p@db/x")
    with pytest.raises(ValidationError):
        Settings(env="prod", jwt_secret="x" * 40, database_url="sqlite://")
    with pytest.raises(ValidationError):  # coffre-fort sans clé maître
        Settings(env="prod", jwt_secret="x" * 40, database_url="postgresql+psycopg://u:p@db/x")
    Settings(
        env="prod",
        jwt_secret="x" * 40,
        database_url="postgresql+psycopg://u:p@db/x",
        storage_master_key="A" * 43 + "=",
    )
