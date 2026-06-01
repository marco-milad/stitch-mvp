"""Clerk JWT verification.

Strict bearer-token auth. The token signature is verified against Clerk's
JWKS (cached by PyJWKClient). No demo bypass — a missing or invalid token
is always 401.

Identity model:
    AuthUser.user_id    Clerk `sub` claim — stable per-Clerk-user identifier
    AuthUser.email      `email` claim if present
    AuthUser.full_name  `name` / `full_name` claim if present in the JWT template

The legacy /me/* routes filter demo data by `residentName` (a display name
string). `resident_identity()` projects the JWT down to that string so the
existing hubs keep working unchanged. Today the projection is full_name →
email → user_id, which means a user only sees demo tickets if their Clerk
profile name happens to match the demo resident (e.g. "Lina Mostafa"). The
proper fix — a Clerk-id → resident-record mapping table — is downstream.
"""

from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import Header, HTTPException, WebSocket, status
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientError
from pydantic import BaseModel

from app.core.config import settings


class AuthUser(BaseModel):
    user_id: str
    email: str | None = None
    full_name: str | None = None


_jwks_client = PyJWKClient(settings.CLERK_JWKS_URL)


def _verify_token(token: str) -> dict[str, object]:
    signing_key = _jwks_client.get_signing_key_from_jwt(token).key
    # `aud` isn't set by Clerk's default session template; verifying it
    # would break valid tokens. `iss` we could pin to the Clerk frontend
    # API host, but that requires another config var — defer.
    return jwt.decode(
        token,
        signing_key,
        algorithms=["RS256"],
        options={"verify_aud": False},
    )


def _user_from_claims(claims: dict[str, object]) -> AuthUser:
    sub = claims.get("sub")
    if not isinstance(sub, str) or not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing `sub` claim",
        )
    email = claims.get("email")
    name = claims.get("name") or claims.get("full_name")
    return AuthUser(
        user_id=sub,
        email=email if isinstance(email, str) else None,
        full_name=name if isinstance(name, str) else None,
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


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> AuthUser:
    """FastAPI dependency: verify the bearer token and return the caller.

    Raises 401 on any failure — missing header, malformed header, expired
    token, bad signature, missing `sub`. No fallbacks.
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
        # PyJWKClientError covers unknown `kid` and JWKS-fetch failures —
        # neither subclasses InvalidTokenError, so they need a separate arm.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    return _user_from_claims(claims)


async def get_current_user_ws(websocket: WebSocket) -> AuthUser | None:
    """WebSocket variant: pull the token from `?token=` (browser-friendly) or
    the `Authorization` header (mobile-friendly), verify, return the user.

    Returns None and closes the socket with code 4401 if auth fails. Callers
    should `return` immediately after a None.
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
        return _user_from_claims(claims)
    except HTTPException:
        await websocket.close(code=4401, reason="Token missing sub")
        return None


def resident_identity(user: AuthUser) -> str:
    """Project the auth user down to the legacy string identity used by hubs.

    See module docstring for the migration plan.
    """
    return user.full_name or user.email or user.user_id
