"""Discover funnel routes — public/guest-allowed lead intake.

    POST /api/v1/discover/eoi        — Expression of Interest
    POST /api/v1/discover/bookings   — Showroom / onsite / virtual visit

Both endpoints accept anonymous payloads (no `get_current_user`
dependency). A prospect signing up doesn't yet have a Clerk session,
and gating the lead-capture form behind sign-in would lose ~70% of the
funnel — the form's whole job is to convert anonymous traffic into
identified leads.

On success, each route fires an admin notification per admin user
(see `discover_hub`). The notification carries the lead's name +
interest summary so a sales-ops admin can triage from the bell without
opening the row.
"""

from __future__ import annotations

from datetime import date as date_t
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.ops import DiscoverBooking as DiscoverBookingRow
from app.schemas.discover import (
    DiscoverBookingCreate,
    DiscoverBookingResponse,
    EoiSubmissionCreate,
    EoiSubmissionResponse,
)
from app.services import discover_hub

router = APIRouter(prefix="/discover", tags=["discover"])

DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.post(
    "/eoi",
    response_model=EoiSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_eoi(payload: EoiSubmissionCreate, session: DbSession) -> EoiSubmissionResponse:
    return await discover_hub.create_eoi(session, payload=payload)


@router.post(
    "/bookings",
    response_model=DiscoverBookingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_discover_booking(
    payload: DiscoverBookingCreate, session: DbSession
) -> DiscoverBookingResponse:
    return await discover_hub.create_discover_booking(session, payload=payload)


class BusySlotsResponse(BaseModel):
    """List of confirmed time slots for an advisor on a specific day.

    Returned shape: `{ "slots": ["10:00", "14:00", ...] }`. Resident
    frontend feeds this into `TimeSlotPicker` so a prospect literally
    can't pick a slot the advisor's already locked.
    """

    slots: list[str]


@router.get(
    "/bookings/busy-slots",
    response_model=BusySlotsResponse,
)
async def list_busy_slots(
    session: DbSession,
    # `date` matches the bookingDate field shape used everywhere else
    # in the Discover schemas (YYYY-MM-DD).
    booking_date: Annotated[
        str,
        Query(
            alias="date",
            description="ISO calendar day YYYY-MM-DD.",
            pattern=r"^\d{4}-\d{2}-\d{2}$",
        ),
    ],
    advisor_name: Annotated[
        str | None,
        Query(
            alias="advisor_name",
            description="Advisor display name. Omit / blank → empty result.",
            max_length=120,
        ),
    ] = None,
) -> BusySlotsResponse:
    """Public read — no auth. The resident frontend hits this whenever
    the user picks a date + advisor to know which slots to grey out.

    Returns an empty list when `advisor_name` is omitted or blank: the
    booking model is "any advisor" → no specific person to collide
    with, so no slot is off-limits from this endpoint's perspective.
    """
    if not advisor_name or not advisor_name.strip():
        return BusySlotsResponse(slots=[])

    day = date_t.fromisoformat(booking_date)
    stmt = (
        select(DiscoverBookingRow.time_slot)
        .where(DiscoverBookingRow.advisor_name == advisor_name.strip())
        .where(DiscoverBookingRow.booking_date == day)
        .where(DiscoverBookingRow.status == "confirmed")
    )
    result = await session.execute(stmt)
    # `set` → list keeps the response payload small if multiple rows
    # land on the same slot somehow (shouldn't, but defensive).
    return BusySlotsResponse(slots=sorted(set(result.scalars().all())))
