"""Family & Residents Hub data layer.

Two responsibilities:

1. **Read.** `list_for_unit` projects `family_members` rows for the
   resident's primary unit into the wire-format `FamilyMember`.
2. **Write.** `create_member` enforces phone uniqueness within the
   unit (the table's UNIQUE constraint is the source of truth; we
   pre-check for a friendly 409 instead of bubbling up the raw
   IntegrityError).

Phone is already normalized by the Pydantic schema before it reaches
the hub — `_normalize_phone` in `app.schemas.family`. The hub only
deals with already-clean values.
"""

from __future__ import annotations

import uuid

from sqlalchemy import asc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models.ops import FamilyMember as FamilyMemberRow
from app.schemas.family import FamilyMember, FamilyMemberCreate


class NoUnitForUserError(Exception):
    """Raised when the requesting user has no primary unit assigned.

    The Family hub is unit-scoped, so without a unit there's nothing
    sensible to list against and no FK target for an INSERT. Route
    layer maps this to a 400 with an actionable message ("set your
    primary unit first")."""


class DuplicatePhoneError(Exception):
    """Raised when the (unit_id, phone) pair already exists.

    Distinct from the schema's basic phone-shape validation so the
    route can map it to a 409 Conflict — the client treats this as a
    "this person is already on the roster" hint rather than a "bad
    phone format" correction."""


# ─── Projection ──────────────────────────────────────────────────────────


def _project(row: FamilyMemberRow) -> FamilyMember:
    return FamilyMember(
        id=str(row.id),
        name=row.name,
        phone=row.phone,
        relationship=row.relationship,  # type: ignore[arg-type]
        unitId=str(row.unit_id),
        createdAt=row.created_at.isoformat(),
    )


# ─── Reads ───────────────────────────────────────────────────────────────


async def list_for_unit(session: AsyncSession, *, unit_id: uuid.UUID) -> list[FamilyMember]:
    """Oldest-first so the resident sees long-standing members at the
    top of the roster — matches how someone mentally tracks "Mom, then
    spouse, then kids in order of arrival"."""
    stmt = (
        select(FamilyMemberRow)
        .where(FamilyMemberRow.unit_id == unit_id)
        .order_by(asc(FamilyMemberRow.created_at))
    )
    result = await session.execute(stmt)
    return [_project(row) for row in result.scalars().all()]


# ─── Mutations ───────────────────────────────────────────────────────────


async def create_member(
    session: AsyncSession,
    *,
    primary_user_id: uuid.UUID,
    unit_id: uuid.UUID,
    payload: FamilyMemberCreate,
) -> FamilyMember:
    """Insert a new family member, gated on phone uniqueness within the
    unit. Pre-check + try/except double-bag — the pre-check gives a
    fast 409 in the steady state; the IntegrityError catch protects
    against the rare race where two concurrent POSTs slip past the
    check."""
    existing = await session.scalar(
        select(FamilyMemberRow.id)
        .where(FamilyMemberRow.unit_id == unit_id)
        .where(FamilyMemberRow.phone == payload.phone)
    )
    if existing is not None:
        raise DuplicatePhoneError(payload.phone)

    row = FamilyMemberRow(
        primary_user_id=primary_user_id,
        unit_id=unit_id,
        name=payload.name,
        phone=payload.phone,
        relationship=payload.relationship,
    )
    session.add(row)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        # The only realistic IntegrityError here is the unique
        # constraint racing the pre-check. Anything else (e.g. FK
        # violation) is a programmer bug worth bubbling up.
        if "uq_family_members_unit_phone" in str(exc.orig):
            raise DuplicatePhoneError(payload.phone) from exc
        raise

    await session.refresh(row)
    projected = _project(row)
    logger.info(
        "family_member.created",
        id=projected.id,
        unit_id=str(unit_id),
        relationship=projected.relationship,
    )
    return projected
