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
    visitorName: str = Field(min_length=1)
    vehicleKind: VehicleKind
    validFrom: str  # ISO 8601 with TZ
    validTo: str  # ISO 8601 with TZ
    note: str | None = None


class VisitorPass(VisitorPassCreate):
    id: str
    code: str  # "STCH-XXXX" — what the QR encodes / what the gate scans
    qrPayload: str  # The opaque string a real QR reader would decode to
    hostName: str
    unit: str
    createdAt: str


class VisitorPassList(BaseModel):
    items: list[VisitorPass]
