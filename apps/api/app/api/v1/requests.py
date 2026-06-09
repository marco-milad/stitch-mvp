"""Service Requests REST + WebSocket routes.

REST:
    GET    /admin/requests                  — list active tickets + tech roster
    POST   /admin/requests/{id}/dispatch    — assign technician, → in_progress
    POST   /admin/requests/{id}/resolve     — mark resolved

WS:
    /admin/requests/stream                  — snapshot on connect, then
                                              `request.updated` per change

Persistence is SQL via `requests_hub`. Admin-side authn enforcement
is still TODO — these routes don't yet check role. When the Clerk admin
JWT custom claim lands, gate via `Depends(get_current_user)` + role
check.
"""

from __future__ import annotations

import asyncio
import json
from contextlib import suppress
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, get_db
from app.core.logging import logger
from app.schemas.requests import (
    DispatchInput,
    ServiceRequest,
    ServiceRequestsList,
)
from app.schemas.service_bookings import (
    ServiceBooking,
    ServiceBookingNotesUpdate,
    ServiceBookingsList,
)
from app.services import requests_hub, service_bookings_hub

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]


# ─── REST ──────────────────────────────────────────────────────────────────


@router.get("/admin/requests", response_model=ServiceRequestsList)
async def list_admin_requests(session: DbSession) -> ServiceRequestsList:
    items = await requests_hub.list_requests(session)
    techs = requests_hub.list_technicians()
    return ServiceRequestsList(items=items, technicians=techs)


@router.post(
    "/admin/requests/{request_id}/dispatch",
    response_model=ServiceRequest,
    status_code=status.HTTP_200_OK,
)
async def dispatch_request(
    request_id: str, payload: DispatchInput, session: DbSession
) -> ServiceRequest:
    try:
        return await requests_hub.dispatch(session, request_id, payload.technicianId)
    except requests_hub.RequestNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Request not found") from exc
    except requests_hub.TechnicianNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Technician not found") from exc
    except requests_hub.IllegalStateError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post(
    "/admin/requests/{request_id}/resolve",
    response_model=ServiceRequest,
    status_code=status.HTTP_200_OK,
)
async def resolve_request(request_id: str, session: DbSession) -> ServiceRequest:
    try:
        return await requests_hub.resolve(session, request_id)
    except requests_hub.RequestNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Request not found") from exc


# ─── WebSocket ─────────────────────────────────────────────────────────────


@router.websocket("/admin/requests/stream")
async def requests_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    logger.info("requests.ws.connected", peer=str(websocket.client))

    async with AsyncSessionLocal() as session:
        items = [r.model_dump() for r in await requests_hub.list_requests(session)]
    techs = [t.model_dump() for t in requests_hub.list_technicians()]
    await websocket.send_text(
        json.dumps({"type": "snapshot", "items": items, "technicians": techs})
    )

    async with requests_hub.subscribe() as queue:
        sender = asyncio.create_task(_sender(websocket, queue))
        receiver = asyncio.create_task(_receiver(websocket))
        _, pending = await asyncio.wait({sender, receiver}, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    logger.info("requests.ws.disconnected", peer=str(websocket.client))


async def _sender(websocket: WebSocket, queue: asyncio.Queue[dict[str, Any]]) -> None:
    try:
        while True:
            msg = await queue.get()
            await websocket.send_text(json.dumps(msg))
    except WebSocketDisconnect:
        return
    except Exception as exc:  # noqa: BLE001
        logger.warning("requests.ws.send_error", error=str(exc))


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


# ─── Service Bookings (admin view) ─────────────────────────────────────────
#
# Admin counterpart for `/me/service-bookings`. Same envelope shape as
# `/admin/requests/stream` so the dashboard can subscribe with the same
# reconnecting-WS helper. No technician roster — service bookings flow
# straight to the vendor, not through internal dispatch.


@router.get("/admin/service-bookings", response_model=ServiceBookingsList)
async def list_admin_service_bookings(session: DbSession) -> ServiceBookingsList:
    # Admin view includes the internal admin_notes column; the resident
    # /me/service-bookings call sets include_admin_notes=False so the
    # field stays admin-only.
    items = await service_bookings_hub.list_bookings(session, include_admin_notes=True)
    return ServiceBookingsList(items=items)


# ─── Service Booking state-machine transitions (admin) ────────────────────
#
#     pending  ──[/confirm]──►  confirmed  ──[/complete]──►  completed
#        │                            │
#        └────[/cancel]── cancelled ◄─┘
#
# Each route is a thin wrapper around service_bookings_hub which holds
# the transition validation + broadcast. InvalidTransitionError maps to
# 409 Conflict so the admin UI can distinguish "you can't do that from
# the current state" from 404 ("booking doesn't exist").


@router.post(
    "/admin/service-bookings/{booking_id}/confirm",
    response_model=ServiceBooking,
)
async def confirm_admin_service_booking(booking_id: str, session: DbSession) -> ServiceBooking:
    try:
        return await service_bookings_hub.confirm_booking(session, booking_id)
    except service_bookings_hub.BookingNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Booking not found") from exc
    except service_bookings_hub.InvalidTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post(
    "/admin/service-bookings/{booking_id}/complete",
    response_model=ServiceBooking,
)
async def complete_admin_service_booking(booking_id: str, session: DbSession) -> ServiceBooking:
    try:
        return await service_bookings_hub.complete_booking(session, booking_id)
    except service_bookings_hub.BookingNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Booking not found") from exc
    except service_bookings_hub.InvalidTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post(
    "/admin/service-bookings/{booking_id}/cancel",
    response_model=ServiceBooking,
)
async def cancel_admin_service_booking(booking_id: str, session: DbSession) -> ServiceBooking:
    try:
        return await service_bookings_hub.cancel_booking(session, booking_id)
    except service_bookings_hub.BookingNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Booking not found") from exc
    except service_bookings_hub.InvalidTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.patch(
    "/admin/service-bookings/{booking_id}/notes",
    response_model=ServiceBooking,
)
async def patch_admin_service_booking_notes(
    booking_id: str, payload: ServiceBookingNotesUpdate, session: DbSession
) -> ServiceBooking:
    try:
        return await service_bookings_hub.update_admin_notes(
            session, booking_id, payload.adminNotes
        )
    except service_bookings_hub.BookingNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Booking not found") from exc


@router.websocket("/admin/service-bookings/stream")
async def admin_service_bookings_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    logger.info("service_bookings.ws.connected", peer=str(websocket.client))

    async with AsyncSessionLocal() as session:
        items = [b.model_dump() for b in await service_bookings_hub.list_bookings(session)]
    await websocket.send_text(json.dumps({"type": "snapshot", "items": items}))

    async with service_bookings_hub.subscribe() as queue:
        sender = asyncio.create_task(_sender(websocket, queue))
        receiver = asyncio.create_task(_receiver(websocket))
        _, pending = await asyncio.wait({sender, receiver}, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    logger.info("service_bookings.ws.disconnected", peer=str(websocket.client))
