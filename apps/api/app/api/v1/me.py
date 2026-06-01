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
demo-data hubs still filter on a resident display-name string;
`resident_identity()` projects the JWT down to that string. Unit info
isn't on the JWT, so the create path uses `_todo_resident_unit()` as a
placeholder until a Clerk-id → resident-record table exists.
"""

from __future__ import annotations

import asyncio
import json
from contextlib import suppress
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status

from app.core.auth import AuthUser, get_current_user, get_current_user_ws, resident_identity
from app.core.logging import logger
from app.schemas.notifications import NotificationsList
from app.schemas.parking import (
    ParkingBooking,
    ParkingBookingCreate,
    ParkingSlotsList,
)
from app.schemas.requests import RequestCreateInput, ServiceRequest
from app.schemas.visitor_pass import (
    VisitorPass,
    VisitorPassCreate,
    VisitorPassList,
)
from app.services import (
    notifications_hub,
    parking_hub,
    requests_hub,
    visitor_passes_hub,
)

router = APIRouter()

CurrentUser = Annotated[AuthUser, Depends(get_current_user)]


def _todo_resident_unit(user: AuthUser) -> str:
    """Placeholder until Clerk-id → unit mapping exists. Falls back to the
    demo unit so the create path can run end-to-end."""
    _ = user
    return visitor_passes_hub.DEMO_HOST_UNIT


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
    items = await parking_hub.list_slots(resident_identity(user))
    return ParkingSlotsList(items=items)


@router.post(
    "/me/parking/bookings",
    response_model=ParkingBooking,
    status_code=status.HTTP_201_CREATED,
)
async def book_parking_slot(payload: ParkingBookingCreate, user: CurrentUser) -> ParkingBooking:
    try:
        return await parking_hub.create_booking(resident_identity(user), payload)
    except parking_hub.SlotNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Slot not found") from exc
    except parking_hub.SlotUnavailableError as exc:
        raise HTTPException(status_code=409, detail="Slot already reserved") from exc


@router.delete("/me/parking/bookings/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def release_parking_booking(booking_id: str, user: CurrentUser) -> None:
    try:
        await parking_hub.release_booking(resident_identity(user), booking_id)
    except parking_hub.BookingNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Booking not found") from exc


@router.get("/me/parking/bookings", response_model=list[ParkingBooking])
async def list_my_bookings(user: CurrentUser) -> list[ParkingBooking]:
    return await parking_hub.my_bookings(resident_identity(user))


# ─── Requests (read-only for the resident view) ────────────────────────────


@router.get("/me/requests", response_model=list[ServiceRequest])
async def list_my_requests(user: CurrentUser) -> list[ServiceRequest]:
    all_requests = await requests_hub.list_requests()
    me = resident_identity(user)
    return [r for r in all_requests if r.residentName == me]


@router.post(
    "/me/requests",
    response_model=ServiceRequest,
    status_code=status.HTTP_201_CREATED,
)
async def create_my_request(payload: RequestCreateInput, user: CurrentUser) -> ServiceRequest:
    return await requests_hub.create_request(
        resident_name=resident_identity(user),
        unit=_todo_resident_unit(user),
        payload=payload,
    )


@router.websocket("/me/requests/stream")
async def my_requests_stream(websocket: WebSocket) -> None:
    """Same envelope as `/admin/requests/stream`, but the snapshot is pre-
    filtered to this resident. Subsequent `request.updated` events arrive
    for ALL requests; the client filters by id against its snapshot."""
    await websocket.accept()
    user = await get_current_user_ws(websocket)
    if user is None:
        return
    me = resident_identity(user)
    logger.info("me.requests.ws.connected", peer=str(websocket.client))

    all_requests = await requests_hub.list_requests()
    my_items = [r.model_dump() for r in all_requests if r.residentName == me]
    await websocket.send_text(json.dumps({"type": "snapshot", "items": my_items}))

    async with requests_hub.subscribe() as queue:
        sender = asyncio.create_task(_sender(websocket, queue, me))
        receiver = asyncio.create_task(_receiver(websocket))
        _, pending = await asyncio.wait({sender, receiver}, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    logger.info("me.requests.ws.disconnected", peer=str(websocket.client))


def _is_for_me(msg: dict[str, Any], me: str) -> bool:
    """Filter so the resident only receives events for their own tickets."""
    item = msg.get("item")
    if not isinstance(item, dict):
        return True  # let snapshots / other envelopes through
    return item.get("residentName") == me


async def _sender(websocket: WebSocket, queue: asyncio.Queue[dict[str, Any]], me: str) -> None:
    try:
        while True:
            msg = await queue.get()
            if not _is_for_me(msg, me):
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


# ─── Notifications ─────────────────────────────────────────────────────────


@router.get("/me/notifications", response_model=NotificationsList)
async def list_my_notifications(user: CurrentUser) -> NotificationsList:
    items = await notifications_hub.list_for(resident_identity(user))
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
    me = resident_identity(user)
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
