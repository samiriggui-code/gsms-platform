"""intake receipt table

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-02 22:20:00.000000
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
        "intake_receipt",
        sa.Column("idempotency_key", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("request_type", sa.String(length=32), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("company_name", sa.String(length=200), nullable=True),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("mission_id", sa.Uuid(), nullable=True),
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("crm_ref", sa.String(length=300), nullable=True),
        sa.Column("response", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(
            ["mission_id"],
            ["mission_mission.id"],
            name=op.f("fk_intake_receipt_mission_id_mission_mission"),
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["identity_workspace.id"],
            name=op.f("fk_intake_receipt_workspace_id_identity_workspace"),
        ),
        sa.PrimaryKeyConstraint("idempotency_key", name=op.f("pk_intake_receipt")),
    )
    with op.batch_alter_table("intake_receipt", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_intake_receipt_mission_id"), ["mission_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_intake_receipt_workspace_id"), ["workspace_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("intake_receipt", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_intake_receipt_workspace_id"))
        batch_op.drop_index(batch_op.f("ix_intake_receipt_mission_id"))
    op.drop_table("intake_receipt")
