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

from app.core.auth import _sanitize_name_part
from app.core.logging import logger
from app.models.ops import ServiceBooking as ServiceBookingRow
from app.models.unit import Unit
from app.models.user import User
from app.schemas.service_bookings import ServiceBooking, ServiceBookingCreateInput

# ─── State machine (Option B lifecycle) ─────────────────────────────────
#
#     pending  ──[confirm]──►  confirmed  ──[complete]──►  completed
#        │                          │
#        └──[cancel]── cancelled ◄──┘
#
# `completed` and `cancelled` are terminal. `in_progress` is reserved
# on the schema for future granularity but is not produced by any
# current transition — the Option B lifecycle is deliberately shallow.

# Map of (current_status) → set of allowed next_statuses. Used by the
# transition validator below. Single source of truth so the route layer
# and the WS broadcast don't drift.
_ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"confirmed", "cancelled"},
    "confirmed": {"completed", "cancelled"},
    "in_progress": {"completed", "cancelled"},
    "completed": set(),
    "cancelled": set(),
}


# ─── Errors ───────────────────────────────────────────────────────────────


class BookingNotFoundError(Exception):
    pass


class InvalidTransitionError(Exception):
    """Raised when an admin requests a status change that isn't allowed
    by the Option B lifecycle (e.g. trying to confirm a cancelled
    booking). The route layer maps this to a 409 Conflict so the admin
    UI can react distinctly from a 404 / 500."""

    def __init__(self, current: str, target: str) -> None:
        self.current = current
        self.target = target
        super().__init__(
            f"Cannot transition booking from {current!r} to {target!r}; "
            f"allowed next states: {sorted(_ALLOWED_TRANSITIONS.get(current, set()))}",
        )


# ─── Row projection ───────────────────────────────────────────────────────


def _project(
    row: ServiceBookingRow,
    user: User,
    unit: Unit | None,
    *,
    include_admin_notes: bool = False,
) -> ServiceBooking:
    """Build the wire-format ServiceBooking from a row triple.

    `first_name` / `last_name` are sanitized at read-time too so any
    poisoned rows ("null"/"undefined" strings persisted before the
    auth-layer guard landed) render as a clean email fallback instead
    of "null null" in the admin dashboard.

    `admin_notes` is gated on `include_admin_notes` — the resident-side
    projection blanks it (admins-only field), the admin-side projection
    includes the stored value.
    """
    clean_first = _sanitize_name_part(user.first_name)
    clean_last = _sanitize_name_part(user.last_name)
    full_name = " ".join(p for p in (clean_first, clean_last) if p) or user.email
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
        adminNotes=row.admin_notes if include_admin_notes else None,
        createdAt=row.created_at.isoformat(),
        updatedAt=row.updated_at.isoformat(),
    )


async def _fetch_by_id(
    session: AsyncSession, booking_id: uuid.UUID, *, include_admin_notes: bool = False
) -> ServiceBooking:
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
    return _project(row, user, unit, include_admin_notes=include_admin_notes)


# ─── Reads ────────────────────────────────────────────────────────────────


async def list_bookings(
    session: AsyncSession,
    *,
    user_id: uuid.UUID | None = None,
    include_admin_notes: bool = False,
) -> list[ServiceBooking]:
    """Newest-first snapshot. Pass `user_id` to scope to one resident
    (the /me/service-bookings case) or leave None for the admin view.

    `include_admin_notes` should ONLY be True for admin callers — the
    resident-facing projection blanks the field. Status transitions log
    them to admin_notes too (e.g. "[2026-06-09T10:00:00Z] confirmed by
    admin") so an admin viewing a list sees an audit trail without an
    extra fetch.
    """
    stmt = (
        select(ServiceBookingRow, User, Unit)
        .join(User, User.id == ServiceBookingRow.user_id)
        .join(Unit, Unit.id == ServiceBookingRow.unit_id, isouter=True)
        .order_by(desc(ServiceBookingRow.created_at))
    )
    if user_id is not None:
        stmt = stmt.where(ServiceBookingRow.user_id == user_id)
    result = await session.execute(stmt)
    return [
        _project(row, user, unit, include_admin_notes=include_admin_notes)
        for (row, user, unit) in result.all()
    ]


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


# ─── State-machine transitions ─────────────────────────────────────────────


def _parse_booking_id(raw: str) -> uuid.UUID:
    try:
        return uuid.UUID(raw)
    except ValueError as exc:
        raise BookingNotFoundError(raw) from exc


async def _transition(
    session: AsyncSession,
    booking_id: str,
    target_status: str,
    *,
    action_label: str,
) -> ServiceBooking:
    """Validate the requested transition, persist, project (admin view),
    broadcast. Single entry point for confirm / complete / cancel so the
    invariant of "always check allowed transitions" can't drift across
    callers."""
    pk = _parse_booking_id(booking_id)
    row = await session.get(ServiceBookingRow, pk)
    if row is None:
        raise BookingNotFoundError(booking_id)
    allowed = _ALLOWED_TRANSITIONS.get(row.status, set())
    if target_status not in allowed:
        raise InvalidTransitionError(row.status, target_status)
    previous = row.status
    row.status = target_status
    await session.commit()
    await session.refresh(row)
    # admin-side projection — includes admin_notes for the dashboard.
    booking = await _fetch_by_id(session, row.id, include_admin_notes=True)
    await _broadcast({"type": "booking.updated", "item": booking.model_dump()})
    logger.info(
        f"service_booking.{action_label}",
        id=booking.id,
        from_status=previous,
        to_status=target_status,
        resident=booking.residentName,
    )
    return booking


async def confirm_booking(session: AsyncSession, booking_id: str) -> ServiceBooking:
    """pending → confirmed. Admin acknowledged + vendor accepted."""
    return await _transition(session, booking_id, "confirmed", action_label="confirmed")


async def complete_booking(session: AsyncSession, booking_id: str) -> ServiceBooking:
    """confirmed (or in_progress) → completed. Service delivered."""
    return await _transition(session, booking_id, "completed", action_label="completed")


async def cancel_booking(session: AsyncSession, booking_id: str) -> ServiceBooking:
    """pending / confirmed / in_progress → cancelled. Escape hatch."""
    return await _transition(session, booking_id, "cancelled", action_label="cancelled")


async def update_admin_notes(
    session: AsyncSession, booking_id: str, admin_notes: str | None
) -> ServiceBooking:
    """Patch the internal admin_notes field. Stays separate from status
    transitions so the two concerns don't co-mingle. An empty string is
    treated as a request to clear the field (stored as NULL)."""
    pk = _parse_booking_id(booking_id)
    row = await session.get(ServiceBookingRow, pk)
    if row is None:
        raise BookingNotFoundError(booking_id)
    clean = admin_notes.strip() if admin_notes else None
    row.admin_notes = clean or None
    await session.commit()
    await session.refresh(row)
    booking = await _fetch_by_id(session, row.id, include_admin_notes=True)
    await _broadcast({"type": "booking.updated", "item": booking.model_dump()})
    logger.info(
        "service_booking.admin_notes.updated",
        id=booking.id,
        has_notes=bool(clean),
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
    "InvalidTransitionError",
    "cancel_booking",
    "complete_booking",
    "confirm_booking",
    "create_booking",
    "list_bookings",
    "subscribe",
    "update_admin_notes",
]
