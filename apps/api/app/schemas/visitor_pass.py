"""Visitor pass schemas — residents create a pre-authorised QR for their
guests / contractors / deliveries. The pass goes into the visitor_passes
hub AND fires a synthetic gate event so the admin's Live Stream lights up
the moment a pass is issued.
"""
# ruff: noqa: N815  -- camelCase mirrors the wire-format used by the web client.

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

VehicleKind = Literal["car", "delivery", "rideshare"]


class VisitorPassCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    visitorName: str = Field(min_length=1, max_length=120)
    vehicleKind: VehicleKind
    validFrom: str  # ISO 8601 with TZ
    validTo: str  # ISO 8601 with TZ
    # Free-text plate so we don't lock to a single country's format
    # (Egyptian plates carry Arabic + Latin glyphs and a hyphen; UAE
    # plates carry an emirate letter; etc.). Empty string is coerced
    # to None at the route layer so the field stays semantically
    # "absent" when the resident skips it.
    carPlate: str | None = Field(default=None, max_length=20)
    note: str | None = None


class VisitorPass(VisitorPassCreate):
    id: str
    # The access code — short, human-readable, what the gate scanner
    # decodes from the QR. Aliased as `accessCode` would be cleaner
    # but `code` is the established wire name and renaming would
    # ripple into the admin live-scan feed.
    code: str  # "STCH-XXXX" — what the QR encodes / what the gate scans
    qrPayload: str  # The opaque string a real QR reader would decode to
    hostName: str
    unit: str
    createdAt: str


class VisitorPassList(BaseModel):
    items: list[VisitorPass]
