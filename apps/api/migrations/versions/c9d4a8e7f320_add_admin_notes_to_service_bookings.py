"""add_admin_notes_to_service_bookings

Adds an `admin_notes` nullable Text column to `service_bookings` so
admins can attach internal commentary during the booking lifecycle
(vendor coordination notes, reschedule reasons, etc.) that the
resident-side projection never surfaces.

Revision ID: c9d4a8e7f320
Revises: b8c3a7f4d215
Create Date: 2026-06-09 11:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c9d4a8e7f320"
down_revision: str | None = "b8c3a7f4d215"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "service_bookings",
        sa.Column("admin_notes", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("service_bookings", "admin_notes")
