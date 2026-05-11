from functools import lru_cache

import jwt
from fastapi import HTTPException, Request
from jwt import PyJWKClient

from app.core.config import settings
from app.core.logging import logger


@lru_cache(maxsize=1)
def _get_jwks_client() -> PyJWKClient:
    return PyJWKClient(settings.CLERK_JWKS_URL, cache_keys=True)


class ClerkUser:
    """Represents an authenticated Clerk user pulled from a verified JWT."""

    def __init__(self, sub: str, email: str | None, claims: dict) -> None:
        self.id = sub
        self.email = email
        self.claims = claims


def verify_clerk_jwt(token: str) -> ClerkUser:
    try:
        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk uses authorized parties, not `aud`
        )
        return ClerkUser(
            sub=payload["sub"],
            email=payload.get("email"),
            claims=payload,
        )
    except jwt.PyJWTError as exc:
        logger.warning("jwt_verification_failed", error=str(exc))
        raise HTTPException(status_code=401, detail="Invalid token") from exc


async def get_current_user(request: Request) -> ClerkUser:
    """FastAPI dependency that requires a valid Clerk Bearer token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")
    token = auth_header.removeprefix("Bearer ").strip()
    return verify_clerk_jwt(token)


async def get_current_user_optional(request: Request) -> ClerkUser | None:
    """Like `get_current_user` but returns None for anonymous requests."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.removeprefix("Bearer ").strip()
    try:
        return verify_clerk_jwt(token)
    except HTTPException:
        return None
