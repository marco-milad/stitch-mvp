"""add_maintenance_schedule_columns

Provisions the 24/7 maintenance slot scheduling fields on
`maintenance_requests`:

- scheduled_date_iso  : YYYY-MM-DD calendar day picked by the resident
                        on the booking form
- scheduled_time_slot : canonical label form "HH:MM-HH:MM" (e.g.
                        "09:00-12:00"); one of the 8 sequential 3-hour
                        slots defined in
                        app.services.maintenance_slots.TIME_SLOTS

Both nullable so legacy tickets pre-dating this feature stay valid.
An index on `scheduled_date_iso` accelerates the per-day availability
query that powers the slot picker on the resident frontend.

Revision ID: d3f5b1a78e94
Revises: c9d4a8e7f320
Create Date: 2026-06-09 12:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d3f5b1a78e94"
down_revision: str | None = "c9d4a8e7f320"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "maintenance_requests",
        sa.Column("scheduled_date_iso", sa.String(length=10), nullable=True),
    )
    op.add_column(
        "maintenance_requests",
        sa.Column("scheduled_time_slot", sa.String(length=11), nullable=True),
    )
    op.create_index(
        op.f("ix_maintenance_requests_scheduled_date_iso"),
        "maintenance_requests",
        ["scheduled_date_iso"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_maintenance_requests_scheduled_date_iso"),
        table_name="maintenance_requests",
    )
    op.drop_column("maintenance_requests", "scheduled_time_slot")
    op.drop_column("maintenance_requests", "scheduled_date_iso")
