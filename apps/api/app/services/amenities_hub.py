"""Amenities data layer.

Two responsibilities:

1. **Read.** `list_active_amenities` projects the `amenities` table into
   the wire-format `Amenity` schema, skipping rows where `is_active`
   is False.
2. **Write.** `create_booking` runs a capacity conflict check in the
   same SQL transaction as the INSERT: it sums guest counts on
   overlapping (booking_date, time-window) rows whose status hasn't
   been cancelled, and raises `CapacityExceededError` (mapped to 409)
   if the new payload would push total occupancy past the amenity's
   `capacity` ceiling.

Time-overlap predicate:
    new.start < existing.end  AND  existing.start < new.end

i.e. half-open intervals overlap iff each starts before the other
ends. Identical edge times (`new.end == existing.start`) deliberately
do NOT count as overlap so two back-to-back bookings on a single-slot
amenity remain bookable.
"""

from __future__ import annotations

import uuid
from datetime import date as date_t

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import _sanitize_name_part
from app.core.logging import logger
from app.models.ops import Amenity as AmenityRow
from app.models.ops import AmenityBooking as AmenityBookingRow
from app.models.user import User
from app.schemas.amenities import (
    Amenity,
    AmenityBookingCreateInput,
    AmenityBookingResponse,
)

# Statuses that still hold a slice of the amenity's capacity. A
# cancelled booking has released the slot and shouldn't count toward
# the conflict sum.
_OCCUPYING_STATUSES = ("pending", "confirmed")


# ─── Errors ───────────────────────────────────────────────────────────────


class AmenityNotFoundError(Exception):
    """Raised when the requested amenity id doesn't exist or is inactive."""


class CapacityExceededError(Exception):
    """Raised when the requested booking would push concurrent occupancy
    above the amenity's capacity. Route layer maps this to 409 Conflict
    so the frontend can distinguish "slot is full" from "bad payload"
    (422) and surface a different message."""

    def __init__(self, amenity_name: str, capacity: int, would_be: int) -> None:
        self.amenity_name = amenity_name
        self.capacity = capacity
        self.would_be = would_be
        super().__init__(
            f"Booking would exceed {amenity_name} capacity ({would_be} > {capacity})",
        )


# ─── Projection helpers ──────────────────────────────────────────────────


def _project_amenity(row: AmenityRow) -> Amenity:
    return Amenity(
        id=str(row.id),
        name=row.name,
        description=row.description,
        capacity=row.capacity,
        isActive=row.is_active,
    )


def _project_booking(
    row: AmenityBookingRow,
    amenity: AmenityRow,
    user: User,
) -> AmenityBookingResponse:
    clean_first = _sanitize_name_part(user.first_name)
    clean_last = _sanitize_name_part(user.last_name)
    full_name = " ".join(p for p in (clean_first, clean_last) if p) or user.email
    return AmenityBookingResponse(
        id=str(row.id),
        amenityId=str(amenity.id),
        amenityName=amenity.name,
        residentName=full_name,
        bookingDate=row.booking_date.isoformat(),
        startTime=row.start_time,
        endTime=row.end_time,
        guestsCount=row.guests_count,
        status=row.status,  # type: ignore[arg-type]
        createdAt=row.created_at.isoformat(),
        updatedAt=row.updated_at.isoformat(),
    )


# ─── Reads ───────────────────────────────────────────────────────────────


async def list_active_amenities(session: AsyncSession) -> list[Amenity]:
    """All amenities where `is_active` is True, sorted by name for a
    stable resident-side render."""
    stmt = select(AmenityRow).where(AmenityRow.is_active.is_(True)).order_by(AmenityRow.name)
    result = await session.execute(stmt)
    return [_project_amenity(row) for row in result.scalars().all()]


# ─── Mutations ───────────────────────────────────────────────────────────


def _parse_amenity_id(raw: str) -> uuid.UUID:
    try:
        return uuid.UUID(raw)
    except ValueError as exc:
        raise AmenityNotFoundError(raw) from exc


