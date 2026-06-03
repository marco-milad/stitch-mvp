"""Pydantic schemas for resident-side Service Bookings.

Wire-format mirrors the existing `ServiceRequest` payload the frontend
already speaks (camelCase, ISO timestamps). Persistence + WS fan-out
land in `app.services.service_bookings_hub`.

Status lifecycle:
    pending     →  resident submitted, vendor not yet engaged
    confirmed   →  vendor accepted
    in_progress →  vendor on-site / actively servicing
    completed   →  finished, billable closed
    cancelled   →  withdrawn by resident or vendor

The frontend's local enum uses a hyphen (`in-progress`) for back-compat
with the legacy localStorage cache; the wire format is the canonical
underscore form. Conversion happens in the residentApi client.
"""
# ruff: noqa: N815  -- camelCase mirrors the wire-format used by the admin client.

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ServiceBookingStatus = Literal["pending", "confirmed", "in_progress", "completed", "cancelled"]


class ServiceBooking(BaseModel):
    """Outbound projection — what the resident + admin clients render."""

    id: str
    residentName: str
    unit: str
    tileId: str
    providerId: str
    offeringKey: str
    dateIso: str
    timeSlot: str
    notes: str | None = None
    status: ServiceBookingStatus
    createdAt: str  # ISO 8601 with TZ
    updatedAt: str  # ISO 8601 with TZ


class ServiceBookingsList(BaseModel):
    items: list[ServiceBooking]


class ServiceBookingCreateInput(BaseModel):
    """Resident → API: new booking from the ServiceBook / WellnessBook form."""

    model_config = ConfigDict(extra="forbid")
    tileId: str = Field(min_length=1, max_length=64)
    providerId: str = Field(min_length=1, max_length=64)
    offeringKey: str = Field(min_length=1, max_length=64)
    dateIso: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    timeSlot: str = Field(pattern=r"^\d{2}:\d{2}$")
    notes: str | None = Field(default=None, max_length=500)


# ─── WebSocket envelopes ────────────────────────────────────────────────────


class ServiceBookingsSnapshot(BaseModel):
    type: Literal["snapshot"] = "snapshot"
    items: list[ServiceBooking]


class ServiceBookingUpdate(BaseModel):
    type: Literal["booking.updated"] = "booking.updated"
    item: ServiceBooking
