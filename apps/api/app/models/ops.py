import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAt, Timestamps, UuidPk, utcnow


class Booking(UuidPk, CreatedAt, Base):
    __tablename__ = "bookings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    unit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id"), nullable=True
    )
    facility: Mapped[str] = mapped_column(String, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    slot: Mapped[str] = mapped_column(String, nullable=False)
    guests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String, default="confirmed", nullable=False)


class MaintenanceRequest(UuidPk, Timestamps, Base):
    # `created_at` from Timestamps mixin = wire-format `openedAt`.
    # `updated_at` from Timestamps mixin = wire-format `updatedAt`.
    __tablename__ = "maintenance_requests"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    unit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id"), nullable=True
    )
    category: Mapped[str] = mapped_column(String, nullable=False)
    urgency: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str | None] = mapped_column(String(80), nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending", nullable=False)
    assignee_id: Mapped[str | None] = mapped_column(String, nullable=True)
    # Scheduled appointment metadata for the 24/7 maintenance slot
    # system. Nullable because legacy tickets pre-date this feature and
    # because some emergency/internal tickets don't go through the slot
    # picker. `scheduled_time_slot` stores the canonical label form
    # "09:00-12:00" (11 chars max) defined in
    # `app.services.maintenance_slots.TIME_SLOTS`. Counted by
    # /api/v1/maintenance/availability to enforce per-slot concurrency.
    scheduled_date_iso: Mapped[str | None] = mapped_column(String(10), nullable=True, index=True)
    scheduled_time_slot: Mapped[str | None] = mapped_column(String(11), nullable=True)


class Invoice(UuidPk, CreatedAt, Base):
    __tablename__ = "invoices"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    unit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id"), nullable=True
    )
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    sub: Mapped[str | None] = mapped_column(String, nullable=True)
    amount_egp: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(String, default="due", nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Guest(UuidPk, CreatedAt, Base):
    __tablename__ = "guests"

    inviter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    unit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id"), nullable=True
    )
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    visit_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    validity: Mapped[str | None] = mapped_column(String, nullable=True)
    qr_token: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)


class ServiceBooking(UuidPk, Timestamps, Base):
    """Resident-booked daily-tile service request — Cleaning, Laundry,
    Delivery, Pet, Gardening, Security Guard, Wellness sessions, etc.

    Distinct from `MaintenanceRequest` because the lifecycle is different:
    maintenance tickets go through the admin dispatch board with a
    technician roster; service bookings are date+slot scheduled vendor
    requests that flip pending → confirmed → in_progress → completed
    (or cancelled).

    Wire-format projections live in `app.schemas.service_bookings`;
    live fan-out + persistence in `app.services.service_bookings_hub`.
    Note: `daily-home` (Home Services) intentionally routes through the
    maintenance ticket pipeline instead, so it never lands here.
    """

    __tablename__ = "service_bookings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    unit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id"), nullable=True
    )
    # Logical service identifier (e.g. `daily-cleaning`, `daily-pet`,
    # `wellness-spa`). Kept as a free string so adding a new tile doesn't
    # require a backend deploy.
    tile_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    provider_id: Mapped[str] = mapped_column(String(64), nullable=False)
    offering_key: Mapped[str] = mapped_column(String(64), nullable=False)
    # Scheduling — date (calendar day) + slot (HH:MM). Stored as ISO
    # strings to match the frontend wire shape exactly; we don't do any
    # back-end date math on these for the demo, so DATE/TIME types would
    # only add format-coercion friction.
    date_iso: Mapped[str] = mapped_column(String(10), nullable=False)
    time_slot: Mapped[str] = mapped_column(String(5), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending", nullable=False)
    # Admin-only commentary attached during the lifecycle (e.g. "vendor
    # ETA 30 min late", "resident rescheduled via WhatsApp"). Hidden
    # from the resident-side projection — see service_bookings_hub.
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Amenity(UuidPk, CreatedAt, Base):
    """Shared compound facility a resident can book in time blocks.

    Cap is the absolute concurrent occupancy ceiling — used by the
    capacity-conflict check on POST /amenities/book. `is_active = False`
    hides the amenity from the catalog without losing historical
    bookings that reference it.
    """

    __tablename__ = "amenities"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class AmenityBooking(UuidPk, Timestamps, Base):
    """Resident booking against a specific amenity for a time window.

    Lifecycle:
        pending   →  resident submitted, ops have not yet acknowledged
        confirmed →  ops accepted; the slot is firmly held
        cancelled →  withdrawn (by resident or ops) — does not free
                     capacity retroactively for past windows but does
                     release future ones

    `user_id` follows the rest of the schema's convention (the User
    table is `users`, not `residents`); the resident concept is a role
    on the user, not a separate identity. `unit_id` is nullable so a
    user without a unit affiliation can still book a community amenity
    (e.g. invited guests during a temporary access window).
    """

    __tablename__ = "amenity_bookings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    unit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id"), nullable=True
    )
    amenity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("amenities.id"), nullable=False, index=True
    )
    # Stored as DATE + TIME so we can do real interval-overlap queries
    # in SQL for the capacity check. The ServiceBooking table stores
    # date/slot as strings because their slot grid is fixed; amenities
    # accept arbitrary start/end times so types pay off here.
    booking_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)  # "HH:MM"
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)  # "HH:MM"
    guests_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending", nullable=False)


class FamilyMember(UuidPk, CreatedAt, Base):
    """Resident-declared family member or unit dependent.

    Distinct from `UnitMember`, which carries a Clerk-authed `user_id`
    for residents who have their own sign-in. A FamilyMember has no
    user account — it's a roster entry the primary resident maintains
    so the gate team can validate ad-hoc family arrivals, so the unit
    head-count is accurate for billing/utilities, and so future
    surfaces (visitor QR pre-fill, lift access) can preselect a known
    relation without typing.

    Phone is stored in normalized form (digits + leading `+`) so the
    `(unit_id, phone)` UNIQUE constraint catches duplicate adds across
    different display variants ("+201234567890" vs "+20 123 456 7890").
    """

    __tablename__ = "family_members"
    __table_args__ = (UniqueConstraint("unit_id", "phone", name="uq_family_members_unit_phone"),)

    primary_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    # Free string with a Literal-typed schema gate — keeps the DB
    # flexible (a developer can add "guardian" later without an enum
    # migration) while the API surface stays strongly typed.
    relationship: Mapped[str] = mapped_column(String(32), nullable=False)


class QrLog(UuidPk, Base):
    __tablename__ = "qr_logs"

    unit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id"), nullable=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    guest_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("guests.id"), nullable=True
    )
    kind: Mapped[str] = mapped_column(String, nullable=False)
    gate: Mapped[str | None] = mapped_column(String, nullable=True)
    method: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str | None] = mapped_column(String, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )
