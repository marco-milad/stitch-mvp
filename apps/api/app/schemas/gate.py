"""Pydantic schemas for the live Gate & Parking scan stream.

Single event model — `GateScanEvent` — emitted by the simulator (and, in
production, by the gate hardware bridge) and forwarded verbatim over the
admin WebSocket. Field names are camelCase to match the TypeScript client.
"""
# ruff: noqa: N815  -- camelCase mirrors the wire-format used by the admin client.

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Gate = Literal["main", "gate1", "gate2", "gate3"]
Zone = Literal["phase1", "sarai", "tajSultan", "sahel"]
Direction = Literal["in", "out"]
VisitorKind = Literal["guest", "contractor", "delivery", "resident"]
ScanStatus = Literal["approved", "denied", "expired"]


class GateScanEvent(BaseModel):
    """One QR / RFID scan at a compound gate."""

    id: str
    timestamp: str  # ISO 8601 with timezone
    gate: Gate
    zone: Zone
    direction: Direction
    visitorKind: VisitorKind
    visitorName: str
    hostName: str | None = None
    unit: str | None = None
    code: str = Field(description="QR / pass code presented at the gate.")
    status: ScanStatus
    note: str | None = None


class GateStreamSnapshot(BaseModel):
    """Sent once when a client connects so reconnects don't lose history."""

    type: Literal["snapshot"] = "snapshot"
    events: list[GateScanEvent]


class GateStreamScan(BaseModel):
    type: Literal["scan"] = "scan"
    event: GateScanEvent
