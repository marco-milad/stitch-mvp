"""Parking slot directory + temporary-booking lifecycle. In-memory for the
demo; the real implementation reads from the parking_slots table and uses
a single-row UPDATE inside a transaction so two residents can't book the
same slot.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime

from app.core.logging import logger
from app.schemas.parking import (
    ParkingBooking,
    ParkingBookingCreate,
    ParkingSlot,
    ParkingZone,
    SlotStatus,
)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


# ─── Seed slots ─────────────────────────────────────────────────────────────


def _seed_slots() -> dict[str, ParkingSlot]:
    raw: list[tuple[str, ParkingZone, str]] = [
        # Phase 1
        ("ps-p1-01", "phase1", "P1-04"),
        ("ps-p1-02", "phase1", "P1-09"),
        ("ps-p1-03", "phase1", "P1-12"),
        ("ps-p1-04", "phase1", "P1-18"),
        # Sarai
        ("ps-sa-01", "sarai", "S-B-02"),
        ("ps-sa-02", "sarai", "S-B-07"),
        ("ps-sa-03", "sarai", "S-B-11"),
        ("ps-sa-04", "sarai", "S-B-15"),
        # Taj Sultan
        ("ps-ts-01", "tajSultan", "TS-01"),
        ("ps-ts-02", "tajSultan", "TS-03"),
        ("ps-ts-03", "tajSultan", "TS-09"),
        ("ps-ts-04", "tajSultan", "TS-14"),
    ]
    return {
        sid: ParkingSlot(id=sid, zone=zone, label=label, status="free") for sid, zone, label in raw
    }


_slots: dict[str, ParkingSlot] = _seed_slots()
_bookings: dict[str, ParkingBooking] = {}
_lock = asyncio.Lock()


# ─── Pre-existing reservation (one slot taken by a neighbour for demo flavor) ─


async def _seed_initial_bookings() -> None:
    """Mark one slot in each zone as reserved by someone else so the demo
    has visible 'reserved_other' tiles right away."""
    async with _lock:
        for slot_id in ("ps-p1-04", "ps-sa-04", "ps-ts-04"):
            slot = _slots[slot_id]
            _slots[slot_id] = slot.model_copy(
                update={
                    "status": "reserved_other",
                    "reservedUntil": None,
                }
            )


_initial_seeded = False


async def _ensure_initial_seed() -> None:
    global _initial_seeded
    if not _initial_seeded:
        await _seed_initial_bookings()
        _initial_seeded = True


# ─── Public API ─────────────────────────────────────────────────────────────


class SlotUnavailableError(Exception):
    pass


class SlotNotFoundError(Exception):
    pass


class BookingNotFoundError(Exception):
    pass


def _project_status(
    slot: ParkingSlot, resident_name: str, bookings: dict[str, ParkingBooking]
) -> SlotStatus:
    """Resolve the slot's status from this resident's perspective."""
    booking = next((b for b in bookings.values() if b.slotId == slot.id), None)
    if booking is None:
        return "reserved_other" if slot.status == "reserved_other" else "free"
    return "reserved_self" if booking.residentName == resident_name else "reserved_other"


async def list_slots(resident_name: str) -> list[ParkingSlot]:
    await _ensure_initial_seed()
    async with _lock:
        slots = list(_slots.values())
        bookings = dict(_bookings)
    projected: list[ParkingSlot] = []
    for s in slots:
        status = _project_status(s, resident_name, bookings)
        booking = next((b for b in bookings.values() if b.slotId == s.id), None)
        projected.append(
            s.model_copy(
                update={
                    "status": status,
                    "reservedUntil": booking.until if booking else None,
                }
            )
        )
    return projected


async def create_booking(resident_name: str, payload: ParkingBookingCreate) -> ParkingBooking:
    await _ensure_initial_seed()
    async with _lock:
        slot = _slots.get(payload.slotId)
        if slot is None:
            raise SlotNotFoundError(payload.slotId)
        existing = next((b for b in _bookings.values() if b.slotId == slot.id), None)
        if existing is not None and existing.residentName != resident_name:
            raise SlotUnavailableError(slot.id)
        if slot.status == "reserved_other" and existing is None:
            raise SlotUnavailableError(slot.id)
        # If the same resident already has it, return the existing booking
        # (idempotent re-tap on the same tile).
        if existing is not None:
            return existing
        booking = ParkingBooking(
            id=f"pb-{uuid.uuid4().hex[:8]}",
            slotId=slot.id,
            slotLabel=slot.label,
            zone=slot.zone,
            residentName=resident_name,
            until=payload.until,
            createdAt=_now_iso(),
        )
        _bookings[booking.id] = booking
    logger.info("parking.booking.created", id=booking.id, slot=slot.id)
    return booking


async def release_booking(resident_name: str, booking_id: str) -> None:
    async with _lock:
        booking = _bookings.get(booking_id)
        if booking is None:
            raise BookingNotFoundError(booking_id)
        if booking.residentName != resident_name:
            raise BookingNotFoundError(booking_id)
        del _bookings[booking_id]
    logger.info("parking.booking.released", id=booking_id)


async def my_bookings(resident_name: str) -> list[ParkingBooking]:
    async with _lock:
        return [b for b in _bookings.values() if b.residentName == resident_name]
