"""Service Requests data layer.

The hub used to be in-memory; it's now SQL-backed. Two responsibilities
live here:

1. **Persistence**. Reads/writes against `maintenance_requests`,
   joining to `users` and `units` to project rows into the wire-format
   `ServiceRequest` schema that callers (mobile + admin) already know.
2. **Live fan-out**. `subscribe()` + `_broadcast()` are still
   in-process asyncio.Queues. Persistence is durable; broadcasts only
   reach this process's connected WebSocket clients. Multi-worker scale
   needs Redis pub/sub — REDIS_URL is wired but unused for now.

Technicians are still seed data (no model yet). Same with the bootstrap
seed for demo tickets — see `seed_demo_data()`.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import date
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import _sanitize_name_part
from app.core.logging import logger
from app.models.ops import MaintenanceRequest
from app.models.unit import Unit, UnitMember
from app.models.user import User, UserRole
from app.schemas.requests import RequestCreateInput, ServiceRequest, Technician
from app.services import maintenance_slots, notifications_hub

# ─── Seed data: technicians (still in-memory, no Technician model yet) ─────


_SEED_TECHS: list[Technician] = [
    Technician(id="t-1", name="Mahmoud Sayed", specialty="ac", load=3),
    Technician(id="t-2", name="Sherif Helmy", specialty="plumbing", load=1),
    Technician(id="t-3", name="Hassan Adel", specialty="electrical", load=2),
    Technician(id="t-4", name="Omar Fathy", specialty="cleaning", load=0),
    Technician(id="t-5", name="Karim Nabil", specialty="pest", load=1),
    Technician(id="t-6", name="Ahmed Magdy", specialty="other", load=4),
]


def list_technicians() -> list[Technician]:
    return list(_SEED_TECHS)


def _get_tech(technician_id: str) -> Technician | None:
    return next((t for t in _SEED_TECHS if t.id == technician_id), None)


# ─── Errors ───────────────────────────────────────────────────────────────


class RequestNotFoundError(Exception):
    pass


class TechnicianNotFoundError(Exception):
    pass


class IllegalStateError(Exception):
    pass


class SlotFullError(Exception):
    """Raised when create_request is called with a scheduled slot that
    has already hit its concurrency cap. Maps to HTTP 409 Conflict so
    the resident frontend can re-fetch availability and prompt the
    user to pick a different slot."""

    def __init__(self, category: str, date_iso: str, time_slot: str) -> None:
        self.category = category
        self.date_iso = date_iso
        self.time_slot = time_slot
        super().__init__(
            f"Slot {time_slot!r} on {date_iso!r} for category {category!r} "
            f"is at capacity ({maintenance_slots.CAPACITY_PER_SLOT} active "
            f"tickets); pick a different slot.",
        )


# ─── Row projection ───────────────────────────────────────────────────────


def _project(req: MaintenanceRequest, user: User, unit: Unit | None) -> ServiceRequest:
    """Build the wire-format ServiceRequest from a row triple.

    Sanitize null-sentinel name fragments at projection time so poisoned
    rows ("null"/"undefined" as literal strings, persisted before the
    auth-layer guard landed) render with the email fallback instead of
    showing as "null null" in admin.
    """
    clean_first = _sanitize_name_part(user.first_name)
    clean_last = _sanitize_name_part(user.last_name)
    full_name = " ".join(p for p in (clean_first, clean_last) if p) or user.email
    return ServiceRequest(
        id=str(req.id),
        residentName=full_name,
        unit=unit.name if unit is not None else "—",
        category=req.category,  # type: ignore[arg-type]
        urgency=req.urgency,  # type: ignore[arg-type]
        title=req.title,
        summary=req.summary,
        status=req.status,  # type: ignore[arg-type]
        assigneeId=req.assignee_id,
        openedAt=req.created_at.isoformat(),
        updatedAt=req.updated_at.isoformat(),
        scheduledDateIso=req.scheduled_date_iso,
        scheduledTimeSlot=req.scheduled_time_slot,
    )


async def _fetch_by_id(session: AsyncSession, request_id: uuid.UUID) -> ServiceRequest:
    stmt = (
        select(MaintenanceRequest, User, Unit)
        .join(User, User.id == MaintenanceRequest.user_id)
        .join(Unit, Unit.id == MaintenanceRequest.unit_id, isouter=True)
        .where(MaintenanceRequest.id == request_id)
    )
    result = await session.execute(stmt)
    row = result.one_or_none()
    if row is None:
        raise RequestNotFoundError(str(request_id))
    req, user, unit = row
    return _project(req, user, unit)


# ─── Reads ────────────────────────────────────────────────────────────────


async def list_requests(
    session: AsyncSession,
    *,
    user_id: uuid.UUID | None = None,
) -> list[ServiceRequest]:
    """Snapshot of tickets — newest-first. Pass `user_id` to filter to one
    resident (the /me/requests case); leave it None for the admin view."""
    stmt = (
        select(MaintenanceRequest, User, Unit)
        .join(User, User.id == MaintenanceRequest.user_id)
        .join(Unit, Unit.id == MaintenanceRequest.unit_id, isouter=True)
        .order_by(desc(MaintenanceRequest.created_at))
    )
    if user_id is not None:
        stmt = stmt.where(MaintenanceRequest.user_id == user_id)
    result = await session.execute(stmt)
    return [_project(req, user, unit) for (req, user, unit) in result.all()]


# ─── Mutations ────────────────────────────────────────────────────────────


def _parse_request_id(raw: str) -> uuid.UUID:
    try:
        return uuid.UUID(raw)
    except ValueError as exc:
        raise RequestNotFoundError(raw) from exc


async def create_request(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    unit_id: uuid.UUID | None,
    payload: RequestCreateInput,
) -> ServiceRequest:
    """INSERT a pending ticket, project it, broadcast, notify.

    When the payload carries both `scheduledDateIso` and
    `scheduledTimeSlot`, the slot is capacity-checked first. If the
    cap is already hit, raises `SlotFullError` BEFORE the INSERT so we
    don't leave a half-persisted ticket. If only one of the two is
    provided, both are dropped (a half-scheduled ticket is meaningless
    for the availability counter).
    """
    schedule_date: str | None = None
    schedule_slot: str | None = None
    # New typed columns mirroring the spec's capacity engine. Populated
    # alongside the legacy strings when scheduling is provided so both
    # vocabularies stay in sync without the caller having to send two
    # payloads.
    new_booking_date: date | None = None
    new_time_slot: str | None = None
    if payload.scheduledDateIso and payload.scheduledTimeSlot:
        # Validate the slot is one of the canonical 8 — guards against
        # frontend drift / hand-crafted payloads.
        if not maintenance_slots.is_valid_slot(payload.scheduledTimeSlot):
            raise SlotFullError(
                category=payload.category,
                date_iso=payload.scheduledDateIso,
                time_slot=payload.scheduledTimeSlot,
            )
        # Legacy capacity check (counts pending+in_progress against a
        # fixed cap of CAPACITY_PER_SLOT=3). Still fires for back-compat
        # with the existing demo dataset before technicians were seeded.
        within = await maintenance_slots.is_slot_within_capacity(
            session,
            category=payload.category,
            date_iso=payload.scheduledDateIso,
            time_slot=payload.scheduledTimeSlot,
        )
        if not within:
            raise SlotFullError(
                category=payload.category,
                date_iso=payload.scheduledDateIso,
                time_slot=payload.scheduledTimeSlot,
            )

        # Convert legacy formats to the new typed columns.
        new_booking_date = date.fromisoformat(payload.scheduledDateIso)
        new_time_slot = maintenance_slots.slot_range_to_start(payload.scheduledTimeSlot)

        # Spec-mandated capacity guard: when the technicians table has
        # rows for this category, the technician count is the real
        # ceiling. Counts only `confirmed` bookings (see
        # `_CONFIRMED_STATUSES` in maintenance_slots). When no
        # technicians are configured for the category we leave gating
        # to the legacy check above — refusing the submission would be
        # surprising for a category with no specialists yet seeded.
        tech_count = await maintenance_slots.count_active_technicians(
            session, category=payload.category
        )
        if tech_count > 0:
            dynamic_ok = await maintenance_slots.is_slot_available_dynamic(
                session,
                category=payload.category,
                booking_date=new_booking_date,
                time_slot=new_time_slot,
            )
            if not dynamic_ok:
                raise SlotFullError(
                    category=payload.category,
                    date_iso=payload.scheduledDateIso,
                    time_slot=payload.scheduledTimeSlot,
                )

        schedule_date = payload.scheduledDateIso
        schedule_slot = payload.scheduledTimeSlot

    new = MaintenanceRequest(
        user_id=user_id,
        unit_id=unit_id,
        category=payload.category,
        urgency=payload.urgency,
        title=payload.title.strip(),
        summary=payload.description.strip(),
        status="pending",
        assignee_id=None,
        scheduled_date_iso=schedule_date,
        scheduled_time_slot=schedule_slot,
        booking_date=new_booking_date,
        time_slot=new_time_slot,
    )
    session.add(new)
    await session.flush()  # populate new.id without committing yet
    await session.commit()
    await session.refresh(new)
    ticket = await _fetch_by_id(session, new.id)

    await _broadcast({"type": "request.updated", "item": ticket.model_dump()})
    await notifications_hub.emit_ticket_created(
        session,
        user_id=user_id,
        resident_name=ticket.residentName,
        ticket_id=ticket.id,
        category=ticket.category,
        ticket_title=ticket.title or ticket.category,
    )
    logger.info(
        "request.created",
        id=ticket.id,
        resident=ticket.residentName,
        category=ticket.category,
    )
    return ticket


async def dispatch(
    session: AsyncSession,
    request_id: str,
    technician_id: str,
) -> ServiceRequest:
    """Assign a technician and transition status to in_progress."""
    if _get_tech(technician_id) is None:
        raise TechnicianNotFoundError(technician_id)

    pk = _parse_request_id(request_id)
    row = await session.get(MaintenanceRequest, pk)
    if row is None:
        raise RequestNotFoundError(request_id)
    if row.status == "resolved":
        raise IllegalStateError("Resolved tickets cannot be dispatched.")

    row.assignee_id = technician_id
    row.status = "in_progress"
    await session.commit()
    await session.refresh(row)
    ticket = await _fetch_by_id(session, row.id)

    await _broadcast({"type": "request.updated", "item": ticket.model_dump()})
    tech = _get_tech(technician_id)
    if tech is not None:
        await notifications_hub.emit_ticket_dispatched(
            session,
            user_id=row.user_id,
            resident_name=ticket.residentName,
            ticket_id=ticket.id,
            category=ticket.category,
            technician_name=tech.name,
        )
    logger.info(
        "request.dispatched",
        id=request_id,
        technician=technician_id,
        status="in_progress",
    )
    return ticket


async def resolve(session: AsyncSession, request_id: str) -> ServiceRequest:
    """Mark a ticket resolved. Idempotent."""
    pk = _parse_request_id(request_id)
    row = await session.get(MaintenanceRequest, pk)
    if row is None:
        raise RequestNotFoundError(request_id)
    if row.status == "resolved":
        return await _fetch_by_id(session, row.id)

    row.status = "resolved"
    await session.commit()
    await session.refresh(row)
    ticket = await _fetch_by_id(session, row.id)

    await _broadcast({"type": "request.updated", "item": ticket.model_dump()})
    await notifications_hub.emit_ticket_resolved(
        session,
        user_id=row.user_id,
        resident_name=ticket.residentName,
        ticket_id=ticket.id,
        category=ticket.category,
    )
    logger.info("request.resolved", id=request_id)
    return ticket


# ─── Helpers for routes ───────────────────────────────────────────────────


async def primary_unit_id_for(session: AsyncSession, user_id: uuid.UUID) -> uuid.UUID | None:
    """The user's primary unit, if any. Used when residents create their own
    tickets without specifying a unit explicitly."""
    stmt = (
        select(UnitMember.unit_id)
        .where(UnitMember.user_id == user_id)
        .order_by(desc(UnitMember.is_primary))
        .limit(1)
    )
    result: uuid.UUID | None = await session.scalar(stmt)
    return result


# ─── Broadcast hub (still in-process) ─────────────────────────────────────

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


# ─── Seed ──────────────────────────────────────────────────────────────────

_SEED_USERS: list[dict[str, str]] = [
    {
        "clerk_id": "seed_lina_mostafa",
        "email": "lina@example.com",
        "first_name": "Lina",
        "last_name": "Mostafa",
    },
    {
        "clerk_id": "seed_tarek_ibrahim",
        "email": "tarek@example.com",
        "first_name": "Tarek",
        "last_name": "Ibrahim",
    },
    {
        "clerk_id": "seed_rana_halim",
        "email": "rana@example.com",
        "first_name": "Rana",
        "last_name": "Halim",
    },
    {
        "clerk_id": "seed_yousef_ar",
        "email": "yousef@example.com",
        "first_name": "Yousef",
        "last_name": "Abdel-Rahman",
    },
    {
        "clerk_id": "seed_mariam_saad",
        "email": "mariam@example.com",
        "first_name": "Mariam",
        "last_name": "Saad",
    },
    {
        "clerk_id": "seed_aya_lotfy",
        "email": "aya@example.com",
        "first_name": "Aya",
        "last_name": "Lotfy",
    },
]

_SEED_UNITS: list[dict[str, str]] = [
    {"name": "Sarai · B7-302", "project": "Sarai"},
    {"name": "Phase 1 · A2-104", "project": "Phase 1"},
    {"name": "Taj Sultan · T4-15", "project": "Taj Sultan"},
    {"name": "Sahel · V-12", "project": "Sahel"},
    {"name": "Phase 1 · C5-208", "project": "Phase 1"},
    {"name": "Sarai · B3-101", "project": "Sarai"},
]

# (clerk_id, unit name, category, urgency, summary, status)
_SEED_REQUESTS: list[tuple[str, str, str, str, str, str]] = [
    (
        "seed_lina_mostafa",
        "Sarai · B7-302",
        "ac",
        "urgent",
        "AC dripping water from indoor unit. Living room ceiling stained.",
        "pending",
    ),
    (
        "seed_tarek_ibrahim",
        "Phase 1 · A2-104",
        "plumbing",
        "priority",
        "Kitchen sink slow drain — getting worse.",
        "in_progress",
    ),
    (
        "seed_rana_halim",
        "Taj Sultan · T4-15",
        "electrical",
        "routine",
        "Bathroom light flickers when fan turns on.",
        "in_progress",
    ),
    (
        "seed_yousef_ar",
        "Sahel · V-12",
        "pest",
        "priority",
        "Ants in pantry. Spray needed.",
        "pending",
    ),
    (
        "seed_mariam_saad",
        "Phase 1 · C5-208",
        "cleaning",
        "routine",
        "Hallway carpet stain — request deep clean.",
        "resolved",
    ),
    (
        "seed_aya_lotfy",
        "Sarai · B3-101",
        "ac",
        "priority",
        "AC compressor making rattling noise.",
        "pending",
    ),
]


async def seed_demo_data(session: AsyncSession) -> None:
    """Idempotent: only seeds if `maintenance_requests` is empty.

    Synthetic clerk_ids (`seed_<name>`) keep these rows clear of any real
    Clerk-provisioned users — when a real user signs in, they get an
    empty list, which is the architecturally honest behaviour.
    """
    existing = await session.scalar(select(MaintenanceRequest.id).limit(1))
    if existing is not None:
        return

    logger.info("requests.seed.start")
    user_id_by_clerk: dict[str, uuid.UUID] = {}
    for u in _SEED_USERS:
        stmt = (
            pg_insert(User)
            .values(
                clerk_id=u["clerk_id"],
                email=u["email"],
                first_name=u["first_name"],
                last_name=u["last_name"],
                role=UserRole.resident,
            )
            .on_conflict_do_update(
                index_elements=["clerk_id"],
                set_={"email": u["email"]},  # touch to make it RETURNING-safe
            )
            .returning(User.id)
        )
        user_id_by_clerk[u["clerk_id"]] = await session.scalar(stmt)  # type: ignore[assignment]

    unit_id_by_name: dict[str, uuid.UUID] = {}
    for u in _SEED_UNITS:
        existing_id = await session.scalar(select(Unit.id).where(Unit.name == u["name"]))
        if existing_id is not None:
            unit_id_by_name[u["name"]] = existing_id
            continue
        row = Unit(name=u["name"], project=u.get("project"))
        session.add(row)
        await session.flush()
        unit_id_by_name[u["name"]] = row.id

    for clerk_id, unit_name, category, urgency, summary, st in _SEED_REQUESTS:
        session.add(
            MaintenanceRequest(
                user_id=user_id_by_clerk[clerk_id],
                unit_id=unit_id_by_name[unit_name],
                category=category,
                urgency=urgency,
                title=None,
                summary=summary,
                status=st,
            )
        )

    await session.commit()
    logger.info(
        "requests.seed.done",
        users=len(_SEED_USERS),
        units=len(_SEED_UNITS),
        requests=len(_SEED_REQUESTS),
    )


# Re-export for code paths that imported it under the old name.
__all__ = [
    "IllegalStateError",
    "RequestNotFoundError",
    "SlotFullError",
    "TechnicianNotFoundError",
    "create_request",
    "dispatch",
    "list_requests",
    "list_technicians",
    "primary_unit_id_for",
    "resolve",
    "seed_demo_data",
    "subscribe",
]
