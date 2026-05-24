"""Gate scan simulator + WS broadcast hub.

The simulator runs in a background asyncio task started during the app
lifespan. Every 3-7s it emits one realistic gate scan event, retains it in
a bounded ring buffer (so reconnecting clients can hydrate without an HTTP
round-trip), and fans it out to every subscriber.

This is the Week-7 demo seam — when the real gate hardware bridge ships,
swap `_emit_one()` for a coroutine that reads from the bridge socket.
"""

from __future__ import annotations

import asyncio
import contextlib
import random
import uuid
from collections import deque
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

from app.core.logging import logger
from app.schemas.gate import GateScanEvent

# ─── Realistic mock cast ────────────────────────────────────────────────────

_GATES: tuple[str, ...] = ("main", "gate1", "gate2", "gate3")
_ZONES: tuple[str, ...] = ("phase1", "sarai", "tajSultan", "sahel")

_GUESTS: tuple[str, ...] = (
    "Mahmoud Sayed",
    "Aya Lotfy",
    "Sherif Hegazi",
    "Dina Mansour",
    "Hossam Anwar",
    "Salma Adel",
    "Yousef Abdel-Rahman",
    "Mariam Saad",
    "Karim El-Sayed",
)

_RESIDENTS: tuple[str, ...] = (
    "Lina Mostafa",
    "Tarek Ibrahim",
    "Rana Halim",
    "Omar Hassan",
    "Sara Hassan",
    "Ahmed Tarek",
)

_CONTRACTORS: tuple[str, ...] = (
    "Hassan Plumbing Co.",
    "Cool Air HVAC",
    "Nour Cleaning Services",
    "El-Nasr Electric",
    "Green Lawn Landscaping",
)

_DELIVERIES: tuple[str, ...] = (
    "Crave Delivery",
    "Talabat Rider",
    "Aramex Courier",
    "Amazon Egypt",
    "Breadfast",
    "Mintaqti Pharmacy",
)

_UNITS_BY_ZONE: dict[str, tuple[str, ...]] = {
    "phase1": ("A1-205", "A2-104", "C5-208", "B3-101"),
    "sarai": ("B7-302", "B2-110", "B3-101"),
    "tajSultan": ("T1-08", "T4-15", "T2-21"),
    "sahel": ("V-04", "V-12", "V-21"),
}

# Weighted distribution so the stream feels lived-in:
#   60% approved guests/contractors/deliveries entering
#   25% residents (entry or exit)
#   10% expired QRs
#    5% denied (security flag)
_OUTCOME_WEIGHTS = (
    ("approved", 70),
    ("expired", 18),
    ("denied", 12),
)


def _weighted(choices: tuple[tuple[str, int], ...]) -> str:
    total = sum(w for _, w in choices)
    n = random.randint(1, total)
    upto = 0
    for value, weight in choices:
        upto += weight
        if n <= upto:
            return value
    return choices[-1][0]


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _gen_code() -> str:
    return f"STCH-{uuid.uuid4().hex[:4].upper()}"


def _make_event() -> GateScanEvent:
    """Pick one realistic scan event. Pure randomness + weighted outcomes."""
    visitor_kind = random.choices(
        ("guest", "contractor", "delivery", "resident"),
        weights=(0.40, 0.18, 0.22, 0.20),
        k=1,
    )[0]
    zone = random.choice(_ZONES)
    unit = random.choice(_UNITS_BY_ZONE[zone])

    if visitor_kind == "resident":
        visitor_name = random.choice(_RESIDENTS)
        host_name = None
        direction = random.choice(("in", "out"))
        status = "approved"  # resident tags don't expire in the demo
        note = None
    else:
        if visitor_kind == "guest":
            visitor_name = random.choice(_GUESTS)
        elif visitor_kind == "contractor":
            visitor_name = random.choice(_CONTRACTORS)
        else:
            visitor_name = random.choice(_DELIVERIES)
        host_name = random.choice(_RESIDENTS)
        # 90% of non-resident scans are entries; 10% exits.
        direction = "in" if random.random() < 0.90 else "out"
        status = _weighted(_OUTCOME_WEIGHTS)
        note = None
        if status == "expired":
            note = "QR code past validity window"
        elif status == "denied":
            note = "Pass not on the approved list"

    return GateScanEvent(
        id=f"scan-{uuid.uuid4().hex[:8]}",
        timestamp=_now_iso(),
        gate=random.choice(_GATES),  # type: ignore[arg-type]
        zone=zone,  # type: ignore[arg-type]
        direction=direction,  # type: ignore[arg-type]
        visitorKind=visitor_kind,  # type: ignore[arg-type]
        visitorName=visitor_name,
        hostName=host_name,
        unit=unit,
        code=_gen_code(),
        status=status,  # type: ignore[arg-type]
        note=note,
    )


# ─── In-memory ring buffer (last N events) ──────────────────────────────────

_RECENT_LIMIT = 60
_recent: deque[GateScanEvent] = deque(maxlen=_RECENT_LIMIT)
_recent_lock = asyncio.Lock()


async def list_recent() -> list[GateScanEvent]:
    async with _recent_lock:
        return list(_recent)


async def _record(event: GateScanEvent) -> None:
    async with _recent_lock:
        _recent.append(event)


# ─── Broadcast hub ──────────────────────────────────────────────────────────

_subscribers: set[asyncio.Queue[dict[str, Any]]] = set()
_subscribers_lock = asyncio.Lock()


@asynccontextmanager
async def subscribe() -> AsyncIterator[asyncio.Queue[dict[str, Any]]]:
    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    async with _subscribers_lock:
        _subscribers.add(queue)
    logger.info("gate.subscriber.added", total=len(_subscribers))
    try:
        yield queue
    finally:
        async with _subscribers_lock:
            _subscribers.discard(queue)
        logger.info("gate.subscriber.removed", total=len(_subscribers))


async def _broadcast(message: dict[str, Any]) -> None:
    async with _subscribers_lock:
        queues = list(_subscribers)
    for q in queues:
        with contextlib.suppress(asyncio.QueueFull):
            q.put_nowait(message)


# ─── External event injection ──────────────────────────────────────────────


async def inject_event(event: GateScanEvent) -> None:
    """Record + broadcast an event that came from somewhere other than the
    random simulator (e.g. a freshly-issued visitor pass). Lets other
    services participate in the live gate stream without poking private
    internals.
    """
    await _record(event)
    await _broadcast({"type": "scan", "event": event.model_dump()})


# ─── Background runner ──────────────────────────────────────────────────────

_runner_task: asyncio.Task[None] | None = None


async def _runner_loop() -> None:
    """Emit one event every 3-7 seconds until cancelled."""
    logger.info("gate.simulator.started")
    try:
        while True:
            await asyncio.sleep(random.uniform(3.0, 7.0))
            event = _make_event()
            await _record(event)
            await _broadcast({"type": "scan", "event": event.model_dump()})
            logger.info(
                "gate.scan.emitted",
                gate=event.gate,
                status=event.status,
                direction=event.direction,
            )
    except asyncio.CancelledError:
        logger.info("gate.simulator.stopped")
        raise


def start() -> None:
    global _runner_task
    if _runner_task is not None and not _runner_task.done():
        return
    _runner_task = asyncio.create_task(_runner_loop())


async def stop() -> None:
    global _runner_task
    if _runner_task is None:
        return
    _runner_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await _runner_task
    _runner_task = None
