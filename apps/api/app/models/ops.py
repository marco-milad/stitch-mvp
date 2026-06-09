import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, String, Text
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
