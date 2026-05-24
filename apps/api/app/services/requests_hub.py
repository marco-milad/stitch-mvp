"""Service Requests hub — in-memory store + dispatch/resolve logic + WS
broadcast. Same pattern as `feed_hub` and `gate_simulator`: a process-local
store keyed by request id, an asyncio fan-out to subscribers, and an
explicit migration seam (`_persist_and_broadcast`) that we replace with a
real SQLAlchemy session + Redis pub/sub once the DB layer ships.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

from app.core.logging import logger
from app.schemas.requests import RequestCreateInput, ServiceRequest, Technician
from app.services import notifications_hub

# ─── Helpers ───────────────────────────────────────────────────────────────


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _hours_ago(h: float) -> str:
    return datetime.fromtimestamp(datetime.now(UTC).timestamp() - h * 3600, tz=UTC).isoformat()


# ─── Seed data ─────────────────────────────────────────────────────────────


_SEED_TECHS: list[Technician] = [
    Technician(id="t-1", name="Mahmoud Sayed", specialty="ac", load=3),
    Technician(id="t-2", name="Sherif Helmy", specialty="plumbing", load=1),
    Technician(id="t-3", name="Hassan Adel", specialty="electrical", load=2),
    Technician(id="t-4", name="Omar Fathy", specialty="cleaning", load=0),
    Technician(id="t-5", name="Karim Nabil", specialty="pest", load=1),
    Technician(id="t-6", name="Ahmed Magdy", specialty="other", load=4),
]


def _seed_requests() -> list[ServiceRequest]:
    return [
        ServiceRequest(
            id="sr-001",
            residentName="Lina Mostafa",
            unit="Sarai · B7-302",
            category="ac",
            urgency="urgent",
            summary="AC dripping water from indoor unit. Living room ceiling stained.",
            status="pending",
            assigneeId=None,
            openedAt=_hours_ago(1),
            updatedAt=_hours_ago(1),
        ),
        ServiceRequest(
            id="sr-002",
            residentName="Tarek Ibrahim",
            unit="Phase 1 · A2-104",
            category="plumbing",
            urgency="priority",
            summary="Kitchen sink slow drain — getting worse.",
            status="in_progress",
            assigneeId="t-2",
            openedAt=_hours_ago(6),
            updatedAt=_hours_ago(0.5),
        ),
        ServiceRequest(
            id="sr-003",
            residentName="Rana Halim",
            unit="Taj Sultan · T4-15",
            category="electrical",
            urgency="routine",
            summary="Bathroom light flickers when fan turns on.",
            status="in_progress",
            assigneeId="t-3",
            openedAt=_hours_ago(20),
            updatedAt=_hours_ago(2),
        ),
        ServiceRequest(
            id="sr-004",
            residentName="Yousef Abdel-Rahman",
            unit="Sahel · V-12",
            category="pest",
            urgency="priority",
            summary="Ants in pantry. Spray needed.",
            status="pending",
            assigneeId=None,
            openedAt=_hours_ago(3),
            updatedAt=_hours_ago(3),
        ),
        ServiceRequest(
            id="sr-005",
            residentName="Mariam Saad",
            unit="Phase 1 · C5-208",
            category="cleaning",
            urgency="routine",
            summary="Hallway carpet stain — request deep clean.",
            status="resolved",
            assigneeId="t-4",
            openedAt=_hours_ago(48),
            updatedAt=_hours_ago(24),
        ),
        ServiceRequest(
            id="sr-006",
            residentName="Aya Lotfy",
            unit="Sarai · B3-101",
            category="ac",
            urgency="priority",
            summary="AC compressor making rattling noise.",
            status="pending",
            assigneeId=None,
            openedAt=_hours_ago(0.5),
            updatedAt=_hours_ago(0.5),
        ),
    ]


# ─── In-memory store ───────────────────────────────────────────────────────

_store: dict[str, ServiceRequest] = {r.id: r for r in _seed_requests()}
_store_lock = asyncio.Lock()


async def list_requests() -> list[ServiceRequest]:
    """Snapshot of all tickets — sorted newest-first by openedAt."""
    async with _store_lock:
        items = list(_store.values())
    items.sort(key=lambda r: r.openedAt, reverse=True)
    return items


def list_technicians() -> list[Technician]:
    return list(_SEED_TECHS)


def _get_tech(technician_id: str) -> Technician | None:
    return next((t for t in _SEED_TECHS if t.id == technician_id), None)


# ─── Mutations ─────────────────────────────────────────────────────────────


class RequestNotFoundError(Exception):
    pass


class TechnicianNotFoundError(Exception):
    pass


class IllegalStateError(Exception):
    pass


async def create_request(
    resident_name: str, unit: str, payload: RequestCreateInput
) -> ServiceRequest:
    """Create a new ticket for the given resident in `pending` status, then
    broadcast it as a `request.updated` event so subscribed clients pick it
    up. Re-using the `updated` envelope means both admin and resident
    streams already handle the prepend case (they fall through to prepend
    when the id is unknown)."""
    now = _now_iso()
    ticket = ServiceRequest(
        id=f"sr-{uuid.uuid4().hex[:8]}",
        residentName=resident_name,
        unit=unit,
        category=payload.category,
        urgency=payload.urgency,
        title=payload.title.strip(),
        summary=payload.description.strip(),
        status="pending",
        assigneeId=None,
        openedAt=now,
        updatedAt=now,
    )
    async with _store_lock:
        _store[ticket.id] = ticket

    await _broadcast({"type": "request.updated", "item": ticket.model_dump()})
    await notifications_hub.emit_ticket_created(
        resident_name=resident_name,
        ticket_id=ticket.id,
        category=ticket.category,
        ticket_title=ticket.title or ticket.category,
    )
    logger.info(
        "request.created",
        id=ticket.id,
        resident=resident_name,
        category=ticket.category,
    )
    return ticket


async def dispatch(request_id: str, technician_id: str) -> ServiceRequest:
    """Assign a technician and transition status to in_progress.

    Idempotent re-dispatch (same tech) is allowed and bumps `updatedAt`.
    Re-dispatch to a *different* tech is also allowed — the new assignee
    replaces the previous one. Resolved tickets can't be re-dispatched.
    """
    if _get_tech(technician_id) is None:
        raise TechnicianNotFoundError(technician_id)

    async with _store_lock:
        existing = _store.get(request_id)
        if existing is None:
            raise RequestNotFoundError(request_id)
        if existing.status == "resolved":
            raise IllegalStateError("Resolved tickets cannot be dispatched.")
        updated = existing.model_copy(
            update={
                "assigneeId": technician_id,
                "status": "in_progress",
                "updatedAt": _now_iso(),
            }
        )
        _store[request_id] = updated

    await _broadcast({"type": "request.updated", "item": updated.model_dump()})
    tech = _get_tech(technician_id)
    if tech is not None:
        await notifications_hub.emit_ticket_dispatched(
            resident_name=updated.residentName,
            ticket_id=updated.id,
            category=updated.category,
            technician_name=tech.name,
        )
    logger.info(
        "request.dispatched",
        id=request_id,
        technician=technician_id,
        status="in_progress",
    )
    return updated


async def resolve(request_id: str) -> ServiceRequest:
    """Mark a ticket resolved. Idempotent."""
    async with _store_lock:
        existing = _store.get(request_id)
        if existing is None:
            raise RequestNotFoundError(request_id)
        if existing.status == "resolved":
            return existing
        updated = existing.model_copy(update={"status": "resolved", "updatedAt": _now_iso()})
        _store[request_id] = updated

    await _broadcast({"type": "request.updated", "item": updated.model_dump()})
    await notifications_hub.emit_ticket_resolved(
        resident_name=updated.residentName,
        ticket_id=updated.id,
        category=updated.category,
    )
    logger.info("request.resolved", id=request_id)
    return updated


# ─── Broadcast hub ─────────────────────────────────────────────────────────

_subscribers: set[asyncio.Queue[dict[str, Any]]] = set()
_subscribers_lock = asyncio.Lock()


@asynccontextmanager
async def subscribe() -> AsyncIterator[asyncio.Queue[dict[str, Any]]]:
    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    async with _subscribers_lock:
        _subscribers.add(queue)
    logger.info("requests.subscriber.added", total=len(_subscribers))
    try:
        yield queue
    finally:
        async with _subscribers_lock:
            _subscribers.discard(queue)
        logger.info("requests.subscriber.removed", total=len(_subscribers))


async def _broadcast(message: dict[str, Any]) -> None:
    async with _subscribers_lock:
        queues = list(_subscribers)
    for q in queues:
        with contextlib.suppress(asyncio.QueueFull):
            q.put_nowait(message)
