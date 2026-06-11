"""Discover funnel data layer — EOI + Book-a-Visit persistence with
admin notification fan-out.

Two mutations, both public-allowed (no auth dependency on the route):

    create_eoi(...)              → row + admin notification per admin
    create_discover_booking(...) → row + admin notification per admin

Admin fan-out: queries `users` for every row with role in {super_admin,
admin} and emits a notification to each. The same notifications_hub
broadcast queue that resident notifications use also fires here, so any
admin who happens to have a /me/notifications WS open lights up
instantly. Other admins see the row on their next 5 s poll.

If zero admins exist (fresh database, demo deploy), the row still
persists — we log a warning so ops can spot the gap and seed an
admin account.
"""

from __future__ import annotations

from datetime import date as date_t
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models.ops import DiscoverBooking as DiscoverBookingRow
from app.models.ops import EoiSubmission as EoiSubmissionRow
from app.models.user import User, UserRole
from app.schemas.discover import (
    DiscoverBookingCreate,
    DiscoverBookingResponse,
    EoiSubmissionCreate,
    EoiSubmissionResponse,
)
from app.services import notifications_hub

# Roles that receive Discover-funnel admin notifications. Excludes
# `staff` and `security` — sales leads are a super-admin / admin
# concern, not gate-ops. Tweak here if/when a `sales` role lands.
_NOTIFY_ROLES = (UserRole.super_admin, UserRole.admin)


# ─── Helpers ──────────────────────────────────────────────────────────────


async def _list_admins(session: AsyncSession) -> list[User]:
    stmt = select(User).where(User.role.in_(_NOTIFY_ROLES))
    result = await session.execute(stmt)
    return list(result.scalars().all())


def _project_eoi(row: EoiSubmissionRow) -> EoiSubmissionResponse:
    return EoiSubmissionResponse(
        id=str(row.id),
        name=row.name,
        email=row.email,
        phone=row.phone,
        interestType=row.interest_type,  # type: ignore[arg-type]
        budget=row.budget,
        timeline=row.timeline,
        notes=row.notes,
        createdAt=row.created_at.isoformat(),
    )


def _project_booking(row: DiscoverBookingRow) -> DiscoverBookingResponse:
    return DiscoverBookingResponse(
        id=str(row.id),
        visitType=row.visit_type,  # type: ignore[arg-type]
        bookingDate=row.booking_date.isoformat(),
        timeSlot=row.time_slot,
        advisorName=row.advisor_name,
        name=row.name,
        email=row.email,
        phone=row.phone,
        createdAt=row.created_at.isoformat(),
    )


# ─── EOI ──────────────────────────────────────────────────────────────────


async def create_eoi(
    session: AsyncSession,
    *,
    payload: EoiSubmissionCreate,
) -> EoiSubmissionResponse:
    """Persist an EOI, then emit one admin notification per admin row."""
    row = EoiSubmissionRow(
        name=payload.name,
        email=str(payload.email),
        phone=payload.phone,
        interest_type=payload.interestType,
        budget=payload.budget,
        timeline=payload.timeline,
        notes=payload.notes.strip() if payload.notes else None,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    projected = _project_eoi(row)

    await _notify_admins_eoi(session, projected)
    logger.info(
        "discover.eoi.created",
        id=projected.id,
        name=projected.name,
        email=projected.email,
        interest=projected.interestType,
    )
    return projected


async def _notify_admins_eoi(session: AsyncSession, eoi: EoiSubmissionResponse) -> None:
    admins = await _list_admins(session)
    if not admins:
        logger.warning("discover.eoi.no_admins_to_notify", eoi_id=eoi.id)
        return
    body_en = f"{eoi.name} ({eoi.email}) wants a {eoi.interestType or 'unit'}"
    if eoi.timeline:
        body_en += f" · timeline: {eoi.timeline}"
    body_ar = f"{eoi.name} ({eoi.email}) مهتم بـ {eoi.interestType or 'وحدة'}"
    if eoi.timeline:
        body_ar += f" · الإطار الزمني: {eoi.timeline}"

    for admin in admins:
        resident_name = _display_name_for(admin)
        await notifications_hub.emit(
            session,
            user_id=admin.id,
            resident_name=resident_name,
            kind="eoi_received",
            title_en="New EOI submitted",
            title_ar="طلب اهتمام جديد",
            body_en=body_en,
            body_ar=body_ar,
            link=f"/admin/leads/eoi/{eoi.id}",
        )


# ─── Discover bookings ────────────────────────────────────────────────────


async def create_discover_booking(
    session: AsyncSession,
    *,
    payload: DiscoverBookingCreate,
) -> DiscoverBookingResponse:
    """Persist a visit booking, then emit admin notifications."""
    booking_date = date_t.fromisoformat(payload.bookingDate)
    row = DiscoverBookingRow(
        visit_type=payload.visitType,
        booking_date=booking_date,
        time_slot=payload.timeSlot,
        advisor_name=payload.advisorName,
        name=payload.name,
        email=str(payload.email),
        phone=payload.phone,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    projected = _project_booking(row)

    await _notify_admins_booking(session, projected)
    logger.info(
        "discover.booking.created",
        id=projected.id,
        visit_type=projected.visitType,
        booking_date=projected.bookingDate,
        time_slot=projected.timeSlot,
        name=projected.name,
        email=projected.email,
    )
    return projected


async def _notify_admins_booking(session: AsyncSession, booking: DiscoverBookingResponse) -> None:
    admins = await _list_admins(session)
    if not admins:
        logger.warning("discover.booking.no_admins_to_notify", booking_id=booking.id)
        return
    visit_label_en = {
        "showroom": "showroom visit",
        "onsite": "on-site walkthrough",
        "virtual": "virtual tour",
    }.get(booking.visitType, "visit")
    visit_label_ar = {
        "showroom": "زيارة المعرض",
        "onsite": "زيارة الموقع",
        "virtual": "جولة افتراضية",
    }.get(booking.visitType, "زيارة")

    body_en = (
        f"{booking.name} booked a {visit_label_en} for {booking.bookingDate} at {booking.timeSlot}"
    )
    body_ar = (
        f"{booking.name} حجز {visit_label_ar} في {booking.bookingDate} الساعة {booking.timeSlot}"
    )
    if booking.advisorName:
        body_en += f" with {booking.advisorName}"
        body_ar += f" مع {booking.advisorName}"

    for admin in admins:
        resident_name = _display_name_for(admin)
        await notifications_hub.emit(
            session,
            user_id=admin.id,
            resident_name=resident_name,
            kind="discover_booking_received",
            title_en="New site visit booked",
            title_ar="حجز زيارة جديد",
            body_en=body_en,
            body_ar=body_ar,
            link=f"/admin/leads/bookings/{booking.id}",
        )


# ─── Misc ─────────────────────────────────────────────────────────────────


def _display_name_for(user: User) -> str:
    """Same resolution rule as `notifications_hub.resident_name_for`,
    inlined here to avoid an extra DB round-trip per admin in the
    fan-out loop."""
    parts = [p for p in (user.first_name, user.last_name) if p]
    return " ".join(parts) or user.email or str(user.id)


# Re-export the UUID type so route layer can type-hint without an
# extra import dance. Not strictly required but keeps the import
# surface symmetric with the other hubs.
__all__ = [
    "DiscoverBookingResponse",
    "EoiSubmissionResponse",
    "UUID",
    "create_discover_booking",
    "create_eoi",
]
