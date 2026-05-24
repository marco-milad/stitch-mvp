"""Visitor passes hub — resident-issued QR passes for guests / deliveries /
ride-share. Storing the pass is the obvious part; the *interesting* part is
that issuing one immediately injects a "pass issued" event into the
gate_simulator's broadcast hub so the admin's Live Stream reflects it
within ~50 ms.

In production the gate hardware would mint the gate event when the QR is
actually scanned at the boom; this synthetic event is for the demo flow
where there's no physical gate.
"""

from __future__ import annotations

import asyncio
import secrets
import uuid
from collections import deque
from datetime import UTC, datetime

from app.core.logging import logger
from app.schemas.gate import GateScanEvent
from app.schemas.visitor_pass import VehicleKind, VisitorPass, VisitorPassCreate
from app.services import gate_simulator

# ─── Demo identity ──────────────────────────────────────────────────────────
# Hard-coded resident for the demo. Swap for Clerk-derived identity later.
DEMO_HOST_NAME = "Lina Mostafa"
DEMO_HOST_UNIT = "Sarai · B7-302"
DEMO_HOST_ZONE = "sarai"


# ─── Store ──────────────────────────────────────────────────────────────────

_PASSES_LIMIT = 30
_passes: deque[VisitorPass] = deque(maxlen=_PASSES_LIMIT)
_passes_lock = asyncio.Lock()


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _gen_code() -> str:
    return f"STCH-{secrets.token_hex(2).upper()}"


def _visitor_kind_for(vehicle: VehicleKind) -> str:
    if vehicle == "delivery":
        return "delivery"
    if vehicle == "rideshare":
        return "guest"
    return "guest"


async def list_passes() -> list[VisitorPass]:
    async with _passes_lock:
        return sorted(_passes, key=lambda p: p.createdAt, reverse=True)


async def create_pass(payload: VisitorPassCreate) -> VisitorPass:
    code = _gen_code()
    pass_record = VisitorPass(
        id=f"vp-{uuid.uuid4().hex[:8]}",
        code=code,
        qrPayload=f"stitch://gate?pass={code}",
        hostName=DEMO_HOST_NAME,
        unit=DEMO_HOST_UNIT,
        createdAt=_now_iso(),
        **payload.model_dump(),
    )
    async with _passes_lock:
        _passes.append(pass_record)

    # The synthetic gate event — what makes the admin's stream wake up.
    scan = GateScanEvent(
        id=f"scan-{uuid.uuid4().hex[:8]}",
        timestamp=pass_record.createdAt,
        gate="main",
        zone=DEMO_HOST_ZONE,  # type: ignore[arg-type]
        direction="in",
        visitorKind=_visitor_kind_for(payload.vehicleKind),  # type: ignore[arg-type]
        visitorName=payload.visitorName,
        hostName=DEMO_HOST_NAME,
        unit=DEMO_HOST_UNIT,
        code=code,
        status="approved",
        note="Pass issued — awaiting arrival",
    )
    await gate_simulator.inject_event(scan)
    logger.info("visitor_pass.created", id=pass_record.id, visitor=payload.visitorName)
    return pass_record
