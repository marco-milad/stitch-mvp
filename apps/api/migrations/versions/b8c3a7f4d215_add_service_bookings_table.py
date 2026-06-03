"""add_service_bookings_table

Provisions the `service_bookings` table that backs the Cleaning, Laundry,
Delivery, Pet, Gardening, Security Guard, and Wellness tile flows.
Distinct from `maintenance_requests` because the lifecycle and the admin
surface differ (vendor-bound vs technician-dispatched).

Revision ID: b8c3a7f4d215
Revises: e26eaa5a5b5e
Create Date: 2026-06-03 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b8c3a7f4d215"
down_revision: str | None = "e26eaa5a5b5e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "service_bookings",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("unit_id", sa.UUID(), nullable=True),
        sa.Column("tile_id", sa.String(length=64), nullable=False),
        sa.Column("provider_id", sa.String(length=64), nullable=False),
        sa.Column("offering_key", sa.String(length=64), nullable=False),
        sa.Column("date_iso", sa.String(length=10), nullable=False),
        sa.Column("time_slot", sa.String(length=5), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_service_bookings_user_id"),
        "service_bookings",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_service_bookings_tile_id"),
        "service_bookings",
        ["tile_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_service_bookings_tile_id"), table_name="service_bookings")
    op.drop_index(op.f("ix_service_bookings_user_id"), table_name="service_bookings")
    op.drop_table("service_bookings")
