"""Parking slot + booking schemas for the resident-facing temporary booking
flow. Slots are seeded per-zone; status is computed relative to the
calling resident (their own bookings = `reserved_self`).
"""
# ruff: noqa: N815  -- camelCase mirrors the wire-format used by the web client.

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ParkingZone = Literal["phase1", "sarai", "tajSultan"]
SlotStatus = Literal["free", "reserved_self", "reserved_other"]


class ParkingSlot(BaseModel):
    id: str
    zone: ParkingZone
    label: str  # human-friendly slot id, e.g. "B-12", "P1-04"
    status: SlotStatus
    reservedUntil: str | None = None  # ISO 8601, set on reserved slots


class ParkingSlotsList(BaseModel):
    items: list[ParkingSlot]


class ParkingBookingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    slotId: str = Field(min_length=1)
    until: str  # ISO 8601 with TZ — when the temp booking releases


class ParkingBooking(BaseModel):
    id: str
    slotId: str
    slotLabel: str
    zone: ParkingZone
    residentName: str
    until: str
    createdAt: str
