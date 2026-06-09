"""Resident-scoped (`/me/...`) routes — what the Stitch Web app calls.

Endpoints:
    POST   /me/visitor-passes         issue a new visitor QR
    GET    /me/visitor-passes         list the resident's recent passes
    GET    /me/parking/slots          slot directory with resident-relative status
    POST   /me/parking/bookings       reserve a slot
    DELETE /me/parking/bookings/{id}  release
    GET    /me/parking/bookings       this resident's active bookings
    GET    /me/requests               this resident's maintenance tickets
    WS     /me/requests/stream        push channel for ticket status flips

Every route enforces a verified Clerk JWT — see `app.core.auth`. The
requests routes are SQL-backed via `requests_hub`; the other hubs are
still in-memory and use the auth user's display name as identity until
they get the same treatment.
"""

from __future__ import annotations

import asyncio
import json
from contextlib import suppress
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthUser, get_current_user, get_current_user_ws
from app.core.database import AsyncSessionLocal, get_db
from app.core.logging import logger
from app.models.unit import Unit, UnitMember
from app.schemas.notifications import NotificationsList
from app.schemas.parking import (
    ParkingBooking,
    ParkingBookingCreate,
    ParkingSlotsList,
)
from app.schemas.requests import RequestCreateInput, ServiceRequest
from app.schemas.service_bookings import (
    ServiceBooking,
    ServiceBookingCreateInput,
    ServiceBookingsList,
)
from app.schemas.visitor_pass import (
    VisitorPass,
    VisitorPassCreate,
    VisitorPassList,
)
from app.services import (
    notifications_hub,
    parking_hub,
    requests_hub,
    service_bookings_hub,
    visitor_passes_hub,
)

router = APIRouter()

CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]


def _display_name(user: AuthUser) -> str:
    """For the not-yet-DB-backed hubs (parking, notifications, visitor passes)
    which still key on a string identifier. Drop when those hubs migrate."""
    return user.full_name or user.email or user.user_id


# ─── Unit selection (resident → primary unit) ─────────────────────────────


class UnitSelectInput(BaseModel):
    """Resident picks a property from the UnitSwitcher → POST this.

    The backend find-or-creates a Unit row keyed on (name, project) so
    repeated picks for the same physical unit don't proliferate rows.
    Then upserts a UnitMember linking this user to that unit and flips
    its `is_primary` flag on while turning everyone else's off — that's
    what `requests_hub.primary_unit_id_for(user)` reads when populating
    `unit` on newly-created tickets.
    """

    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    project: str | None = None
    unit_type: str | None = None
    area_sqm: int | None = None
    bedrooms: int | None = None
    role: str = "owner"  # owner / tenant / family-member — mirrors the frontend enum.


class UnitSelectResult(BaseModel):
    """Echo of what got persisted so the client can verify."""

    unit_id: str
    name: str
    project: str | None
    is_primary: bool


@router.post("/me/units/select", response_model=UnitSelectResult)
async def select_my_primary_unit(
    payload: UnitSelectInput, user: CurrentUser, session: DbSession
) -> UnitSelectResult:
    # 1. Find-or-create the Unit by (name, project). `project` is
    #    nullable on Unit, so use `is None` semantics rather than `==`.
    stmt = select(Unit).where(Unit.name == payload.name)
    if payload.project is None:
        stmt = stmt.where(Unit.project.is_(None))
    else:
        stmt = stmt.where(Unit.project == payload.project)
    unit = await session.scalar(stmt)
    if unit is None:
        unit = Unit(
            name=payload.name,
            project=payload.project,
            type=payload.unit_type,
            area_sqm=payload.area_sqm,
            beds=payload.bedrooms,
        )
        session.add(unit)
        await session.flush()  # populate unit.id without committing

    # 2. Demote any other primary memberships for this user — at most
    #    one row at a time can be is_primary=True. `primary_unit_id_for`
    #    only reads the top row by `desc(is_primary)`, but keeping the
    #    invariant clean makes admin queries straightforward.
    await session.execute(
        update(UnitMember)
        .where(UnitMember.user_id == user.db_user_id)
        .where(UnitMember.unit_id != unit.id)
        .values(is_primary=False)
    )

    # 3. Upsert THIS user/unit pair. The unique constraint
    #    uq_unit_members_user_unit guarantees at most one row per pair,
    #    so we look up first and either flip the flag or insert.
    membership = await session.scalar(
        select(UnitMember)
        .where(UnitMember.user_id == user.db_user_id)
        .where(UnitMember.unit_id == unit.id)
    )
    if membership is None:
        membership = UnitMember(
            user_id=user.db_user_id,
            unit_id=unit.id,
            role=payload.role,
            is_primary=True,
        )
        session.add(membership)
    else:
        membership.role = payload.role
        membership.is_primary = True

    await session.commit()
    logger.info(
        "me.unit.selected",
        user_id=str(user.db_user_id),
        unit_id=str(unit.id),
        unit_name=unit.name,
        role=payload.role,
    )
    return UnitSelectResult(
        unit_id=str(unit.id),
        name=unit.name,
        project=unit.project,
        is_primary=True,
    )


