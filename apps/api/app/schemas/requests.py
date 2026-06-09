"""Pydantic schemas for the Service Requests dispatching pipeline.

Three-state lifecycle:
    pending     →  ticket open, waiting for a technician
    in_progress →  technician dispatched, actively working
    resolved    →  marked fixed by ops

Categories mirror `@stitch/constants.REQUEST_CATEGORIES`, so the frontend
i18n keys (`requests.categories.*`) keep working unchanged.
"""
# ruff: noqa: N815  -- camelCase mirrors the wire-format used by the admin client.

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

RequestStatus = Literal["pending", "in_progress", "resolved"]
RequestCategory = Literal["ac", "plumbing", "electrical", "cleaning", "pest", "other"]
RequestUrgency = Literal["routine", "priority", "urgent"]


class Technician(BaseModel):
    id: str
    name: str
    specialty: RequestCategory
    load: int = Field(ge=0, description="Number of active assignments.")


class ServiceRequest(BaseModel):
    id: str
    residentName: str
    unit: str
    category: RequestCategory
    urgency: RequestUrgency
    title: str | None = None
    summary: str
    status: RequestStatus
    assigneeId: str | None = None
    openedAt: str  # ISO 8601 with TZ
    updatedAt: str  # ISO 8601 with TZ
    # Scheduled appointment fields — populated when the ticket was
    # created through the 24/7 slot picker on the resident frontend.
    # Null on emergency / walk-up / legacy tickets.
    scheduledDateIso: str | None = None
    scheduledTimeSlot: str | None = None  # canonical "HH:MM-HH:MM" label


class ServiceRequestsList(BaseModel):
    items: list[ServiceRequest]
    technicians: list[Technician]


class DispatchInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    technicianId: str = Field(min_length=1)


class RequestCreateInput(BaseModel):
    """Resident → API: a new maintenance ticket."""

    model_config = ConfigDict(extra="forbid")
    category: RequestCategory
    title: str = Field(min_length=1, max_length=80)
    description: str = Field(min_length=1, max_length=2000)
    urgency: RequestUrgency = "routine"
    # Optional appointment fields. When both are provided AND the slot
    # has capacity remaining, the ticket persists with the schedule
    # attached. When omitted (e.g. legacy / walk-up flows), the ticket
    # is created without a schedule.
    scheduledDateIso: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    scheduledTimeSlot: str | None = Field(
        default=None,
        pattern=r"^\d{2}:\d{2}-\d{2}:\d{2}$",
        max_length=11,
    )


# ─── WebSocket envelopes ────────────────────────────────────────────────────


class RequestsSnapshot(BaseModel):
    type: Literal["snapshot"] = "snapshot"
    items: list[ServiceRequest]
    technicians: list[Technician]


class RequestsUpdate(BaseModel):
    type: Literal["request.updated"] = "request.updated"
    item: ServiceRequest
