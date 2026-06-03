"""Service Bookings data layer.

Mirrors `requests_hub` 1:1 for architectural consistency:

1. **Persistence.** Reads/writes against `service_bookings`, joining to
   `users` and `units` to project rows into the camelCase wire-format
   `ServiceBooking` schema the frontend speaks natively.
2. **Live fan-out.** `subscribe()` + `_broadcast()` are in-process
   asyncio.Queues. Multi-worker scale needs Redis pub/sub — REDIS_URL is
   wired but not yet used here, same as the maintenance pipeline.

The admin dashboard subscribes to the same broadcast queue so a new
service booking flips a card on screen the instant the POST commits —
no polling, no refresh.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models.ops import ServiceBooking as ServiceBookingRow
from app.models.unit import Unit
from app.models.user import User
from app.schemas.service_bookings import ServiceBooking, ServiceBookingCreateInput

# ─── Errors ───────────────────────────────────────────────────────────────


class BookingNotFoundError(Exception):
    pass


# ─── Row projection ───────────────────────────────────────────────────────


def _project(row: ServiceBookingRow, user: User, unit: Unit | None) -> ServiceBooking:
    """Build the wire-format ServiceBooking from a row triple."""
    full_name = " ".join(p for p in (user.first_name, user.last_name) if p) or user.email
    return ServiceBooking(
        id=str(row.id),
        residentName=full_name,
        unit=unit.name if unit is not None else "—",
        tileId=row.tile_id,
        providerId=row.provider_id,
        offeringKey=row.offering_key,
        dateIso=row.date_iso,
        timeSlot=row.time_slot,
        notes=row.notes,
        status=row.status,  # type: ignore[arg-type]
        createdAt=row.created_at.isoformat(),
        updatedAt=row.updated_at.isoformat(),
    )


async def _fetch_by_id(session: AsyncSession, booking_id: uuid.UUID) -> ServiceBooking:
    stmt = (
        select(ServiceBookingRow, User, Unit)
        .join(User, User.id == ServiceBookingRow.user_id)
        .join(Unit, Unit.id == ServiceBookingRow.unit_id, isouter=True)
        .where(ServiceBookingRow.id == booking_id)
    )
    result = await session.execute(stmt)
    found = result.one_or_none()
    if found is None:
        raise BookingNotFoundError(str(booking_id))
    row, user, unit = found
    return _project(row, user, unit)


# ─── Reads ────────────────────────────────────────────────────────────────


async def list_bookings(
    session: AsyncSession,
    *,
    user_id: uuid.UUID | None = None,
) -> list[ServiceBooking]:
    """Newest-first snapshot. Pass `user_id` to scope to one resident
    (the /me/service-bookings case) or leave None for the admin view."""
    stmt = (
        select(ServiceBookingRow, User, Unit)
        .join(User, User.id == ServiceBookingRow.user_id)
        .join(Unit, Unit.id == ServiceBookingRow.unit_id, isouter=True)
        .order_by(desc(ServiceBookingRow.created_at))
    )
    if user_id is not None:
        stmt = stmt.where(ServiceBookingRow.user_id == user_id)
    result = await session.execute(stmt)
    return [_project(row, user, unit) for (row, user, unit) in result.all()]


# ─── Mutations ────────────────────────────────────────────────────────────


async def create_booking(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    unit_id: uuid.UUID | None,
    payload: ServiceBookingCreateInput,
) -> ServiceBooking:
    """INSERT a pending booking, project it, broadcast."""
    new = ServiceBookingRow(
        user_id=user_id,
        unit_id=unit_id,
        tile_id=payload.tileId,
        provider_id=payload.providerId,
        offering_key=payload.offeringKey,
        date_iso=payload.dateIso,
        time_slot=payload.timeSlot,
        notes=payload.notes.strip() if payload.notes else None,
        status="pending",
    )
    session.add(new)
    await session.flush()
    await session.commit()
    await session.refresh(new)
    booking = await _fetch_by_id(session, new.id)

    await _broadcast({"type": "booking.updated", "item": booking.model_dump()})
    logger.info(
        "service_booking.created",
        id=booking.id,
        resident=booking.residentName,
        tile=booking.tileId,
        provider=booking.providerId,
        offering=booking.offeringKey,
    )
    return booking


# ─── Broadcast hub (still in-process) ─────────────────────────────────────

_subscribers: set[asyncio.Queue[dict[str, Any]]] = set()
_subscribers_lock = asyncio.Lock()


@asynccontextmanager
async def subscribe() -> AsyncIterator[asyncio.Queue[dict[str, Any]]]:
    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    async with _subscribers_lock:
        _subscribers.add(queue)
    logger.info("service_bookings.subscriber.added", total=len(_subscribers))
    try:
        yield queue
    finally:
        async with _subscribers_lock:
            _subscribers.discard(queue)
        logger.info("service_bookings.subscriber.removed", total=len(_subscribers))


async def _broadcast(message: dict[str, Any]) -> None:
    async with _subscribers_lock:
        queues = list(_subscribers)
    for q in queues:
        with contextlib.suppress(asyncio.QueueFull):
            q.put_nowait(message)


__all__ = [
    "BookingNotFoundError",
    "create_booking",
    "list_bookings",
    "subscribe",
]