# ─── Visitor passes ────────────────────────────────────────────────────────


@router.post(
    "/me/visitor-passes",
    response_model=VisitorPass,
    status_code=status.HTTP_201_CREATED,
)
async def create_visitor_pass(payload: VisitorPassCreate, user: CurrentUser) -> VisitorPass:
    _ = user
    return await visitor_passes_hub.create_pass(payload)


@router.get("/me/visitor-passes", response_model=VisitorPassList)
async def list_visitor_passes(user: CurrentUser) -> VisitorPassList:
    _ = user
    items = await visitor_passes_hub.list_passes()
    return VisitorPassList(items=items)


# ─── Parking ───────────────────────────────────────────────────────────────


@router.get("/me/parking/slots", response_model=ParkingSlotsList)
async def list_parking_slots(user: CurrentUser) -> ParkingSlotsList:
    items = await parking_hub.list_slots(_display_name(user))
    return ParkingSlotsList(items=items)


@router.post(
    "/me/parking/bookings",
    response_model=ParkingBooking,
    status_code=status.HTTP_201_CREATED,
)
async def book_parking_slot(payload: ParkingBookingCreate, user: CurrentUser) -> ParkingBooking:
    try:
        return await parking_hub.create_booking(_display_name(user), payload)
    except parking_hub.SlotNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Slot not found") from exc
    except parking_hub.SlotUnavailableError as exc:
        raise HTTPException(status_code=409, detail="Slot already reserved") from exc


