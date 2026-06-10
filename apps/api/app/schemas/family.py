"""Pydantic schemas for the Family & Residents Hub.

Wire-format mirrors the existing resident-side schemas (camelCase, ISO
timestamps). Persistence lives in `app.services.family_hub`, routed
under `/me/family`.

`relationship` is a Literal union to keep the API surface tight, but
the DB column is a free string so adding "guardian" / "live-in helper"
later doesn't require an enum migration — just a schema bump.
"""
# ruff: noqa: N815  -- camelCase mirrors the wire-format used by the resident client.

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

FamilyRelationship = Literal["spouse", "child", "parent", "tenant", "other"]


def _normalize_phone(value: str) -> str:
    """Strip every character that isn't a digit or a leading `+`.

    The (unit_id, phone) UNIQUE constraint catches dupes regardless of
    formatting, but normalizing on the way in also gives the gate UI a
    predictable shape to dial / SMS. Examples:

        "+20 123 456 7890"  → "+201234567890"
        "(010) 555-1234"    → "0105551234"
    """
    if not value:
        return value
    stripped = value.strip()
    if not stripped:
        return ""
    has_plus = stripped.startswith("+")
    digits = "".join(c for c in stripped if c.isdigit())
    return f"+{digits}" if has_plus else digits


class FamilyMember(BaseModel):
    """Outbound projection of a family member row."""

    id: str
    name: str
    phone: str
    relationship: FamilyRelationship
    unitId: str
    createdAt: str  # ISO 8601 with TZ


class FamilyMembersList(BaseModel):
    items: list[FamilyMember]


class FamilyMemberCreate(BaseModel):
    """Resident → API: POST /me/family payload."""

    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=4, max_length=32)
    relationship: FamilyRelationship

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("name must not be blank")
        return stripped

    @field_validator("phone")
    @classmethod
    def _normalize_and_validate_phone(cls, v: str) -> str:
        normalized = _normalize_phone(v)
        # At least 4 digits — enough to disambiguate, short enough that
        # internal extensions ("Apt 4 ext. 21") still pass. The strict
        # E.164 validation lives at the SMS-send layer where it matters.
        digit_count = sum(1 for c in normalized if c.isdigit())
        if digit_count < 4:
            raise ValueError("phone must contain at least 4 digits")
        return normalized
