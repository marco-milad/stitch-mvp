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

Auth is intentionally not enforced yet — the demo identity is the
hard-coded resident in `visitor_passes_hub`.
"""

from __future__ import annotations

import asyncio
import json
from contextlib import suppress
from typing import Any

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status

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


def _demo_resident() -> str:
    """Single source of truth for who 'me' is in the demo."""
    return visitor_passes_hub.DEMO_HOST_NAME


def _demo_resident_unit() -> str:
    return visitor_passes_hub.DEMO_HOST_UNIT


# ─── Visitor passes ────────────────────────────────────────────────────────


@router.post(
    "/me/visitor-passes",
    response_model=VisitorPass,
    status_code=status.HTTP_201_CREATED,
)
async def create_visitor_pass(payload: VisitorPassCreate) -> VisitorPass:
    return await visitor_passes_hub.create_pass(payload)


@router.get("/me/visitor-passes", response_model=VisitorPassList)
async def list_visitor_passes() -> VisitorPassList:
    items = await visitor_passes_hub.list_passes()
    return VisitorPassList(items=items)


# ─── Parking ───────────────────────────────────────────────────────────────


@router.get("/me/parking/slots", response_model=ParkingSlotsList)
async def list_parking_slots() -> ParkingSlotsList:
    items = await parking_hub.list_slots(_demo_resident())
    return ParkingSlotsList(items=items)


@router.post(
    "/me/parking/bookings",
    response_model=ParkingBooking,
    status_code=status.HTTP_201_CREATED,
)
async def book_parking_slot(payload: ParkingBookingCreate) -> ParkingBooking:
    try:
        return await parking_hub.create_booking(_demo_resident(), payload)
    except parking_hub.SlotNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Slot not found") from exc
    except parking_hub.SlotUnavailableError as exc:
        raise HTTPException(status_code=409, detail="Slot already reserved") from exc


@router.delete("/me/parking/bookings/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def release_parking_booking(booking_id: str) -> None:
    try:
        await parking_hub.release_booking(_demo_resident(), booking_id)
    except parking_hub.BookingNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Booking not found") from exc


@router.get("/me/parking/bookings", response_model=list[ParkingBooking])
async def list_my_bookings() -> list[ParkingBooking]:
    return await parking_hub.my_bookings(_demo_resident())


# ─── Requests (read-only for the resident view) ────────────────────────────


@router.get("/me/requests", response_model=list[ServiceRequest])
async def list_my_requests() -> list[ServiceRequest]:
    all_requests = await requests_hub.list_requests()
    me = _demo_resident()
    return [r for r in all_requests if r.residentName == me]


@router.post(
    "/me/requests",
    response_model=ServiceRequest,
    status_code=status.HTTP_201_CREATED,
)
async def create_my_request(payload: RequestCreateInput) -> ServiceRequest:
    return await requests_hub.create_request(
        resident_name=_demo_resident(),
        unit=_demo_resident_unit(),
        payload=payload,
    )


@router.websocket("/me/requests/stream")
async def my_requests_stream(websocket: WebSocket) -> None:
    """Same envelope as `/admin/requests/stream`, but the snapshot is pre-
    filtered to this resident. Subsequent `request.updated` events arrive
    for ALL requests; the client filters by id against its snapshot."""
    await websocket.accept()
    me = _demo_resident()
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
async def list_my_notifications() -> NotificationsList:
    items = await notifications_hub.list_for(_demo_resident())
    return NotificationsList(items=items)


@router.websocket("/me/notifications/stream")
async def my_notifications_stream(websocket: WebSocket) -> None:
    """Push channel — sends a `snapshot` of this resident's notifications on
    connect, then forwards each `notification.created` event scoped to them
    via the hub's per-resident subscriber map.
    """
    await websocket.accept()
    me = _demo_resident()
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
