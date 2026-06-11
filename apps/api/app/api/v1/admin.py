"""Admin-only routes.

Currently surfaces the Discover funnel leads (EOI submissions + visit
bookings) to authorized admin / super_admin users. Other admin
surfaces — service requests, gate operations, etc. — live in their
own routers; this file is the Leads Hub backend specifically.

Authorization model:
    `require_admin` resolves the Clerk-verified User row, then refuses
    anyone whose `role` isn't in {super_admin, admin}. A regular
    resident with a valid token still gets a 403, distinguishing
    "unauthenticated" (401, from get_current_user) from "authenticated
    but not authorized" (403, from this dep).
"""

from __future__ import annotations

import uuid
from datetime import date as date_t
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, Header, HTTPException, Path, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthUser, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.logging import logger
from app.models.ops import DiscoverBooking as DiscoverBookingRow
from app.models.ops import EoiSubmission as EoiSubmissionRow
from app.models.user import User, UserRole
from app.schemas.amenities import (
    AmenityBookingDecision,
    AmenityBookingsList,
    AmenityBookingStatusUpdate,
)
from app.schemas.discover import (
    DiscoverBookingDecision,
    DiscoverBookingResponse,
    DiscoverBookingStatusUpdate,
    EoiSubmissionResponse,
)
from app.services import amenities_hub

router = APIRouter(prefix="/admin", tags=["admin"])

DbSession = Annotated[AsyncSession, Depends(get_db)]

_ADMIN_ROLES = (UserRole.super_admin, UserRole.admin)


async def require_admin(
    authorization: Annotated[str | None, Header()] = None,
    x_dev_admin: Annotated[str | None, Header(alias="x-dev-admin")] = None,
    session: AsyncSession = Depends(get_db),
) -> AuthUser:
    """Gate dep — requires admin / super_admin role.

    Two paths:

    1. **Strict** — the production path. Caller presents a valid Clerk
       bearer token; we resolve their User row and 403 anyone whose
       role isn't in {super_admin, admin}. Mirrors the
       `get_current_user` shape but tightened.

    2. **Dev bypass** — only when `APP_ENV=development` *and* the
       caller sets `X-Dev-Admin: true`. Returns a synthetic admin
       AuthUser so the admin frontend can drive the screen end-to-end
       without Clerk auth wired in. Production reads `APP_ENV` from
       settings and refuses to honor the header, so a stray dev header
       in prod traffic is harmless — the strict path still gates.

       The admin app sends this header on every admin/discover/* call;
       it's no-op in prod and unblocking in dev. Remove the call site
       (and this branch) once the admin app has real Clerk auth wired.
    """
    if settings.APP_ENV == "development" and x_dev_admin == "true":
        logger.warning("admin.dev_bypass", reason="X-Dev-Admin header honored in development")
        return AuthUser(
            db_user_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
            user_id="dev-admin-bypass",
            email="dev-admin@local",
            full_name="Dev Admin",
        )

    user = await get_current_user(authorization, session)
    role = await session.scalar(select(User.role).where(User.id == user.db_user_id))
    if role not in _ADMIN_ROLES:
        logger.warning(
            "admin.access_denied",
            user_id=str(user.db_user_id),
            role=str(role),
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return user


CurrentAdmin = Annotated[AuthUser, Depends(require_admin)]


# ─── Projections ──────────────────────────────────────────────────────────


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
        status=row.status,  # type: ignore[arg-type]
        adminNotes=row.admin_notes,
        createdAt=row.created_at.isoformat(),
    )


# ─── Routes ───────────────────────────────────────────────────────────────


@router.get(
    "/discover/eoi",
    response_model=list[EoiSubmissionResponse],
)
async def list_eoi(_user: CurrentAdmin, session: DbSession) -> list[EoiSubmissionResponse]:
    """Newest-first list of every EOI submission. No pagination yet —
    the demo's volume is well under a few hundred rows, and pagination
    adds shape the admin UI doesn't need until we cross that bar."""
    stmt = select(EoiSubmissionRow).order_by(desc(EoiSubmissionRow.created_at))
    result = await session.execute(stmt)
    return [_project_eoi(row) for row in result.scalars().all()]