async def _fetch_amenity(
    session: AsyncSession, amenity_id: uuid.UUID, *, require_active: bool
) -> AmenityRow:
    stmt = select(AmenityRow).where(AmenityRow.id == amenity_id)
    amenity = await session.scalar(stmt)
    if amenity is None:
        raise AmenityNotFoundError(str(amenity_id))
    if require_active and not amenity.is_active:
        raise AmenityNotFoundError(str(amenity_id))
    return amenity


async def _occupied_capacity(
    session: AsyncSession,
    *,
    amenity_id: uuid.UUID,
    booking_date: date_t,
    start_time: str,
    end_time: str,
) -> int:
    """Sum of `guests_count` across non-cancelled bookings on the same
    amenity + day that overlap the requested time window. Used for the
    capacity-conflict check below."""
    stmt = select(func.coalesce(func.sum(AmenityBookingRow.guests_count), 0)).where(
        and_(
            AmenityBookingRow.amenity_id == amenity_id,
            AmenityBookingRow.booking_date == booking_date,
            AmenityBookingRow.status.in_(_OCCUPYING_STATUSES),
            # Half-open overlap: new.start < existing.end AND
            # existing.start < new.end. Comparing the canonical "HH:MM"
            # strings is lexicographically valid (zero-padded 24h).
            and_(
                AmenityBookingRow.end_time > start_time,
                AmenityBookingRow.start_time < end_time,
            ),
        )
    )
    return int(await session.scalar(stmt) or 0)


async def create_booking(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    unit_id: uuid.UUID | None,
    payload: AmenityBookingCreateInput,
) -> AmenityBookingResponse:
    """Insert a `pending` booking, gated on capacity. Atomic per request
    via the session's transaction — if the SUM query and the INSERT
    aren't wrapped in the same transaction another POST landing in the
    same millisecond can race past the check. The default async session
    config from `core.database` opens an implicit transaction on first
    statement, so this is fine for the MVP. If/when we have multiple
    workers competing for the same row, swap to SELECT FOR UPDATE on
    the existing rows or move the check into a CHECK constraint."""
    amenity_uuid = _parse_amenity_id(payload.amenityId)
    amenity = await _fetch_amenity(session, amenity_uuid, require_active=True)

    if payload.startTime >= payload.endTime:
        # Shouldn't be reached if the frontend validates, but a hostile
        # client could submit this. Treat as a 409 because the issue is
        # semantic, not schema-shape.
        raise CapacityExceededError(amenity.name, amenity.capacity, payload.guestsCount)

    booking_date = date_t.fromisoformat(payload.bookingDate)

    already_used = await _occupied_capacity(
        session,
        amenity_id=amenity.id,
        booking_date=booking_date,
        start_time=payload.startTime,
        end_time=payload.endTime,
    )
    would_be = already_used + payload.guestsCount
    if would_be > amenity.capacity:
        raise CapacityExceededError(amenity.name, amenity.capacity, would_be)

    row = AmenityBookingRow(
        user_id=user_id,
        unit_id=unit_id,
        amenity_id=amenity.id,
        booking_date=booking_date,
        start_time=payload.startTime,
        end_time=payload.endTime,
        guests_count=payload.guestsCount,
        status="pending",
    )
    session.add(row)
    await session.flush()
    await session.commit()
    await session.refresh(row)

    user = await session.scalar(select(User).where(User.id == user_id))
    if user is None:
        # Should never happen — the auth dependency wouldn't have let us
        # reach this point without a valid user. Defensive log + bail.
        raise AmenityNotFoundError(f"user not found: {user_id}")

    projected = _project_booking(row, amenity, user)
    logger.info(
        "amenity_booking.created",
        id=projected.id,
        amenity=amenity.name,
        resident=projected.residentName,
        booking_date=projected.bookingDate,
        window=f"{projected.startTime}-{projected.endTime}",
        guests=projected.guestsCount,
    )
    return projected


# Silence an unused-import lint when `or_` isn't picked up by the
# overlap expression above (it currently isn't — kept available for
# future split-window predicates without re-introducing the import
# round-trip).
_ = or_
