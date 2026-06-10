"""Pydantic schemas for the Amenities Booking pipeline.

Wire-format mirrors the existing resident-facing booking schemas
(camelCase, ISO date strings, HH:MM time strings). Persistence lives
in `app.services.amenities_hub`, routed under `/api/v1/amenities`.

Lifecycle:
    pending    →  resident submitted, awaiting ops acknowledgement
    confirmed  →  ops accepted; slot is held
    cancelled  →  withdrawn

`in_progress` and `completed` aren't part of the amenities lifecycle —
amenities are gated time blocks, not active-service jobs like the
maintenance / vendor pipelines.
"""
# ruff: noqa: N815  -- camelCase mirrors the wire-format used by the resident client.

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

AmenityBookingStatus = Literal["pending", "confirmed", "cancelled"]


# ─── Amenity catalog (read-only on the resident side) ─────────────────────


class Amenity(BaseModel):
    """Outbound projection of a shared facility."""

    id: str
    name: str
    description: str | None = None
    capacity: int
    isActive: bool


class AmenitiesList(BaseModel):
    items: list[Amenity]


# ─── Resident booking flow ────────────────────────────────────────────────


def _is_valid_hhmm(value: str) -> bool:
    if len(value) != 5 or value[2] != ":":
        return False
    h, m = value.split(":", 1)
    if not (h.isdigit() and m.isdigit()):
        return False
    return 0 <= int(h) < 24 and 0 <= int(m) < 60


class AmenityBookingCreateInput(BaseModel):
    """Resident → API: POST /api/v1/amenities/book payload.

    `startTime` < `endTime` is enforced so overnight windows fail fast
    (the amenities mental model is "block out a chunk of TODAY's
    calendar"; if we later add overnight bookings the schema becomes
    `endDateIso` + `endTime`).
    """

    model_config = ConfigDict(extra="forbid")
    amenityId: str = Field(min_length=1, max_length=64)
    bookingDate: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    startTime: str = Field(min_length=5, max_length=5)
    endTime: str = Field(min_length=5, max_length=5)
    guestsCount: int = Field(ge=1, le=200)

    @field_validator("startTime", "endTime")
    @classmethod
    def _valid_clock(cls, v: str) -> str:
        if not _is_valid_hhmm(v):
            raise ValueError("must be a valid HH:MM 24-hour clock time")
        return v


class AmenityBookingResponse(BaseModel):
    """Outbound projection of a single amenity booking row."""

    id: str
    amenityId: str
    amenityName: str
    residentName: str
    bookingDate: str
    startTime: str
    endTime: str
    guestsCount: int
    status: AmenityBookingStatus
    createdAt: str
    updatedAt: str
