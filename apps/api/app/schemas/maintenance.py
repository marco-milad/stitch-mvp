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
