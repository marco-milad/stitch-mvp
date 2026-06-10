"""add_family_members_table

Provisions the `family_members` table that backs the Resident Profile
& Family Hub. Phone uniqueness is scoped per-unit so two units in the
same compound can both have a "Mom +201234567890" entry without
collision.

Revision ID: a4d72e8b5961
Revises: f7b2e9d61c84
Create Date: 2026-06-10 14:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a4d72e8b5961"
down_revision: str | None = "f7b2e9d61c84"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "family_members",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("primary_user_id", sa.UUID(), nullable=False),
        sa.Column("unit_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=False),
        sa.Column("relationship", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["primary_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("unit_id", "phone", name="uq_family_members_unit_phone"),
    )
    op.create_index(
        op.f("ix_family_members_primary_user_id"),
        "family_members",
        ["primary_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_family_members_unit_id"),
        "family_members",
        ["unit_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_family_members_unit_id"), table_name="family_members")
    op.drop_index(op.f("ix_family_members_primary_user_id"), table_name="family_members")
    op.drop_table("family_members")
