"""Pydantic schemas for the live feed (Week-7 stand-in for posts + reels).

These mirror the admin app's `AdminFeedItem` discriminated union: a `post`
includes slides; a `reel` includes title + description + visualKind. The
discriminator field is `kind`. We keep both shapes intentionally loose so
the admin can publish without round-tripping through the DB-backed schemas
that aren't wired yet.
"""
# ruff: noqa: N815  -- camelCase field names mirror the wire-format used by
#                      the admin/web TypeScript clients.

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

PostCategory = Literal["events", "news", "announcements", "community"]
ReelVisualKind = Literal["water", "zen", "fire", "leaves", "sparkle"]
FeedItemStatus = Literal["draft", "scheduled", "live"]


class PostSlide(BaseModel):
    bg: str
    emoji: str | None = None
    title: str
    sub: str | None = None
    imageUrl: str | None = None


class PostCreateInput(BaseModel):
    """Admin → API: new post payload."""

    model_config = ConfigDict(extra="forbid")

    kind: Literal["post"]
    category: PostCategory
    caption: str = Field(min_length=1)
    slides: list[PostSlide] = Field(min_length=1)
    pinned: bool = False
    isEvent: bool = False
    status: FeedItemStatus = "live"
    authorName: str


class ReelCreateInput(BaseModel):
    """Admin → API: new reel payload."""

    model_config = ConfigDict(extra="forbid")

    kind: Literal["reel"]
    category: PostCategory
    title: str = Field(min_length=1)
    description: str
    visualKind: ReelVisualKind
    status: FeedItemStatus = "live"
    authorName: str


FeedItemCreateInput = Annotated[
    PostCreateInput | ReelCreateInput,
    Field(discriminator="kind"),
]


class PostResponse(PostCreateInput):
    id: str
    publishedAt: str


class ReelResponse(ReelCreateInput):
    id: str
    publishedAt: str


FeedItemResponse = Annotated[
    PostResponse | ReelResponse,
    Field(discriminator="kind"),
]


class FeedListResponse(BaseModel):
    items: list[FeedItemResponse]
