"""Posts / Reels REST + WebSocket routes (Week-7 live feed).

- POST /posts           — admin publishes; persists to in-memory hub and
                          broadcasts a `feed.item.created` event to every
                          WS subscriber.
- GET  /posts           — snapshot of the current feed (newest-first).
- DELETE /posts/{id}    — admin retracts; broadcasts `feed.item.deleted`.
- WS   /posts/stream    — push channel. Clients receive JSON envelopes:
                            { "type": "feed.item.created", "item": {...} }
                            { "type": "feed.item.deleted", "id": "..." }
                            { "type": "pong" }     (in response to pings)

Auth is intentionally not enforced yet — admin auth + role check lands when
the Clerk JWT middleware ships. For the MVP demo the API is bound to
localhost only and CORS is restricted to the three Vite/Expo dev origins.
"""

from __future__ import annotations

import asyncio
import json
from contextlib import suppress
from typing import Any

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status

from app.core.logging import logger
from app.schemas.feed import (
    FeedItemCreateInput,
    FeedItemResponse,
    FeedListResponse,
)
from app.services import feed_hub

router = APIRouter()

# ─── REST ───────────────────────────────────────────────────────────────────


@router.get("/posts", response_model=FeedListResponse)
async def list_posts() -> FeedListResponse:
    items = await feed_hub.list_items()
    return FeedListResponse(items=items)  # type: ignore[arg-type]


@router.post("/posts", response_model=FeedItemResponse, status_code=status.HTTP_201_CREATED)
async def create_post(payload: FeedItemCreateInput) -> dict[str, Any]:
    # `payload.model_dump()` keeps the kind/category/slides etc. — the hub
    # only needs to add id + publishedAt + broadcast.
    return await feed_hub.create_item(payload.model_dump())


@router.delete("/posts/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(item_id: str) -> None:
    ok = await feed_hub.delete_item(item_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Not found")


# ─── WebSocket ──────────────────────────────────────────────────────────────


@router.websocket("/posts/stream")
async def posts_stream(websocket: WebSocket) -> None:
    """Push-channel for live feed updates.

    On accept, the server immediately sends a `snapshot` message with the
    current feed so newly-connected clients don't need a separate GET
    round-trip. Then it forwards every broadcast event until the client
    disconnects. Ping/pong is supported so a frontend can keep the
    connection warm through corporate proxies.
    """
    await websocket.accept()
    logger.info("feed.ws.connected", peer=str(websocket.client))

    # Initial snapshot — saves the client one HTTP round-trip on reconnect.
    snapshot = await feed_hub.list_items()
    await websocket.send_text(json.dumps({"type": "snapshot", "items": snapshot}))

    async with feed_hub.subscribe() as queue:
        sender_task = asyncio.create_task(_sender(websocket, queue))
        receiver_task = asyncio.create_task(_receiver(websocket))
        done, pending = await asyncio.wait(
            {sender_task, receiver_task}, return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    logger.info("feed.ws.disconnected", peer=str(websocket.client))


async def _sender(websocket: WebSocket, queue: asyncio.Queue[dict[str, Any]]) -> None:
    """Drain the per-subscriber queue and forward to the socket."""
    try:
        while True:
            msg = await queue.get()
            await websocket.send_text(json.dumps(msg))
    except WebSocketDisconnect:
        return
    except Exception as exc:  # noqa: BLE001
        logger.warning("feed.ws.send_error", error=str(exc))


async def _receiver(websocket: WebSocket) -> None:
    """Read incoming messages — only handles ping today. We need the recv
    loop running so that `WebSocketDisconnect` propagates and the sender
    task gets cancelled."""
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
