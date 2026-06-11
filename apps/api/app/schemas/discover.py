"""Pydantic schemas for the Discover funnel.

Two intake flows, both public/guest-allowed:

    POST /api/v1/discover/eoi       — Expression of Interest
    POST /api/v1/discover/bookings  — Showroom / onsite / virtual visit

Wire-format mirrors the resident-side schemas (camelCase, ISO dates,
HH:MM time strings). Persistence + admin notification fan-out land in
`app.services.discover_hub`.
"""
# ruff: noqa: N815  -- camelCase mirrors the wire-format used by the web client.

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

VisitType = Literal["showroom", "onsite", "virtual"]
# Mirrors the resident frontend's `UnitType` Zod enum so a value
# coming over the wire round-trips back into the form without coercion.
InterestType = Literal["apartment", "villa", "townhouse", "studio"]
# Discover booking lifecycle (Option B). `pending` is the default state
# every freshly-submitted row lands in; the admin Leads Hub drives the
# transition into `confirmed` / `rejected`. Both are terminal — there's
# no "reopen" transition by design (a cancelled visit re-books fresh).
DiscoverBookingStatus = Literal["pending", "confirmed", "rejected"]


def _strip(value: str) -> str:
    return value.strip()


# ─── EOI ──────────────────────────────────────────────────────────────────


class EoiSubmissionCreate(BaseModel):
    """Prospect → API: POST /api/v1/discover/eoi payload."""

    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=32)
    interestType: InterestType | None = None
    budget: str | None = Field(default=None, max_length=32)
    timeline: str | None = Field(default=None, max_length=32)
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        stripped = _strip(v)
        if not stripped:
            raise ValueError("name must not be blank")
        return stripped


class EoiSubmissionResponse(BaseModel):
    """Outbound projection — confirms the row landed."""

    id: str
    name: str
    email: str
    phone: str | None = None
    interestType: InterestType | None = None
    budget: str | None = None
    timeline: str | None = None
    notes: str | None = None
    createdAt: str


# ─── Discover bookings ────────────────────────────────────────────────────


class DiscoverBookingCreate(BaseModel):
    """Prospect → API: POST /api/v1/discover/bookings payload."""

    model_config = ConfigDict(extra="forbid")
    visitType: VisitType
    bookingDate: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    timeSlot: str = Field(pattern=r"^\d{2}:\d{2}$")
    advisorName: str | None = Field(default=None, max_length=120)
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=32)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        stripped = _strip(v)
        if not stripped:
            raise ValueError("name must not be blank")
        return stripped


class DiscoverBookingResponse(BaseModel):
    """Outbound projection — confirms the booking landed.

    `status` + `adminNotes` carry the CRM state. Resident-facing
    callers never see `adminNotes` today (we don't echo it out of the
    POST endpoint to the prospect); the admin Leads Hub reads both.
    """

    id: str
    visitType: VisitType
    bookingDate: str
    timeSlot: str
    advisorName: str | None = None
    name: str
    email: str
    phone: str | None = None
    status: DiscoverBookingStatus = "pending"
    adminNotes: str | None = None
    createdAt: str


class DiscoverBookingStatusUpdate(BaseModel):
    """Admin → API: PATCH payload for the approval workflow.

    Allowed `status` is restricted to terminal-decision values so an
    admin can't bounce a row back to `pending` after a customer has
    been notified via WhatsApp.
    """

    model_config = ConfigDict(extra="forbid")
    status: Literal["confirmed", "rejected"]
    adminNotes: str | None = Field(default=None, max_length=2000)


class DiscoverBookingDecision(BaseModel):
    """Outbound shape from the PATCH route. Bundles the updated row
    with a ready-to-open WhatsApp deep-link the admin can click to
    notify the resident of the decision. `whatsappUrl` is null when
    the row has no phone on file."""

    booking: DiscoverBookingResponse
    whatsappUrl: str | None = None
