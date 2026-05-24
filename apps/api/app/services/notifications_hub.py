"""Notifications hub — in-memory per-resident store + WS broadcast.

Same shape as the other hubs (`requests_hub`, `gate_simulator`,
`feed_hub`): a process-local store keyed by resident name, an asyncio
fan-out queue per WS subscriber, an emit helper, and a Redis-pub/sub-
swappable broadcast layer.

Notifications are derived from domain events — see the emit helpers
(`emit_ticket_*`) which other services call directly. Bodies are
bilingual at the source so the web client can render the user's current
language without another round-trip.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid
from collections import defaultdict, deque
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

from app.core.logging import logger
from app.schemas.notifications import Notification, NotificationBody, NotificationKind

# ─── Store ─────────────────────────────────────────────────────────────────

_LIMIT = 50
_store: dict[str, deque[Notification]] = defaultdict(lambda: deque(maxlen=_LIMIT))
_store_lock = asyncio.Lock()


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


async def list_for(resident_name: str) -> list[Notification]:
    async with _store_lock:
        items = list(_store.get(resident_name, ()))
    items.sort(key=lambda n: n.createdAt, reverse=True)
    return items


async def emit(
    resident_name: str,
    kind: NotificationKind,
    title_en: str,
    title_ar: str,
    body_en: str,
    body_ar: str,
    link: str | None = None,
) -> Notification:
    notification = Notification(
        id=f"n-{uuid.uuid4().hex[:8]}",
        kind=kind,
        title=NotificationBody(en=title_en, ar=title_ar),
        body=NotificationBody(en=body_en, ar=body_ar),
        createdAt=_now_iso(),
        link=link,
    )
    async with _store_lock:
        _store[resident_name].append(notification)
    await _broadcast(
        resident_name,
        {"type": "notification.created", "item": notification.model_dump()},
    )
    logger.info(
        "notification.emitted",
        resident=resident_name,
        kind=kind,
        id=notification.id,
    )
    return notification


# ─── Pretty-print helpers for ticket events ─────────────────────────────────

CATEGORY_AR: dict[str, str] = {
    "ac": "تكييف",
    "plumbing": "سباكة",
    "electrical": "كهرباء",
    "cleaning": "نظافة",
    "pest": "مكافحة حشرات",
    "other": "خدمة عامة",
}
CATEGORY_EN: dict[str, str] = {
    "ac": "AC",
    "plumbing": "Plumbing",
    "electrical": "Electrical",
    "cleaning": "Cleaning",
    "pest": "Pest control",
    "other": "Service",
}


def _cat(category: str, lang: str) -> str:
    table = CATEGORY_AR if lang == "ar" else CATEGORY_EN
    return table.get(category, category)


async def emit_ticket_created(
    resident_name: str, ticket_id: str, category: str, ticket_title: str
) -> Notification:
    return await emit(
        resident_name,
        kind="ticket_created",
        title_en="Ticket received",
        title_ar="استلمنا طلبك",
        body_en=f"We've received your {_cat(category, 'en')} request. We'll keep you posted.",
        body_ar=f"استلمنا طلب {_cat(category, 'ar')} الخاص بك. هنتابع معاك أول بأول.",
        link=f"/services/requests#{ticket_id}",
    )


async def emit_ticket_dispatched(
    resident_name: str,
    ticket_id: str,
    category: str,
    technician_name: str,
) -> Notification:
    return await emit(
        resident_name,
        kind="ticket_dispatched",
        title_en="Technician dispatched",
        title_ar="تم تعيين فني",
        body_en=(f"{technician_name} is on the way for your {_cat(category, 'en')} ticket."),
        body_ar=f"تم تعيين الفني {technician_name} لطلب {_cat(category, 'ar')} الخاص بك.",
        link=f"/services/requests#{ticket_id}",
    )


async def emit_ticket_resolved(resident_name: str, ticket_id: str, category: str) -> Notification:
    return await emit(
        resident_name,
        kind="ticket_resolved",
        title_en="Ticket resolved",
        title_ar="تم حل المشكلة",
        body_en=f"Your {_cat(category, 'en')} ticket has been marked resolved.",
        body_ar=f"تم حل طلب {_cat(category, 'ar')} الخاص بك.",
        link=f"/services/requests#{ticket_id}",
    )


# ─── Broadcast hub ─────────────────────────────────────────────────────────

# Each subscriber's queue is scoped to one resident; the hub fans events
# only to queues registered for that resident name.

_subscribers: dict[str, set[asyncio.Queue[dict[str, Any]]]] = defaultdict(set)
_subscribers_lock = asyncio.Lock()


@asynccontextmanager
async def subscribe(
    resident_name: str,
) -> AsyncIterator[asyncio.Queue[dict[str, Any]]]:
    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    async with _subscribers_lock:
        _subscribers[resident_name].add(queue)
    total = sum(len(q) for q in _subscribers.values())
    logger.info("notifications.subscriber.added", resident=resident_name, total=total)
    try:
        yield queue
    finally:
        async with _subscribers_lock:
            _subscribers[resident_name].discard(queue)
        logger.info("notifications.subscriber.removed", resident=resident_name)


async def _broadcast(resident_name: str, message: dict[str, Any]) -> None:
    async with _subscribers_lock:
        queues = list(_subscribers.get(resident_name, ()))
    for q in queues:
        with contextlib.suppress(asyncio.QueueFull):
            q.put_nowait(message)
