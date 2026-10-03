"""context bindings + contacts

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-03
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "identity_contact",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("first_name", sa.String(length=120), nullable=True),
        sa.Column("last_name", sa.String(length=120), nullable=True),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["identity_organization.id"],
            name=op.f("fk_identity_contact_organization_id_identity_organization"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_identity_contact")),
    )
    op.create_index(op.f("ix_identity_contact_organization_id"), "identity_contact", ["organization_id"])

    op.create_table(
        "workspace_application_bindings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("gsms_workspace_id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.String(length=40), nullable=False),
        sa.Column("external_workspace_id", sa.String(length=300), nullable=False),
        sa.Column("status", sa.Enum("ACTIVE", "DETACHED", "PENDING", "ERROR", name="bindingstatus", native_enum=False, length=32), nullable=False),
        sa.Column("mission_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(
            ["gsms_workspace_id"],
            ["identity_workspace.id"],
            name=op.f("fk_workspace_application_bindings_gsms_workspace_id_identity_workspace"),
        ),
        sa.ForeignKeyConstraint(
            ["mission_id"],
            ["mission_mission.id"],
            name=op.f("fk_workspace_application_bindings_mission_id_mission_mission"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_workspace_application_bindings")),
        sa.UniqueConstraint("gsms_workspace_id", "application_id", name=op.f("uq_workspace_application_bindings_gsms_workspace_id")),
    )
    op.create_index(op.f("ix_workspace_application_bindings_application_id"), "workspace_application_bindings", ["application_id"])
    op.create_index(op.f("ix_workspace_application_bindings_gsms_workspace_id"), "workspace_application_bindings", ["gsms_workspace_id"])
    op.create_index(op.f("ix_workspace_application_bindings_mission_id"), "workspace_application_bindings", ["mission_id"])

    op.create_table(
        "client_application_bindings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("client_id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.String(length=40), nullable=False),
        sa.Column("external_client_id", sa.String(length=300), nullable=False),
        sa.Column("status", sa.Enum("ACTIVE", "DETACHED", "PENDING", "ERROR", name="bindingstatus", native_enum=False, length=32), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["identity_organization.id"],
            name=op.f("fk_client_application_bindings_client_id_identity_organization"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_client_application_bindings")),
        sa.UniqueConstraint("client_id", "application_id", name=op.f("uq_client_application_bindings_client_id")),
    )
    op.create_index(op.f("ix_client_application_bindings_application_id"), "client_application_bindings", ["application_id"])
    op.create_index(op.f("ix_client_application_bindings_client_id"), "client_application_bindings", ["client_id"])

    op.create_table(
        "contact_application_bindings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("contact_id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.String(length=40), nullable=False),
        sa.Column("external_contact_id", sa.String(length=300), nullable=False),
        sa.Column("status", sa.Enum("ACTIVE", "DETACHED", "PENDING", "ERROR", name="bindingstatus", native_enum=False, length=32), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(
            ["contact_id"],
            ["identity_contact.id"],
            name=op.f("fk_contact_application_bindings_contact_id_identity_contact"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_contact_application_bindings")),
        sa.UniqueConstraint("contact_id", "application_id", name=op.f("uq_contact_application_bindings_contact_id")),
    )
    op.create_index(op.f("ix_contact_application_bindings_application_id"), "contact_application_bindings", ["application_id"])
    op.create_index(op.f("ix_contact_application_bindings_contact_id"), "contact_application_bindings", ["contact_id"])


def downgrade() -> None:
    op.drop_table("contact_application_bindings")
    op.drop_table("client_application_bindings")
    op.drop_table("workspace_application_bindings")
    op.drop_table("identity_contact")
