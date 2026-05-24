"""Resident notification schemas.

A notification is a derived projection of a domain event (ticket dispatched,
visitor pass scanned, etc.) into a row residents see in their notifications
center. Bodies are bilingual (en + ar) so the client can render the user's
current language without an extra round-trip — the backend already knows
the data, so it generates both strings at emission time.
"""
# ruff: noqa: N815  -- camelCase mirrors the wire-format used by the web client.

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

NotificationKind = Literal[
    "ticket_created",
    "ticket_dispatched",
    "ticket_resolved",
]


class NotificationBody(BaseModel):
    en: str
    ar: str


class Notification(BaseModel):
    id: str
    kind: NotificationKind
    title: NotificationBody
    body: NotificationBody
    createdAt: str  # ISO 8601 with TZ
    link: str | None = None  # client-side route to deep-link into


class NotificationsList(BaseModel):
    items: list[Notification]
