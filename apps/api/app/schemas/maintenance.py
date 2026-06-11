"""Pydantic schemas for the 24/7 maintenance slot availability surface.

Distinct from `app.schemas.requests` (which carries
`RequestCreateInput`/`ServiceRequest`/etc.) because availability is a
purely-read concept that doesn't share fields or lifecycle with the
ticket entity. Keeping them separate makes the OpenAPI grouping
cleaner — the Swagger docs render "maintenance" as its own tag.
"""
# ruff: noqa: N815  -- camelCase matches the frontend wire format.

from __future__ import annotations

from pydantic import BaseModel


class MaintenanceSlot(BaseModel):
    """Single slot row in the availability response."""

    slot: str  # canonical label "09:00-12:00"
    bookedCount: int
    capacity: int
    available: bool


class MaintenanceAvailabilityResponse(BaseModel):
    """Full availability snapshot for a (category, date) pair."""

    category: str
    dateIso: str
    capacityPerSlot: int
    slots: list[MaintenanceSlot]


# ─── New dynamic capacity engine ──────────────────────────────────────────


class TechnicianBrief(BaseModel):
    """Compact technician row surfaced alongside availability so the
    admin / resident UI can render "3 plumbers available today" without
    a second round-trip."""

    id: str
    name: str
    category: str
    isActive: bool


class AvailableSlot(BaseModel):
    """Per-slot capacity row for the new `/maintenance/available-slots`
    endpoint. `capacity` = active technicians in the category;
    `confirmed` = already-confirmed bookings on this slot;
    `available` = the remaining headroom (clipped at 0)."""

    slot: str  # canonical "HH:MM" start time
    capacity: int
    confirmed: int
    available: int


class AvailableSlotsResponse(BaseModel):
    """List of slot rows with capacity > 0 plus the technician roster
    that drove the math. Hot-path read — the resident's TimeSlotPicker
    polls this every time (date, category) changes."""

    category: str
    dateIso: str
    technicianCount: int
    slots: list[AvailableSlot]
    technicians: list[TechnicianBrief]
