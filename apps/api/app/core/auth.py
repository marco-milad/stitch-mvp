"""Clerk JWT verification + just-in-time user provisioning.

Strict bearer-token auth — the JWT is verified against Clerk's JWKS
(cached by PyJWKClient). A missing or invalid token is always 401.

On every successful verify, the `users` table is upserted by
`clerk_id`. The row that comes back is the canonical resident identity
for the rest of the request: filter `maintenance_requests.user_id`
against `current_user.db_user_id`, etc.
"""

from __future__ import annotations

import uuid
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, WebSocket, status
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientError
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal, get_db
from app.core.logging import logger
from app.models.user import User, UserRole


class AuthUser(BaseModel):
    """Identity for one verified request.

    `db_user_id` is the `users.id` PK — what every domain table FKs to.
    `user_id` keeps the Clerk `sub` for audit logs and JWT-only flows.
    """

    db_user_id: uuid.UUID
    user_id: str
    email: str | None = None
    full_name: str | None = None


_jwks_client = PyJWKClient(settings.CLERK_JWKS_URL)


def _verify_token(token: str) -> dict[str, object]:
    signing_key = _jwks_client.get_signing_key_from_jwt(token).key
    return jwt.decode(
        token,
        signing_key,
        algorithms=["RS256"],
        options={"verify_aud": False},
    )


def _extract_bearer(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return parts[1].strip()


def _claims_identity(claims: dict[str, object]) -> tuple[str, str | None, str | None]:
    """Pull (sub, email, full_name) out of the verified JWT."""
    sub = claims.get("sub")
    if not isinstance(sub, str) or not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing `sub` claim",
        )
    email = claims.get("email")
    name = claims.get("name") or claims.get("full_name")
    return (
        sub,
        email if isinstance(email, str) else None,
        name if isinstance(name, str) else None,
    )


