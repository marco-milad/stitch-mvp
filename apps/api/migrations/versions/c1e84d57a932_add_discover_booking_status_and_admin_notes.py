"""add_discover_booking_status_and_admin_notes

Adds the lifecycle gate (`status` enum-as-string with `pending` default)
and admin-only commentary column (`admin_notes`) to `discover_bookings`,
turning the Leads Hub into a real CRM with an approval workflow.

Existing rows backfill to `status='pending'` so legacy bookings flow
into the admin review queue with no manual triage step.

Revision ID: c1e84d57a932
Revises: b9f3a2e76054
Create Date: 2026-06-11 11:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c1e84d57a932"
down_revision: str | None = "b9f3a2e76054"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # `status` lands with a server-side default so the column can be
    # NOT NULL even though existing rows don't carry a value. After the
    # backfill the default stays in place — INSERTs that omit `status`
    # still land on `pending`.
    op.add_column(
        "discover_bookings",
        sa.Column(
            "status",
            sa.String(length=16),
            nullable=False,
            server_default="pending",
        ),
    )
    op.add_column(
        "discover_bookings",
        sa.Column("admin_notes", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("discover_bookings", "admin_notes")
    op.drop_column("discover_bookings", "status")
