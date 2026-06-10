"""Notifications hub — DB-backed persistence + per-resident WS broadcast.
//
A notification is a derived projection of a domain event (ticket
dispatched, booking confirmed, etc.) into a row residents see in their
notifications center.

Persistence: `app.models.notifications.Notification` table. Notification
content is bilingual at the source so the web client can render the
user's current language without an extra round-trip — `title` stores the
English form, `body` stores the English body, and the bilingual JSON
ships back to the client via `meta`. This keeps the SQL columns simple
without locking the schema into one language.

Live fan-out: `subscribe(resident_name)` registers an asyncio queue;
`_broadcast(resident_name, message)` puts a payload on every subscriber
queue matching the resident. The polling path (`GET /me/notifications`)
reads straight from DB; the WS path subscribes for instant push. Both
return identical wire-format `Notification` schemas.
"""

from __future__ import annotations

import asyncio
import contextlib
import uuid
from collections import defaultdict
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models.notifications import Notification as NotificationRow
from app.models.user import User
from app.schemas.notifications import Notification, NotificationBody, NotificationKind

# Maximum notifications retained per resident on read. Older rows stay
# in the table but aren't surfaced — keeps the bell's payload bounded.
_HISTORY_LIMIT = 50


# ─── Projection ─────────────────────────────────────────────────────────────


def _project(row: NotificationRow) -> Notification:
    # `meta` stores the bilingual JSON we wrote at emit time. Fall back
    # to the English title/body on legacy rows so we don't crash if an
    # admin-inserted row is missing the JSON envelope.
    meta = row.meta or {}
    title_meta = meta.get("title") if isinstance(meta, dict) else None
    body_meta = meta.get("body") if isinstance(meta, dict) else None
    link = meta.get("link") if isinstance(meta, dict) else None
    title = (
        NotificationBody(en=title_meta["en"], ar=title_meta["ar"])
        if isinstance(title_meta, dict) and "en" in title_meta and "ar" in title_meta
        else NotificationBody(en=row.title, ar=row.title)
    )
    body = (
        NotificationBody(en=body_meta["en"], ar=body_meta["ar"])
        if isinstance(body_meta, dict) and "en" in body_meta and "ar" in body_meta
        else NotificationBody(en=row.body or "", ar=row.body or "")
    )
    return Notification(
        id=str(row.id),
        kind=row.type,  # type: ignore[arg-type]
        title=title,
        body=body,
        isRead=row.read_at is not None,
        createdAt=row.created_at.isoformat(),
        link=link if isinstance(link, str) else None,
    )


# ─── Reads ──────────────────────────────────────────────────────────────────


async def list_for(session: AsyncSession, user_id: uuid.UUID) -> list[Notification]:
    """Newest-first, capped at _HISTORY_LIMIT. The bell dropdown only
    needs the recent slice; full history could grow indefinitely without
    pagination and the resident has no UI to scroll past it."""
    stmt = (
        select(NotificationRow)
        .where(NotificationRow.user_id == user_id)
        .order_by(desc(NotificationRow.created_at))
        .limit(_HISTORY_LIMIT)
    )
    result = await session.execute(stmt)
    return [_project(row) for row in result.scalars().all()]


async def unread_count_for(session: AsyncSession, user_id: uuid.UUID) -> int:
    stmt = (
        select(NotificationRow.id)
        .where(NotificationRow.user_id == user_id)
        .where(NotificationRow.read_at.is_(None))
    )
    result = await session.execute(stmt)
    return len(result.scalars().all())


# ─── Mutations ──────────────────────────────────────────────────────────────


async def emit(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    resident_name: str,
    kind: NotificationKind,
    title_en: str,
    title_ar: str,
    body_en: str,
    body_ar: str,
    link: str | None = None,
) -> Notification:
    """Persist a new notification, project it, broadcast to any open
    subscribers for that resident. `resident_name` is the broadcast
    routing key (matches the WS endpoint's display-name routing); the
    DB row is keyed on `user_id`.
    """
    row = NotificationRow(
        user_id=user_id,
        type=kind,
        title=title_en,
        body=body_en,
        meta={
            "title": {"en": title_en, "ar": title_ar},
            "body": {"en": body_en, "ar": body_ar},
            "link": link,
        },
    )
    session.add(row)
    await session.flush()
    await session.commit()
    await session.refresh(row)
    projected = _project(row)
    await _broadcast(
        resident_name,
        {"type": "notification.created", "item": projected.model_dump()},
    )
    logger.info(
        "notification.emitted",
        resident=resident_name,
        kind=kind,
        id=projected.id,
    )
    return projected


async def mark_all_read(session: AsyncSession, user_id: uuid.UUID) -> int:
    """Flip read_at on every unread notification owned by this user.
    Returns the number of rows updated so the route can echo it back
    (handy for the optimistic UI to know how big the badge was)."""
    now = datetime.now(UTC)
    stmt = (
        update(NotificationRow)
        .where(NotificationRow.user_id == user_id)
        .where(NotificationRow.read_at.is_(None))
        .values(read_at=now)
        .returning(NotificationRow.id)
    )
    result = await session.execute(stmt)
    updated_ids = result.scalars().all()
    await session.commit()
    logger.info("notifications.marked_read", user_id=str(user_id), count=len(updated_ids))
    return len(updated_ids)