async def _upsert_user(
    session: AsyncSession,
    clerk_sub: str,
    email: str | None,
    full_name: str | None,
) -> User:
    """Three-phase upsert keyed on (clerk_id, email).

    The original implementation did `ON CONFLICT (clerk_id) DO UPDATE`,
    which silently 500'd whenever someone re-registered in Clerk with
    the same email but a fresh `clerk_id`. The unique index on `email`
    fired before the `clerk_id` conflict resolver could rescue it.

    The three phases:
        1. **Match by clerk_id** — the steady-state path. Existing
           resident signs in, we refresh their email + name in case
           they edited them in Clerk.
        2. **Match by email** (different clerk_id) — the "re-link"
           path. The user was deleted in Clerk and re-created with the
           same email, or signed up via a different OAuth provider.
           Treat as the same person: re-key the row onto the new
           clerk_id so all their historical maintenance tickets,
           service bookings, units, etc. stay attached.
        3. **Fresh resident** — INSERT a new row.

    Concurrent first-time calls under heavy load could still race
    (TOCTOU between SELECT and INSERT), but the calling code holds a
    per-request session, and a duplicate signup at exact-same-instant
    is rare enough that we accept the small theoretical 500. The
    important correctness property — that re-registrations don't bork
    the upsert — is now guaranteed.
    """
    first, last = _split_name(full_name)
    # Email must be non-null per the User model; fall back to a stable
    # synthetic value when Clerk didn't put it on the token. The user can
    # always re-link later when a real email lands in the claims.
    safe_email = email or f"{clerk_sub}@no-email.clerk"

    # Phase 1: existing resident, primary identity unchanged.
    existing = await session.scalar(select(User).where(User.clerk_id == clerk_sub))
    if existing is not None:
        existing.email = safe_email
        # Preserve a previously-stored real name when the current JWT
        # arrives with a nullish placeholder — never regress a good
        # name back to None just because Clerk briefly emitted "null".
        # Also self-heal rows poisoned by the pre-sanitizer code (which
        # persisted "null"/"undefined" as literal strings) by stripping
        # them on the next sign-in.
        existing.first_name = first or _sanitize_name_part(existing.first_name)
        existing.last_name = last or _sanitize_name_part(existing.last_name)
        await session.commit()
        await session.refresh(existing)
        return existing

    # Phase 2: same email, new Clerk identity → re-link the orphan row.
    by_email = await session.scalar(select(User).where(User.email == safe_email))
    if by_email is not None:
        previous_clerk = by_email.clerk_id
        by_email.clerk_id = clerk_sub
        # Same preserve-good / strip-poison rule as Phase 1.
        by_email.first_name = first or _sanitize_name_part(by_email.first_name)
        by_email.last_name = last or _sanitize_name_part(by_email.last_name)
        await session.commit()
        await session.refresh(by_email)
        logger.info(
            "auth.user.relinked",
            from_clerk_id=previous_clerk,
            to_clerk_id=clerk_sub,
            email=safe_email,
        )
        return by_email

    # Phase 3: brand-new resident.
    new_user = User(
        clerk_id=clerk_sub,
        email=safe_email,
        first_name=first,
        last_name=last,
        role=UserRole.resident,
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    logger.info(
        "auth.user.created",
        clerk_id=clerk_sub,
        email=safe_email,
    )
    return new_user


_NULLISH_NAME_VALUES = frozenset({"", "null", "undefined", "none", "nan"})


def _sanitize_name_part(value: str | None) -> str | None:
    """Treat literal sentinel strings (`"null"`, `"undefined"`, etc.) as
    missing. Clerk's session-token template can emit `name: "null null"`
    when first_name + last_name are both empty on the user record — that
    string then propagates verbatim into our DB unless we filter it.
    Comparison is case-insensitive and ignores leading/trailing whitespace
    so `"  NULL  "` and `"null"` are equally caught."""
    if value is None:
        return None
    stripped = value.strip()
    if stripped.casefold() in _NULLISH_NAME_VALUES:
        return None
    return stripped


def _split_name(full_name: str | None) -> tuple[str | None, str | None]:
    """Split a Clerk-provided full name into (first, last), sanitizing
    null-shaped placeholders away so downstream code never persists
    `first_name="null"` to the DB."""
    sanitized = _sanitize_name_part(full_name)
    if not sanitized:
        return (None, None)
    parts = sanitized.split(None, 1)
    first = _sanitize_name_part(parts[0])
    last = _sanitize_name_part(parts[1]) if len(parts) > 1 else None
    return (first, last)


def _to_auth_user(row: User) -> AuthUser:
    full = " ".join(p for p in (row.first_name, row.last_name) if p) or None
    return AuthUser(
        db_user_id=row.id,
        user_id=row.clerk_id,
        email=row.email,
        full_name=full,
    )


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    session: AsyncSession = Depends(get_db),
) -> AuthUser:
    """FastAPI dependency: verify the bearer token, upsert by `clerk_id`,
    return the resolved DB user.

    Raises 401 on missing/malformed header, expired token, bad signature,
    missing `sub`. JIT-provisions the `users` row on first sign-in.
    """
    token = _extract_bearer(authorization)
    try:
        claims = _verify_token(token)
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except (jwt.InvalidTokenError, PyJWKClientError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    sub, email, full_name = _claims_identity(claims)
    row = await _upsert_user(session, sub, email, full_name)
    return _to_auth_user(row)


async def get_current_user_ws(websocket: WebSocket) -> AuthUser | None:
    """WebSocket variant. Reads token from `?token=` or `Authorization`.
    Opens its own short-lived session for the upsert — WS lifetime is
    open-ended, so we can't piggyback on a per-request session.

    Returns None and closes with code 4401 on any failure. Callers should
    `return` immediately on None.
    """
    token = websocket.query_params.get("token")
    if not token:
        auth_header = websocket.headers.get("authorization")
        if auth_header:
            try:
                token = _extract_bearer(auth_header)
            except HTTPException:
                token = None
    if not token:
        await websocket.close(code=4401, reason="Missing token")
        return None
    try:
        claims = _verify_token(token)
    except (jwt.InvalidTokenError, PyJWKClientError):
        await websocket.close(code=4401, reason="Invalid token")
        return None
    try:
        sub, email, full_name = _claims_identity(claims)
    except HTTPException:
        await websocket.close(code=4401, reason="Token missing sub")
        return None

    async with AsyncSessionLocal() as session:
        row = await _upsert_user(session, sub, email, full_name)
        return _to_auth_user(row)
