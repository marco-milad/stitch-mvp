"""24/7 maintenance slot availability — public read-only route.

Powers the resident frontend's slot picker: pick a date → fetch the
8-slot availability snapshot → render the grid with full slots
disabled. No auth gate (no PII in the response — just per-slot
booking counts), no rate limiting on this MVP.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.maintenance import MaintenanceAvailabilityResponse, MaintenanceSlot
from app.services import maintenance_slots

router = APIRouter()

DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.get(
    "/maintenance/availability",
    response_model=MaintenanceAvailabilityResponse,
    tags=["maintenance"],
)
async def get_maintenance_availability(
    session: DbSession,
    category: Annotated[
        str,
        Query(
            description=(
                "Maintenance category to count against. One of: ac, plumbing, "
                "electrical, cleaning, pest, other. Unknown values return all "
                "slots available — the counter just doesn't find any matching "
                "tickets."
            ),
            min_length=1,
            max_length=32,
        ),
    ],
    date_iso: Annotated[
        str,
        Query(
            description="ISO calendar day in YYYY-MM-DD form.",
            pattern=r"^\d{4}-\d{2}-\d{2}$",
            alias="date_iso",
        ),
    ],
) -> MaintenanceAvailabilityResponse:
    rows = await maintenance_slots.availability_for(
        session,
        category=category,
        date_iso=date_iso,
    )
    return MaintenanceAvailabilityResponse(
        category=category,
        dateIso=date_iso,
        capacityPerSlot=maintenance_slots.CAPACITY_PER_SLOT,
        slots=[MaintenanceSlot(**row) for row in rows],
    )