@router.delete("/me/parking/bookings/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def release_parking_booking(booking_id: str, user: CurrentUser) -> None:
    try:
        await parking_hub.release_booking(_display_name(user), booking_id)
    except parking_hub.BookingNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Booking not found") from exc


@router.get("/me/parking/bookings", response_model=list[ParkingBooking])
async def list_my_bookings(user: CurrentUser) -> list[ParkingBooking]:
    return await parking_hub.my_bookings(_display_name(user))


# ─── Requests (read-only for the resident view) ────────────────────────────


@router.get("/me/requests", response_model=list[ServiceRequest])
async def list_my_requests(user: CurrentUser, session: DbSession) -> list[ServiceRequest]:
    return await requests_hub.list_requests(session, user_id=user.db_user_id)


@router.post(
    "/me/requests",
    response_model=ServiceRequest,
    status_code=status.HTTP_201_CREATED,
)
async def create_my_request(
    payload: RequestCreateInput, user: CurrentUser, session: DbSession
) -> ServiceRequest:
    unit_id = await requests_hub.primary_unit_id_for(session, user.db_user_id)
    try:
        return await requests_hub.create_request(
            session,
            user_id=user.db_user_id,
            unit_id=unit_id,
            payload=payload,
        )
    except requests_hub.SlotFullError as exc:
        # 409 so the frontend can re-fetch availability and prompt the
        # user to pick a different slot, distinct from a 422 schema
        # mismatch or a 500 server error.
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.websocket("/me/requests/stream")
async def my_requests_stream(websocket: WebSocket) -> None:
    """Same envelope as `/admin/requests/stream`, but the snapshot is pre-
    filtered to this resident. Subsequent `request.updated` events arrive
    for ALL requests; the sender filters by residentName against the
    resident's display name (snapshot stays user_id-filtered)."""
    await websocket.accept()
    user = await get_current_user_ws(websocket)
    if user is None:
        return
    me_name = _display_name(user)
    logger.info("me.requests.ws.connected", peer=str(websocket.client))

    async with AsyncSessionLocal() as session:
        items = await requests_hub.list_requests(session, user_id=user.db_user_id)
    my_items = [r.model_dump() for r in items]
    await websocket.send_text(json.dumps({"type": "snapshot", "items": my_items}))

    async with requests_hub.subscribe() as queue:
        sender = asyncio.create_task(_sender(websocket, queue, me_name))
        receiver = asyncio.create_task(_receiver(websocket))
        _, pending = await asyncio.wait({sender, receiver}, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    logger.info("me.requests.ws.disconnected", peer=str(websocket.client))


def _is_for_me(msg: dict[str, Any], me_name: str) -> bool:
    """Filter so the resident only receives events for their own tickets.

    Broadcast envelopes carry the projected `residentName` (display
    string), so we filter on that. Switching the broadcast payload to
    carry `user_id` would let us key on the UUID instead — TODO."""
    item = msg.get("item")
    if not isinstance(item, dict):
        return True  # let snapshots / other envelopes through
    return item.get("residentName") == me_name


async def _sender(websocket: WebSocket, queue: asyncio.Queue[dict[str, Any]], me_name: str) -> None:
    try:
        while True:
            msg = await queue.get()
            if not _is_for_me(msg, me_name):
                continue
            await websocket.send_text(json.dumps(msg))
    except WebSocketDisconnect:
        return
    except Exception as exc:  # noqa: BLE001
        logger.warning("me.requests.ws.send_error", error=str(exc))


async def _receiver(websocket: WebSocket) -> None:
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        return


# ─── Service bookings (Cleaning, Laundry, Wellness, etc.) ──────────────────
#
# Distinct from the maintenance-ticket pipeline above. Home Services
# (tile `daily-home`) deliberately routes through `/me/requests` instead
# so it shares the admin dispatch board with technician assignment —
# this endpoint serves the other six daily-* tiles plus wellness.


@router.get("/me/service-bookings", response_model=ServiceBookingsList)
async def list_my_service_bookings(user: CurrentUser, session: DbSession) -> ServiceBookingsList:
    items = await service_bookings_hub.list_bookings(session, user_id=user.db_user_id)
    return ServiceBookingsList(items=items)


@router.post(
    "/me/service-bookings",
    response_model=ServiceBooking,
    status_code=status.HTTP_201_CREATED,
)
async def create_my_service_booking(
    payload: ServiceBookingCreateInput,
    user: CurrentUser,
    session: DbSession,
) -> ServiceBooking:
    unit_id = await requests_hub.primary_unit_id_for(session, user.db_user_id)
    return await service_bookings_hub.create_booking(
        session,
        user_id=user.db_user_id,
        unit_id=unit_id,
        payload=payload,
    )


@router.websocket("/me/service-bookings/stream")
async def my_service_bookings_stream(websocket: WebSocket) -> None:
    """Resident-scoped push channel — same envelope shape as
    `/me/requests/stream`. Snapshot on connect carries this resident's
    bookings only; subsequent `booking.updated` events arrive for ALL
    bookings and are filtered by residentName here (matches the
    existing maintenance pipeline's pragmatic approach)."""
    await websocket.accept()
    user = await get_current_user_ws(websocket)
    if user is None:
        return
    me_name = _display_name(user)
    logger.info("me.service_bookings.ws.connected", peer=str(websocket.client))

    async with AsyncSessionLocal() as session:
        items = await service_bookings_hub.list_bookings(session, user_id=user.db_user_id)
    my_items = [b.model_dump() for b in items]
    await websocket.send_text(json.dumps({"type": "snapshot", "items": my_items}))

    async with service_bookings_hub.subscribe() as queue:
        sender = asyncio.create_task(_service_bookings_sender(websocket, queue, me_name))
        receiver = asyncio.create_task(_receiver(websocket))
        _, pending = await asyncio.wait({sender, receiver}, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    logger.info("me.service_bookings.ws.disconnected", peer=str(websocket.client))


def _booking_is_for_me(msg: dict[str, Any], me_name: str) -> bool:
    item = msg.get("item")
    if not isinstance(item, dict):
        return True
    return item.get("residentName") == me_name


async def _service_bookings_sender(
    websocket: WebSocket, queue: asyncio.Queue[dict[str, Any]], me_name: str
) -> None:
    try:
        while True:
            msg = await queue.get()
            if not _booking_is_for_me(msg, me_name):
                continue
            await websocket.send_text(json.dumps(msg))
    except WebSocketDisconnect:
        return
    except Exception as exc:  # noqa: BLE001
        logger.warning("me.service_bookings.ws.send_error", error=str(exc))


# ─── Notifications ─────────────────────────────────────────────────────────


@router.get("/me/notifications", response_model=NotificationsList)
async def list_my_notifications(user: CurrentUser) -> NotificationsList:
    items = await notifications_hub.list_for(_display_name(user))
    return NotificationsList(items=items)


@router.websocket("/me/notifications/stream")
async def my_notifications_stream(websocket: WebSocket) -> None:
    """Push channel — sends a `snapshot` of this resident's notifications on
    connect, then forwards each `notification.created` event scoped to them
    via the hub's per-resident subscriber map.
    """
    await websocket.accept()
    user = await get_current_user_ws(websocket)
    if user is None:
        return
    me = _display_name(user)
    logger.info("me.notifications.ws.connected", peer=str(websocket.client))

    items = [n.model_dump() for n in await notifications_hub.list_for(me)]
    await websocket.send_text(json.dumps({"type": "snapshot", "items": items}))

    async with notifications_hub.subscribe(me) as queue:
        sender = asyncio.create_task(_notifications_sender(websocket, queue))
        receiver = asyncio.create_task(_receiver(websocket))
        _, pending = await asyncio.wait({sender, receiver}, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    logger.info("me.notifications.ws.disconnected", peer=str(websocket.client))


async def _notifications_sender(websocket: WebSocket, queue: asyncio.Queue[dict[str, Any]]) -> None:
    try:
        while True:
            msg = await queue.get()
            await websocket.send_text(json.dumps(msg))
    except WebSocketDisconnect:
        return
    except Exception as exc:  # noqa: BLE001
        logger.warning("me.notifications.ws.send_error", error=str(exc))
