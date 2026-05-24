"""Admin gate-stream WebSocket route.

   WS /api/v1/admin/gate/stream

Sends a `snapshot` frame on connect (last 60 scans), then forwards each new
`scan` event as the simulator emits it. Bidirectional `ping`/`pong` keeps
the socket warm through corporate proxies.
"""

from __future__ import annotations

import asyncio
import json
from contextlib import suppress
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.logging import logger
from app.services import gate_simulator

router = APIRouter()


@router.websocket("/admin/gate/stream")
async def gate_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    logger.info("gate.ws.connected", peer=str(websocket.client))

    snapshot_events = [e.model_dump() for e in await gate_simulator.list_recent()]
    await websocket.send_text(json.dumps({"type": "snapshot", "events": snapshot_events}))

    async with gate_simulator.subscribe() as queue:
        sender = asyncio.create_task(_sender(websocket, queue))
        receiver = asyncio.create_task(_receiver(websocket))
        _, pending = await asyncio.wait({sender, receiver}, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    logger.info("gate.ws.disconnected", peer=str(websocket.client))


async def _sender(websocket: WebSocket, queue: asyncio.Queue[dict[str, Any]]) -> None:
    try:
        while True:
            msg = await queue.get()
            await websocket.send_text(json.dumps(msg))
    except WebSocketDisconnect:
        return
    except Exception as exc:  # noqa: BLE001
        logger.warning("gate.ws.send_error", error=str(exc))


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
