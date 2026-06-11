"""add_discover_funnel_tables

Provisions the two Discover funnel tables — `eoi_submissions` and
`discover_bookings` — that back the public lead-capture endpoints
under `/api/v1/discover/*`. Both are anonymous-allowed (no FK to
`users`), keyed only on email + phone for downstream de-dup.

Revision ID: b9f3a2e76054
Revises: a4d72e8b5961
Create Date: 2026-06-10 15:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b9f3a2e76054"
down_revision: str | None = "a4d72e8b5961"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "eoi_submissions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("interest_type", sa.String(length=32), nullable=True),
        sa.Column("budget", sa.String(length=32), nullable=True),
        sa.Column("timeline", sa.String(length=32), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_eoi_submissions_email"),
        "eoi_submissions",
        ["email"],
        unique=False,
    )

    op.create_table(
        "discover_bookings",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("visit_type", sa.String(length=16), nullable=False),
        sa.Column("booking_date", sa.Date(), nullable=False),
        sa.Column("time_slot", sa.String(length=5), nullable=False),
        sa.Column("advisor_name", sa.String(length=120), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_discover_bookings_booking_date"),
        "discover_bookings",
        ["booking_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_discover_bookings_email"),
        "discover_bookings",
        ["email"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_discover_bookings_email"), table_name="discover_bookings")
    op.drop_index(op.f("ix_discover_bookings_booking_date"), table_name="discover_bookings")
    op.drop_table("discover_bookings")
    op.drop_index(op.f("ix_eoi_submissions_email"), table_name="eoi_submissions")
    op.drop_table("eoi_submissions")
