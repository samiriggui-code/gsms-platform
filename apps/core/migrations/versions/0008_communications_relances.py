"""communications : relances (règles, planification, statuts du module de gsms-qualiopi)

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-03

Les messages existants sont repris : statuts convertis (TO_VALIDATE → A_VALIDER, QUEUED → PREVU,
SENT → ENVOYE, FAILED → ECHEC, CANCELLED → ANNULE), occurrence = « manuel|<id> », date prévue = création.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

STATUSES = {
    "TO_VALIDATE": "A_VALIDER",
    "QUEUED": "PREVU",
    "SENT": "ENVOYE",
    "FAILED": "ECHEC",
    "CANCELLED": "ANNULE",
}


def upgrade() -> None:
    with op.batch_alter_table("comm_message", schema=None) as batch_op:
        batch_op.add_column(sa.Column("occurrence_key", sa.String(length=300), nullable=True))
        batch_op.add_column(sa.Column("rule_key", sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column("recipient_kind", sa.String(length=32), nullable=True))
        batch_op.add_column(sa.Column("body_sha256", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("due_on", sa.Date(), nullable=True))
        batch_op.alter_column("recipient_email", existing_type=sa.String(length=320), nullable=True)

    conn = op.get_bind()
    for old, new in STATUSES.items():
        conn.execute(sa.text("UPDATE comm_message SET status = :new WHERE status = :old"), {"new": new, "old": old})
    rows = conn.execute(sa.text("SELECT id, template, created_at, body_html FROM comm_message")).all()
    import hashlib

    for row in rows:
        created = row.created_at
        due = created.date() if hasattr(created, "date") else str(created)[:10]
        conn.execute(
            sa.text(
                "UPDATE comm_message SET occurrence_key = :occ, rule_key = :rule, recipient_kind = 'CLIENT',"
                " body_sha256 = :sha, due_on = :due WHERE id = :id"
            ),
            {
                "occ": f"manuel|{row.id}",
                "rule": "test_smtp" if row.template == "test_smtp" else "pieces_manquantes_client",
                "sha": hashlib.sha256((row.body_html or "").encode("utf-8")).hexdigest(),
                "due": due,
                "id": row.id,
            },
        )

    with op.batch_alter_table("comm_message", schema=None) as batch_op:
        batch_op.alter_column("occurrence_key", existing_type=sa.String(length=300), nullable=False)
        batch_op.alter_column("rule_key", existing_type=sa.String(length=80), nullable=False)
        batch_op.alter_column("recipient_kind", existing_type=sa.String(length=32), nullable=False)
        batch_op.alter_column("body_sha256", existing_type=sa.String(length=64), nullable=False)
        batch_op.alter_column("due_on", existing_type=sa.Date(), nullable=False)
        batch_op.create_index(batch_op.f("ix_comm_message_due_on"), ["due_on"], unique=False)
        batch_op.create_index(batch_op.f("ix_comm_message_rule_key"), ["rule_key"], unique=False)
        batch_op.create_unique_constraint(batch_op.f("uq_comm_message_occurrence_key"), ["occurrence_key"])


def downgrade() -> None:
    conn = op.get_bind()
    for old, new in STATUSES.items():
        conn.execute(sa.text("UPDATE comm_message SET status = :old WHERE status = :new"), {"new": new, "old": old})
    conn.execute(sa.text("DELETE FROM comm_message WHERE recipient_email IS NULL"))
    with op.batch_alter_table("comm_message", schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f("uq_comm_message_occurrence_key"), type_="unique")
        batch_op.drop_index(batch_op.f("ix_comm_message_rule_key"))
        batch_op.drop_index(batch_op.f("ix_comm_message_due_on"))
        batch_op.alter_column("recipient_email", existing_type=sa.String(length=320), nullable=False)
        batch_op.drop_column("due_on")
        batch_op.drop_column("body_sha256")
        batch_op.drop_column("recipient_kind")
        batch_op.drop_column("rule_key")
        batch_op.drop_column("occurrence_key")