# ─── Resident-name resolution helper ────────────────────────────────────────


async def resident_name_for(session: AsyncSession, user_id: uuid.UUID) -> str:
    """Resolve the display name used for WS broadcast routing. Mirrors
    `_display_name(user)` in the auth layer but only takes a session +
    user_id, so service hubs don't have to thread the AuthUser through.
    """
    user = await session.scalar(select(User).where(User.id == user_id))
    if user is None:
        return str(user_id)
    parts = [p for p in (user.first_name, user.last_name) if p]
    return " ".join(parts) or user.email or str(user_id)


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
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    resident_name: str,
    ticket_id: str,
    category: str,
    ticket_title: str,
) -> Notification:
    _ = ticket_title  # reserved for future copy
    return await emit(
        session,
        user_id=user_id,
        resident_name=resident_name,
        kind="ticket_created",
        title_en="Ticket received",
        title_ar="استلمنا طلبك",
        body_en=f"We've received your {_cat(category, 'en')} request. We'll keep you posted.",
        body_ar=f"استلمنا طلب {_cat(category, 'ar')} الخاص بك. هنتابع معاك أول بأول.",
        link=f"/services/requests#{ticket_id}",
    )


async def emit_ticket_dispatched(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    resident_name: str,
    ticket_id: str,
    category: str,
    technician_name: str,
) -> Notification:
    return await emit(
        session,
        user_id=user_id,
        resident_name=resident_name,
        kind="ticket_dispatched",
        title_en="Technician dispatched",
        title_ar="تم تعيين فني",
        body_en=f"{technician_name} is on the way for your {_cat(category, 'en')} ticket.",
        body_ar=f"تم تعيين الفني {technician_name} لطلب {_cat(category, 'ar')} الخاص بك.",
        link=f"/services/requests#{ticket_id}",
    )


async def emit_ticket_resolved(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    resident_name: str,
    ticket_id: str,
    category: str,
) -> Notification:
    return await emit(
        session,
        user_id=user_id,
        resident_name=resident_name,
        kind="ticket_resolved",
        title_en="Ticket resolved",
        title_ar="تم حل المشكلة",
        body_en=f"Your {_cat(category, 'en')} ticket has been marked resolved.",
        body_ar=f"تم حل طلب {_cat(category, 'ar')} الخاص بك.",
        link=f"/services/requests#{ticket_id}",
    )


# ─── Booking event helpers ──────────────────────────────────────────────────


async def emit_booking_status(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    resident_name: str,
    booking_id: str,
    tile_id: str,
    time_slot: str,
    new_status: str,
) -> Notification | None:
    """Mint a notification when a service booking's status flips.

    Returns None for transitions that don't warrant a resident-facing
    notification (e.g. internal in_progress flips). Returns the emitted
    Notification otherwise so the route layer can log it.
    """
    # `tile_id` is the catalog identifier ("daily-cleaning", "daily-pet",
    # etc.). Strip the daily- prefix for a human-friendly label.
    pretty_tile = tile_id.removeprefix("daily-").replace("-", " ").title() or "Service"

    if new_status == "confirmed":
        return await emit(
            session,
            user_id=user_id,
            resident_name=resident_name,
            kind="ticket_dispatched",  # reuses the existing enum slot
            title_en=f"{pretty_tile} confirmed",
            title_ar=f"{pretty_tile} مؤكد",
            body_en=f"Your {pretty_tile} booking is confirmed for {time_slot}.",
            body_ar=f"تم تأكيد حجز {pretty_tile} الساعة {time_slot}.",
            link=f"/services/requests#{booking_id}",
        )
    if new_status == "completed":
        return await emit(
            session,
            user_id=user_id,
            resident_name=resident_name,
            kind="ticket_resolved",
            title_en=f"{pretty_tile} completed",
            title_ar=f"{pretty_tile} اكتمل",
            body_en=f"Your {pretty_tile} booking is marked complete. Thanks!",
            body_ar=f"تم اكتمال حجز {pretty_tile}. شكرًا!",
            link=f"/services/requests#{booking_id}",
        )
    if new_status == "cancelled":
        return await emit(
            session,
            user_id=user_id,
            resident_name=resident_name,
            kind="ticket_resolved",
            title_en=f"{pretty_tile} cancelled",
            title_ar=f"{pretty_tile} ملغي",
            body_en=f"Your {pretty_tile} booking was cancelled. Please book again if needed.",
            body_ar=f"تم إلغاء حجز {pretty_tile}. ابعت طلب جديد لو لسه محتاج.",
            link=f"/services/requests#{booking_id}",
        )
    return None


# ─── Broadcast hub ──────────────────────────────────────────────────────────

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
