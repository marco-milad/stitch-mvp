"""add_technicians_and_maintenance_booking_columns

Provisions the `technicians` table that powers the maintenance capacity
engine (per-category active technicians = per-slot ceiling) and adds
three booking columns to `maintenance_requests`:

    booking_date    DATE       — canonical typed-Date column
    time_slot       VARCHAR(5) — canonical HH:MM start time
    technician_id   UUID FK    — bound technician once confirmed

Existing rows backfill the new columns from the legacy
`scheduled_date_iso` / `scheduled_time_slot` so both vocabularies stay
in sync during the transition. Then seeds five demo technicians
(3 plumbing + 2 electrical) so the available-slots endpoint returns
sensible capacity numbers in dev immediately after upgrade.

Revision ID: d2f95c8a6e10
Revises: c1e84d57a932
Create Date: 2026-06-11 13:00:00.000000

"""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d2f95c8a6e10"
down_revision: str | None = "c1e84d57a932"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1) Create the technicians table.
    op.create_table(
        "technicians",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_technicians_category"),
        "technicians",
        ["category"],
        unique=False,
    )

    # 2) Add the three new booking columns to maintenance_requests.
    op.add_column(
        "maintenance_requests",
        sa.Column("technician_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "maintenance_requests",
        sa.Column("booking_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "maintenance_requests",
        sa.Column("time_slot", sa.String(length=5), nullable=True),
    )
    op.create_foreign_key(
        "fk_maintenance_requests_technician_id",
        "maintenance_requests",
        "technicians",
        ["technician_id"],
        ["id"],
    )
    op.create_index(
        op.f("ix_maintenance_requests_booking_date"),
        "maintenance_requests",
        ["booking_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_maintenance_requests_technician_id"),
        "maintenance_requests",
        ["technician_id"],
        unique=False,
    )

    # 3) Backfill the new columns from the legacy `scheduled_*` strings
    #    so existing rows participate in the new capacity engine.
    #    The legacy time-slot label is "HH:MM-HH:MM" — we take the
    #    first 5 chars as the new `time_slot` (the slot's start time).
    op.execute(
        sa.text(
            """
            UPDATE maintenance_requests
               SET booking_date = scheduled_date_iso::date,
                   time_slot    = LEFT(scheduled_time_slot, 5)
             WHERE scheduled_date_iso IS NOT NULL
               AND scheduled_time_slot IS NOT NULL
               AND LENGTH(scheduled_time_slot) >= 5
            """
        )
    )

    # 4) Seed demo technicians (3 plumbing + 2 electrical) so the
    #    available-slots endpoint returns meaningful capacity counts
    #    on a fresh dev DB. Idempotent: re-running this migration
    #    against a DB that already has these names would noop the
    #    insert at the unique-constraint level, but we don't add a
    #    constraint here — the test DB is dropped & re-created in CI.
    techs_table = sa.table(
        "technicians",
        sa.column("id", sa.UUID()),
        sa.column("name", sa.String()),
        sa.column("category", sa.String()),
        sa.column("is_active", sa.Boolean()),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )
    seeded_at = datetime.now(UTC)
    op.bulk_insert(
        techs_table,
        [
            {
                "id": uuid.uuid4(),
                "name": "Khaled Mohamed",
                "category": "plumbing",
                "is_active": True,
                "created_at": seeded_at,
            },
            {
                "id": uuid.uuid4(),
                "name": "Sherif Helmy",
                "category": "plumbing",
                "is_active": True,
                "created_at": seeded_at,
            },
            {
                "id": uuid.uuid4(),
                "name": "Ahmed Rashad",
                "category": "plumbing",
                "is_active": True,
                "created_at": seeded_at,
            },
            {
                "id": uuid.uuid4(),
                "name": "Hassan Adel",
                "category": "electrical",
                "is_active": True,
                "created_at": seeded_at,
            },
            {
                "id": uuid.uuid4(),
                "name": "Mostafa Galal",
                "category": "electrical",
                "is_active": True,
                "created_at": seeded_at,
            },
        ],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_maintenance_requests_technician_id"),
        table_name="maintenance_requests",
    )
    op.drop_index(
        op.f("ix_maintenance_requests_booking_date"),
        table_name="maintenance_requests",
    )
    op.drop_constraint(
        "fk_maintenance_requests_technician_id",
        "maintenance_requests",
        type_="foreignkey",
    )
    op.drop_column("maintenance_requests", "time_slot")
    op.drop_column("maintenance_requests", "booking_date")
    op.drop_column("maintenance_requests", "technician_id")
    op.drop_index(op.f("ix_technicians_category"), table_name="technicians")
    op.drop_table("technicians")
