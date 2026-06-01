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
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal, get_db
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
    """Idempotent: upsert by clerk_id, return the row.

    First-time sign-in lands here with no existing row — INSERT. Repeat
    sign-ins refresh email/name in case the user changed them in Clerk.
    Concurrent first-time calls race safely via ON CONFLICT.
    """
    first, last = _split_name(full_name)
    # Email must be non-null per the User model; fall back to a stable
    # synthetic value when Clerk didn't put it on the token. The user can
    # always re-link later when a real email lands in the claims.
    safe_email = email or f"{clerk_sub}@no-email.clerk"

    stmt = (
        pg_insert(User)
        .values(
            clerk_id=clerk_sub,
            email=safe_email,
            first_name=first,
            last_name=last,
            role=UserRole.resident,
        )
        .on_conflict_do_update(
            index_elements=["clerk_id"],
            set_={"email": safe_email, "first_name": first, "last_name": last},
        )
        .returning(User)
    )
    result = await session.execute(stmt)
    user = result.scalar_one()
    await session.commit()
    return user


def _split_name(full_name: str | None) -> tuple[str | None, str | None]:
    if not full_name:
        return (None, None)
    parts = full_name.strip().split(None, 1)
    if len(parts) == 1:
        return (parts[0], None)
    return (parts[0], parts[1])


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