@router.get(
    "/discover/bookings",
    response_model=list[DiscoverBookingResponse],
)
async def list_bookings(_user: CurrentAdmin, session: DbSession) -> list[DiscoverBookingResponse]:
    """Newest-first list of every Discover visit booking."""
    stmt = select(DiscoverBookingRow).order_by(desc(DiscoverBookingRow.created_at))
    result = await session.execute(stmt)
    return [_project_booking(row) for row in result.scalars().all()]


# ─── Approval workflow ────────────────────────────────────────────────────

# Compound shown in the WhatsApp message body. Lives here (not in the
# DB row) because every Discover booking belongs to the same demo
# compound; surface it from settings or a per-project lookup the day
# Stitch hosts more than one.
_COMPOUND_LABEL = "Madinet Masr"

_VISIT_LABELS_EN: dict[str, str] = {
    "showroom": "showroom visit",
    "onsite": "on-site walkthrough",
    "virtual": "virtual tour",
}

_STATUS_LABELS_EN: dict[str, str] = {
    "confirmed": "confirmed ✓",
    "rejected": "declined",
}


def _format_booking_date(d: date_t) -> str:
    """Human-friendly date for the WhatsApp body. Stays English to
    match the rest of the templated message; localized templates can
    branch on a future `?lang=` query param."""
    return d.strftime("%A, %d %B %Y")


def _compose_whatsapp_url(row: DiscoverBookingRow) -> str | None:
    """Build a click-to-message WhatsApp deep-link for the resident.

    Returns None if there's no phone on file — the admin will have to
    reach out via email instead. The phone is normalized to a digits-
    only `wa.me/` segment (the WhatsApp link spec requires this; the
    `+` and any separators are stripped)."""
    if not row.phone:
        return None
    digits = "".join(c for c in row.phone if c.isdigit())
    if not digits:
        return None

    visit = _VISIT_LABELS_EN.get(row.visit_type, "visit")
    status_label = _STATUS_LABELS_EN.get(row.status, row.status)
    date_label = _format_booking_date(row.booking_date)

    body = (
        f"Hello {row.name}, your {visit} request for {_COMPOUND_LABEL} on "
        f"{date_label} at {row.time_slot} has been {status_label}."
    )
    if row.admin_notes:
        body += f" Notes: {row.admin_notes}"
    return f"https://wa.me/{digits}?text={quote(body)}"


