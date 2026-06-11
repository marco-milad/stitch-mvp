"""amenity_booking_time_slot_and_admin_notes

Adds the spec-mandated `time_slot` + `admin_notes` columns to
`amenity_bookings`, backfills `time_slot` from the existing
`start_time`, and seeds three demo amenities under the spec's slug
names (`tennis_court_1`, `bbq_area_lake`, `clubhouse_hall`) so the
busy-slots endpoint returns meaningful capacity numbers immediately
after upgrade.

Revision ID: e4a7b1f93c25
Revises: d2f95c8a6e10
Create Date: 2026-06-11 14:00:00.000000

"""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e4a7b1f93c25"
down_revision: str | None = "d2f95c8a6e10"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1) New columns on amenity_bookings.
    op.add_column(
        "amenity_bookings",
        sa.Column("time_slot", sa.String(length=5), nullable=True),
    )
    op.add_column(
        "amenity_bookings",
        sa.Column("admin_notes", sa.Text(), nullable=True),
    )

    # 2) Backfill `time_slot` from `start_time` so the asset-lock guard
    #    has a canonical slot value for every existing row.
    op.execute(
        sa.text("UPDATE amenity_bookings SET time_slot = start_time WHERE time_slot IS NULL")
    )

    # 3) Index on (amenity_id, booking_date, time_slot) — the conflict
    #    query that drives both the busy-slots endpoint and the PATCH
    #    guard hits exactly this tuple, so the composite index keeps it
    #    a single B-tree probe.
    op.create_index(
        op.f("ix_amenity_bookings_lock_tuple"),
        "amenity_bookings",
        ["amenity_id", "booking_date", "time_slot"],
        unique=False,
    )

    # 4) Seed the three spec-named demo amenities. We don't add a unique
    #    constraint on `name` since the existing seed used different
    #    display strings; if the same slug already exists this is a
    #    no-op against a fresh DB and only duplicates against a DB that
    #    skipped the earlier seed somehow.
    amenities_table = sa.table(
        "amenities",
        sa.column("id", sa.UUID()),
        sa.column("name", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("capacity", sa.Integer()),
        sa.column("is_active", sa.Boolean()),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )
    seeded_at = datetime.now(UTC)
    op.bulk_insert(
        amenities_table,
        [
            {
                "id": uuid.uuid4(),
                "name": "tennis_court_1",
                "description": ("Court 1 — full-size hard court, floodlit. Rackets at reception."),
                "capacity": 4,
                "is_active": True,
                "created_at": seeded_at,
            },
            {
                "id": uuid.uuid4(),
                "name": "bbq_area_lake",
                "description": (
                    "Lakeside BBQ pavilion — 3 charcoal stations, shaded dining for 20."
                ),
                "capacity": 20,
                "is_active": True,
                "created_at": seeded_at,
            },
            {
                "id": uuid.uuid4(),
                "name": "clubhouse_hall",
                "description": (
                    "Clubhouse multi-purpose hall — AC, stage, AV. "
                    "Birthdays, workshops, gatherings."
                ),
                "capacity": 60,
                "is_active": True,
                "created_at": seeded_at,
            },
        ],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_amenity_bookings_lock_tuple"), table_name="amenity_bookings")
    op.drop_column("amenity_bookings", "admin_notes")
    op.drop_column("amenity_bookings", "time_slot")
