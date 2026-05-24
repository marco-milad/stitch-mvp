"""In-memory feed store + WebSocket broadcast hub.

This is the Week-7 stand-in for the real Posts/Reels tables. It lets the admin
publish content and the resident app react live without requiring the DB
session machinery to be online. Migration plan when the persistence layer
lands:

    1. Replace `_items` with a Posts/Reels repository read on startup.
    2. Move `_persist_then_broadcast()` into a service that writes to DB
       inside a transaction and broadcasts only on commit.
    3. Add a Redis pub/sub backend behind `FeedHub` so the WS layer fans
       out across multiple uvicorn workers (single-process today).

The hub is process-local and therefore not horizontally scalable — that's
acceptable for the MVP demo and is the natural seam to replace with Redis.
"""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

from app.core.logging import logger

# ─── In-memory store ────────────────────────────────────────────────────────

_items: list[dict[str, Any]] = []
_items_lock = asyncio.Lock()


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _gen_id(kind: str) -> str:
    return f"{kind}-{uuid.uuid4().hex[:8]}"


async def list_items() -> list[dict[str, Any]]:
    """Return a snapshot of the current feed, newest-first."""
    async with _items_lock:
        return sorted(_items, key=lambda i: i.get("publishedAt", ""), reverse=True)


async def create_item(payload: dict[str, Any]) -> dict[str, Any]:
    """Append a new post/reel and broadcast to subscribers.

    `payload` is validated upstream by the Pydantic request schema; this
    function only adds server-controlled fields (id, publishedAt).
    """
    kind = payload.get("kind", "post")
    item: dict[str, Any] = {
        **payload,
        "id": _gen_id(kind),
        "publishedAt": _now_iso(),
    }
    async with _items_lock:
        _items.append(item)
    await broadcast({"type": "feed.item.created", "item": item})
    logger.info("feed.item.created", id=item["id"], kind=kind)
    return item


async def delete_item(item_id: str) -> bool:
    async with _items_lock:
        before = len(_items)
        _items[:] = [i for i in _items if i.get("id") != item_id]
        removed = len(_items) < before
    if removed:
        await broadcast({"type": "feed.item.deleted", "id": item_id})
        logger.info("feed.item.deleted", id=item_id)
    return removed


# ─── WebSocket broadcast hub ────────────────────────────────────────────────

_subscribers: set[asyncio.Queue[dict[str, Any]]] = set()
_subscribers_lock = asyncio.Lock()


@asynccontextmanager
async def subscribe() -> AsyncIterator[asyncio.Queue[dict[str, Any]]]:
    """Subscribe to feed events. Each subscriber gets its own queue so a slow
    client cannot block others. Queue is unbounded for simplicity — bound it
    once we move to a real pub/sub backend.
    """
    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    async with _subscribers_lock:
        _subscribers.add(queue)
    logger.info("feed.subscriber.added", total=len(_subscribers))
    try:
        yield queue
    finally:
        async with _subscribers_lock:
            _subscribers.discard(queue)
        logger.info("feed.subscriber.removed", total=len(_subscribers))


async def broadcast(message: dict[str, Any]) -> None:
    """Fan-out to all current subscribers. Drops the message for a single
    queue if put_nowait fails (shouldn't happen with unbounded queues)."""
    async with _subscribers_lock:
        queues = list(_subscribers)
    for q in queues:
        try:
            q.put_nowait(message)
        except asyncio.QueueFull:
            logger.warning("feed.broadcast.queue_full")