@router.patch(
    "/discover/bookings/{booking_id}/status",
    response_model=DiscoverBookingDecision,
)
async def update_booking_status(
    payload: DiscoverBookingStatusUpdate,
    _user: CurrentAdmin,
    session: DbSession,
    booking_id: Annotated[str, Path()],
) -> DiscoverBookingDecision:
    """Confirm or reject a Discover visit booking.

    Returns the updated row plus a `whatsappUrl` the admin can click
    to notify the resident. The URL is composed server-side because
    the backend has every piece of context (phone, name, project, date,
    final status) in one place — keeps the frontend a thin renderer
    without copying business-message rules across two languages of
    code.
    """
    try:
        pk = uuid.UUID(booking_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Booking not found") from exc

    row = await session.get(DiscoverBookingRow, pk)
    if row is None:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Double-booking guard: when flipping to `confirmed`, refuse if the
    # same advisor already owns a confirmed slot on the same date+time.
    # Bookings with no `advisor_name` (resident picked "Any advisor")
    # skip the check — the slot will be assigned to whoever is free at
    # the venue, so there's no specific advisor to double-book.
    if payload.status == "confirmed" and row.advisor_name:
        conflict_stmt = (
            select(DiscoverBookingRow.id)
            .where(DiscoverBookingRow.advisor_name == row.advisor_name)
            .where(DiscoverBookingRow.booking_date == row.booking_date)
            .where(DiscoverBookingRow.time_slot == row.time_slot)
            .where(DiscoverBookingRow.status == "confirmed")
            .where(DiscoverBookingRow.id != row.id)
            .limit(1)
        )
        conflict = await session.scalar(conflict_stmt)
        if conflict is not None:
            logger.warning(
                "discover.booking.double_booking_blocked",
                advisor=row.advisor_name,
                date=row.booking_date.isoformat(),
                slot=row.time_slot,
                blocked_id=str(row.id),
                conflict_id=str(conflict),
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This advisor already has a confirmed booking at this date and time.",
            )

    previous = row.status
    row.status = payload.status
    if payload.adminNotes is not None:
        clean = payload.adminNotes.strip()
        row.admin_notes = clean or None

    await session.commit()
    await session.refresh(row)
    projected = _project_booking(row)

    whatsapp_url = _compose_whatsapp_url(row)
    logger.info(
        "discover.booking.decision",
        id=projected.id,
        from_status=previous,
        to_status=payload.status,
        has_notes=bool(row.admin_notes),
        has_whatsapp=whatsapp_url is not None,
    )
    return DiscoverBookingDecision(booking=projected, whatsappUrl=whatsapp_url)


# ─── Amenity bookings (Mala'eb / المرافق approval workflow) ───────────────


_AMENITY_STATUS_LABELS_EN: dict[str, str] = {
    "confirmed": "confirmed ✓",
    "rejected": "declined",
}


def _humanize_amenity_name(slug: str) -> str:
    """Turn `tennis_court_1` → `Tennis Court 1` so the WhatsApp body
    reads naturally without renaming the seed slugs."""
    return slug.replace("_", " ").title()


def _compose_amenity_whatsapp_url(
    *,
    resident_name: str,
    resident_phone: str | None,
    amenity_slug: str,
    booking_date: date_t,
    time_slot: str,
    decision: str,
    admin_notes: str | None,
) -> str | None:
    """Build a click-to-message WhatsApp link for the resident.

    Body matches the spec exactly:
        "Hello [Resident], your booking for [Amenity] on [Date] at
         [Time] is confirmed! ✓"
    plus admin notes when present and a fallback line for rejections.
    """
    if not resident_phone:
        return None
    digits = "".join(c for c in resident_phone if c.isdigit())
    if not digits:
        return None

    amenity_label = _humanize_amenity_name(amenity_slug)
    date_label = booking_date.strftime("%A, %d %B %Y")
    if decision == "confirmed":
        body = (
            f"Hello {resident_name}, your booking for {amenity_label} on "
            f"{date_label} at {time_slot} is confirmed! ✓"
        )
    else:
        body = (
            f"Hello {resident_name}, unfortunately your booking for "
            f"{amenity_label} on {date_label} at {time_slot} was declined."
        )
    if admin_notes:
        body += f" Notes: {admin_notes}"
    return f"https://wa.me/{digits}?text={quote(body)}"


@router.get(
    "/amenities/bookings",
    response_model=AmenityBookingsList,
)
async def list_amenity_bookings(_user: CurrentAdmin, session: DbSession) -> AmenityBookingsList:
    """Newest-first list of every amenity booking. Drives the admin
    Leads Hub amenity table."""
    items = await amenities_hub.list_bookings(session)
    return AmenityBookingsList(items=items)


@router.patch(
    "/amenities/bookings/{booking_id}/status",
    response_model=AmenityBookingDecision,
)
async def update_amenity_booking_status(
    payload: AmenityBookingStatusUpdate,
    _user: CurrentAdmin,
    session: DbSession,
    booking_id: Annotated[str, Path()],
) -> AmenityBookingDecision:
    """Confirm or reject an amenity booking.

    Asset-lock guard: when `status='confirmed'`, refuses if any other
    booking already holds the same (amenity_id, booking_date, time_slot)
    tuple in `confirmed` state. 409 with the spec-mandated message
    lets the admin re-assign without losing typed notes.
    """
    try:
        projected, row, amenity = await amenities_hub.update_booking_status(
            session,
            booking_id=booking_id,
            new_status=payload.status,
            admin_notes=payload.adminNotes,
        )
    except amenities_hub.BookingNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Booking not found") from exc
    except amenities_hub.SlotLockedError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This amenity slot is already confirmed for another "
                f"booking ({exc.time_slot} on {exc.booking_date.isoformat()})."
            ),
        ) from exc

    whatsapp_url = _compose_amenity_whatsapp_url(
        resident_name=projected.residentName,
        resident_phone=projected.residentPhone,
        amenity_slug=amenity.name,
        booking_date=row.booking_date,
        time_slot=projected.timeSlot,
        decision=payload.status,
        admin_notes=row.admin_notes,
    )
    logger.info(
        "amenity_booking.decision_returned",
        id=projected.id,
        to_status=payload.status,
        has_whatsapp=whatsapp_url is not None,
    )
    return AmenityBookingDecision(booking=projected, whatsappUrl=whatsapp_url)
