"""Amenities routes.

    GET   /api/v1/amenities         — list active amenities (no auth)
    POST  /api/v1/amenities/book    — resident books a time block (auth)

The list endpoint is intentionally unauthenticated for the MVP: the
catalog is non-sensitive (names + capacity numbers) and lives on the
public landing surface before the resident signs in to actually book.
If the catalog later carries pricing tiers tied to membership it
should re-acquire the `get_current_user` dependency.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthUser, get_current_user
from app.core.database import get_db
from app.schemas.amenities import (
    AmenitiesList,
    AmenityBookingCreateInput,
    AmenityBookingResponse,
)
from app.services import amenities_hub, requests_hub

router = APIRouter()

CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/amenities", response_model=AmenitiesList, tags=["amenities"])
async def list_amenities(session: DbSession) -> AmenitiesList:
    items = await amenities_hub.list_active_amenities(session)
    return AmenitiesList(items=items)


@router.post(
    "/amenities/book",
    response_model=AmenityBookingResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["amenities"],
)
async def book_amenity(
    payload: AmenityBookingCreateInput,
    user: CurrentUser,
    session: DbSession,
) -> AmenityBookingResponse:
    unit_id = await requests_hub.primary_unit_id_for(session, user.db_user_id)
    try:
        return await amenities_hub.create_booking(
            session,
            user_id=user.db_user_id,
            unit_id=unit_id,
            payload=payload,
        )
    except amenities_hub.AmenityNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except amenities_hub.CapacityExceededError as exc:
        # 409 lets the frontend distinguish a capacity collision from a
        # 422 schema-shape failure or a 500 server error, so it can show
        # a tailored "this slot just filled" message.
        raise HTTPException(status_code=409, detail=str(exc)) from exc
