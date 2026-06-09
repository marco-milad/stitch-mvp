"""24/7 maintenance slot scheduling.

The compound operates continuously with rotating shifts — no holidays,
no closing hours. We carve the day into 8 sequential 3-hour slots
(09:00 → 09:00 next morning) and cap concurrency per (category, date,
slot) tuple so a single category can't get overloaded on a given day.

`TIME_SLOTS` is the single source of truth for slot labels — the
frontend's matching constant is generated from this list, the DB stores
its canonical form verbatim, and the availability counter group-bys on
this exact string.
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ops import MaintenanceRequest

# ─── Canonical slot definitions ──────────────────────────────────────────

#: 8 sequential 3-hour windows starting at 09:00, wrapping past midnight
#: back to 09:00. Order in this list is the order rendered on the
#: frontend grid — kept stable so a slot at index 4 is always the same
#: slot across builds.
TIME_SLOTS: tuple[str, ...] = (
    "09:00-12:00",
    "12:00-15:00",
    "15:00-18:00",
    "18:00-21:00",
    "21:00-00:00",
    "00:00-03:00",
    "03:00-06:00",
    "06:00-09:00",
)

#: Hard cap on concurrent active tickets per (category, date, slot).
#: Anything ≥ this number marks the slot unavailable on the frontend.
CAPACITY_PER_SLOT: int = 3

#: Active ticket statuses that count against capacity. `resolved` is
#: explicitly excluded — once a job is done, its slot frees up.
_ACTIVE_STATUSES: tuple[str, ...] = ("pending", "in_progress")


# ─── Validation helpers ──────────────────────────────────────────────────


def is_valid_slot(slot: str) -> bool:
    """True iff `slot` matches one of the 8 canonical labels exactly."""
    return slot in TIME_SLOTS


# ─── Availability counter ────────────────────────────────────────────────


async def count_slot_bookings(
    session: AsyncSession,
    *,
    category: str,
    date_iso: str,
) -> dict[str, int]:
    """Group-by query: count active tickets for the given (category,
    date_iso) bucket, keyed by their `scheduled_time_slot`.

    Returns a dict mapping slot label → count. Slots with zero bookings
    are absent from the dict; callers should default to 0.

    Why this lives in its own module (not in requests_hub): the
    availability endpoint is read-only and doesn't fit the
    requests_hub's mutation-and-broadcast pattern. Keeping it separate
    means a unit test can exercise the SQL without dragging in the
    broadcast queue + WS plumbing.
    """
    stmt = (
        select(MaintenanceRequest.scheduled_time_slot, func.count())
        .where(MaintenanceRequest.category == category)
        .where(MaintenanceRequest.scheduled_date_iso == date_iso)
        .where(MaintenanceRequest.status.in_(_ACTIVE_STATUSES))
        .where(MaintenanceRequest.scheduled_time_slot.is_not(None))
        .group_by(MaintenanceRequest.scheduled_time_slot)
    )
    result = await session.execute(stmt)
    return {slot: count for (slot, count) in result.all() if slot is not None}


async def availability_for(
    session: AsyncSession,
    *,
    category: str,
    date_iso: str,
) -> list[dict[str, object]]:
    """Render the 8-slot availability snapshot. Each entry includes the
    slot label, current booked count, fixed capacity, and a derived
    `available` boolean that the frontend can switch on without
    re-doing the arithmetic.

    Returned in TIME_SLOTS order so the frontend grid stays positional.
    """
    counts = await count_slot_bookings(session, category=category, date_iso=date_iso)
    return [
        {
            "slot": slot,
            "bookedCount": counts.get(slot, 0),
            "capacity": CAPACITY_PER_SLOT,
            "available": counts.get(slot, 0) < CAPACITY_PER_SLOT,
        }
        for slot in TIME_SLOTS
    ]


# ─── Capacity-checked single-row insert helper ───────────────────────────
#
# Used by requests_hub.create_request when the caller supplies a slot.
# Returns True if the booking was at-or-below capacity at INSERT time,
# False if the slot is already full. Race-safe enough for MVP scale —
# the check happens inside the same transaction as the INSERT, so
# two simultaneous bookings could both win and exceed capacity by 1.
# Acceptable for now; tighten with a SERIALIZABLE transaction or unique
# index when traffic warrants.


async def is_slot_within_capacity(
    session: AsyncSession,
    *,
    category: str,
    date_iso: str,
    time_slot: str,
) -> bool:
    stmt = (
        select(func.count())
        .select_from(MaintenanceRequest)
        .where(MaintenanceRequest.category == category)
        .where(MaintenanceRequest.scheduled_date_iso == date_iso)
        .where(MaintenanceRequest.scheduled_time_slot == time_slot)
        .where(MaintenanceRequest.status.in_(_ACTIVE_STATUSES))
    )
    current = await session.scalar(stmt) or 0
    return int(current) < CAPACITY_PER_SLOT


__all__ = [
    "CAPACITY_PER_SLOT",
    "TIME_SLOTS",
    "availability_for",
    "count_slot_bookings",
    "is_slot_within_capacity",
    "is_valid_slot",
]
