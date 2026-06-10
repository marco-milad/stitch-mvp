"""add_amenities_and_amenity_bookings_tables

Provisions the `amenities` catalog table and the `amenity_bookings`
table that backs the resident-side AmenitiesBook flow. Seeds three
demo amenities (Tennis Court, BBQ Area, Community Hall) at the end of
`upgrade()` so a fresh database has a non-empty catalog immediately.

Revision ID: f7b2e9d61c84
Revises: d3f5b1a78e94
Create Date: 2026-06-09 14:00:00.000000

"""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f7b2e9d61c84"
down_revision: str | None = "d3f5b1a78e94"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "amenities",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "amenity_bookings",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("unit_id", sa.UUID(), nullable=True),
        sa.Column("amenity_id", sa.UUID(), nullable=False),
        sa.Column("booking_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.String(length=5), nullable=False),
        sa.Column("end_time", sa.String(length=5), nullable=False),
        sa.Column("guests_count", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["amenity_id"], ["amenities.id"]),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_amenity_bookings_user_id"),
        "amenity_bookings",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_amenity_bookings_amenity_id"),
        "amenity_bookings",
        ["amenity_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_amenity_bookings_booking_date"),
        "amenity_bookings",
        ["booking_date"],
        unique=False,
    )

    # Seed the three demo amenities the design brief calls out. Using
    # `sa.inline_literal` keeps the SQL portable across the asyncpg
    # driver Alembic uses for online migrations.
    amenities_table = sa.table(
        "amenities",
        sa.column("id", sa.UUID()),
        sa.column("name", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("capacity", sa.Integer()),
        sa.column("is_active", sa.Boolean()),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )
    # `sa.func.now()` would round-trip through the asyncpg driver's
    # executemany() and fail to bind ("expected a datetime.date or
    # datetime.datetime instance, got 'now'") — using a Python-side
    # timestamp keeps the bulk_insert portable.
    seeded_at = datetime.now(UTC)
    op.bulk_insert(
        amenities_table,
        [
            {
                "id": uuid.uuid4(),
                "name": "Tennis Court",
                "description": (
                    "Full-size hard court with floodlights. "
                    "Doubles-friendly; rackets available at reception."
                ),
                "capacity": 4,
                "is_active": True,
                "created_at": seeded_at,
            },
            {
                "id": uuid.uuid4(),
                "name": "BBQ Area",
                "description": (
                    "Shaded grilling pavilion with 3 charcoal stations, "
                    "prep counters, and a dining patio for up to 20."
                ),
                "capacity": 20,
                "is_active": True,
                "created_at": seeded_at,
            },
            {
                "id": uuid.uuid4(),
                "name": "Community Hall",
                "description": (
                    "Indoor multi-purpose hall for birthdays, workshops, "
                    "and resident gatherings. AC, stage, AV system."
                ),
                "capacity": 60,
                "is_active": True,
                "created_at": seeded_at,
            },
        ],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_amenity_bookings_booking_date"), table_name="amenity_bookings")
    op.drop_index(op.f("ix_amenity_bookings_amenity_id"), table_name="amenity_bookings")
    op.drop_index(op.f("ix_amenity_bookings_user_id"), table_name="amenity_bookings")
    op.drop_table("amenity_bookings")
    op.drop_table("amenities")
