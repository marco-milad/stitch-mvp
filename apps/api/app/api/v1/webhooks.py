"""Clerk webhook receiver.

    POST /api/v1/webhooks/clerk
        Receives `user.created` / `user.updated` (and the rest, ignored)
        from Clerk Dashboard → Webhooks. Verifies the svix signature,
        then upserts the user into our `users` table so the resident's
        profile shows up immediately after sign-up — no JIT round-trip
        on first /me/* call needed.

Signature verification:
    Clerk uses the standard webhooks spec (svix). Three headers
    accompany every request:
        svix-id          unique event id
        svix-timestamp   unix seconds
        svix-signature   base64 HMAC-SHA256 over `id.timestamp.body`

    The svix Python SDK does the full verification dance: it rejects
    replays older than 5 minutes, constant-time compares signatures,
    and rotates correctly through multiple signing keys when configured.

    `CLERK_WEBHOOK_SECRET` is read from settings. If it's unset (local
    dev) we accept all bodies with a warning log — convenient for
    replaying captured fixtures through curl. NEVER deploy with it
    unset; the production check below refuses to process without it.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from svix.webhooks import Webhook, WebhookVerificationError

from app.core.auth import _sanitize_name_part
from app.core.config import settings
from app.core.database import get_db
from app.core.logging import logger
from app.models.user import User, UserRole

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

DbSession = Annotated[AsyncSession, Depends(get_db)]

# Clerk webhook event types we care about. Everything else (organization
# events, session events, etc.) is acknowledged with a 200 OK + ignored
# so Clerk's retry queue doesn't fill up against our endpoint.
_HANDLED_EVENTS = frozenset({"user.created", "user.updated"})


def _verify_signature(
    body: bytes,
    *,
    svix_id: str,
    svix_timestamp: str,
    svix_signature: str,
) -> dict[str, Any]:
    """Verify the svix signature and return the parsed event payload.
    Raises HTTPException(401) on signature failure; HTTPException(500)
    when the secret is missing in production.

    In `APP_ENV=development` with no secret configured, we log a warning
    and skip verification — this lets a developer replay a captured
    Clerk fixture without setting up ngrok + a Clerk dev endpoint.
    """
    secret = settings.CLERK_WEBHOOK_SECRET
    if not secret:
        if settings.APP_ENV != "development":
            logger.error("clerk.webhook.secret_missing", env=settings.APP_ENV)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Webhook secret not configured",
            )
        logger.warning(
            "clerk.webhook.signature_skipped",
            reason="CLERK_WEBHOOK_SECRET unset in development",
        )
        # Parse the body ourselves since svix.Webhook.verify() also does
        # the JSON load + returns the dict.
        import json

        try:
            return json.loads(body)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Body is not valid JSON") from exc

    try:
        wh = Webhook(secret)
        return wh.verify(
            body,
            {
                "svix-id": svix_id,
                "svix-timestamp": svix_timestamp,
                "svix-signature": svix_signature,
            },
        )
    except WebhookVerificationError as exc:
        logger.warning(
            "clerk.webhook.signature_invalid",
            svix_id=svix_id,
            error=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        ) from exc


# ─── Payload parsing ──────────────────────────────────────────────────────


def _primary_email(data: dict[str, Any]) -> str | None:
    """Pull the primary email out of Clerk's user payload.

    Clerk emits `email_addresses` as a list of {id, email_address, ...}
    plus a `primary_email_address_id` pointing at the canonical one.
    Fall back to the first entry if the primary id is missing.
    """
    primary_id = data.get("primary_email_address_id")
    addresses = data.get("email_addresses")
    if not isinstance(addresses, list) or not addresses:
        return None
    for entry in addresses:
        if isinstance(entry, dict) and entry.get("id") == primary_id:
            v = entry.get("email_address")
            return v if isinstance(v, str) and v else None
    first = addresses[0]
    if isinstance(first, dict):
        v = first.get("email_address")
        return v if isinstance(v, str) and v else None
    return None


def _primary_phone(data: dict[str, Any]) -> str | None:
    primary_id = data.get("primary_phone_number_id")
    numbers = data.get("phone_numbers")
    if not isinstance(numbers, list) or not numbers:
        return None
    for entry in numbers:
        if isinstance(entry, dict) and entry.get("id") == primary_id:
            v = entry.get("phone_number")
            return v if isinstance(v, str) and v else None
    first = numbers[0]
    if isinstance(first, dict):
        v = first.get("phone_number")
        return v if isinstance(v, str) and v else None
    return None


def _role_from_metadata(public_metadata: object, default: UserRole) -> UserRole:
    """Read the `role` field out of Clerk's public_metadata if present.

    The dashboard / admin can set this via Clerk's "User → Metadata"
    panel or the backend API; we map a small whitelist into our
    UserRole enum so a typo can't grant super_admin.
    """
    if not isinstance(public_metadata, dict):
        return default
    raw = public_metadata.get("role")
    if not isinstance(raw, str):
        return default
    try:
        return UserRole(raw)
    except ValueError:
        logger.warning("clerk.webhook.unknown_role", role=raw)
        return default


async def _upsert_from_webhook(session: AsyncSession, data: dict[str, Any]) -> User:
    """Three-phase upsert mirroring `app.core.auth._upsert_user` so the
    JIT-on-/me/* path and the proactive-webhook path produce identical
    rows. Extended to populate phone + photo_url + role from the richer
    webhook payload (the auth path doesn't have these on the JWT)."""
    clerk_id = data.get("id")
    if not isinstance(clerk_id, str) or not clerk_id:
        raise HTTPException(status_code=400, detail="Webhook payload missing user id")

    email = _primary_email(data)
    safe_email = email or f"{clerk_id}@no-email.clerk"
    phone = _primary_phone(data)
    photo_url = data.get("image_url") or data.get("profile_image_url")
    if not isinstance(photo_url, str):
        photo_url = None
    first = _sanitize_name_part(
        data.get("first_name") if isinstance(data.get("first_name"), str) else None
    )
    last = _sanitize_name_part(
        data.get("last_name") if isinstance(data.get("last_name"), str) else None
    )
    role = _role_from_metadata(data.get("public_metadata"), default=UserRole.resident)

    # Phase 1: existing resident, primary identity unchanged.
    existing = await session.scalar(select(User).where(User.clerk_id == clerk_id))
    if existing is not None:
        existing.email = safe_email
        existing.first_name = first or _sanitize_name_part(existing.first_name)
        existing.last_name = last or _sanitize_name_part(existing.last_name)
        if phone:
            existing.phone = phone
        if photo_url:
            existing.photo_url = photo_url
        # Only allow role escalation through metadata — never demote a
        # super_admin to resident via a stray Clerk update.
        if existing.role == UserRole.prospect and role != UserRole.prospect:
            existing.role = role
        await session.commit()
        await session.refresh(existing)
        return existing

    # Phase 2: re-link orphan row by email when the clerk_id changed.
    by_email = await session.scalar(select(User).where(User.email == safe_email))
    if by_email is not None:
        previous = by_email.clerk_id
        by_email.clerk_id = clerk_id
        by_email.first_name = first or _sanitize_name_part(by_email.first_name)
        by_email.last_name = last or _sanitize_name_part(by_email.last_name)
        if phone:
            by_email.phone = phone
        if photo_url:
            by_email.photo_url = photo_url
        await session.commit()
        await session.refresh(by_email)
        logger.info(
            "clerk.webhook.user_relinked",
            from_clerk_id=previous,
            to_clerk_id=clerk_id,
            email=safe_email,
        )
        return by_email

    # Phase 3: brand-new resident.
    new_user = User(
        clerk_id=clerk_id,
        email=safe_email,
        first_name=first,
        last_name=last,
        phone=phone,
        photo_url=photo_url,
        role=role,
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    logger.info(
        "clerk.webhook.user_created",
        clerk_id=clerk_id,
        email=safe_email,
        role=role.value,
    )
    return new_user


# ─── Route ─────────────────────────────────────────────────────────────────


@router.post("/clerk", status_code=status.HTTP_200_OK)
async def clerk_webhook(
    request: Request,
    session: DbSession,
    svix_id: Annotated[str | None, Header(alias="svix-id")] = None,
    svix_timestamp: Annotated[str | None, Header(alias="svix-timestamp")] = None,
    svix_signature: Annotated[str | None, Header(alias="svix-signature")] = None,
) -> dict[str, Any]:
    body = await request.body()

    # All three headers are required by the svix spec. Missing any one
    # is an immediate 400 — Clerk's retry loop will give up after a few
    # cycles which is the correct behaviour for a misconfigured caller.
    # Skip the header check in dev-with-no-secret to make curl
    # replays painless.
    if settings.CLERK_WEBHOOK_SECRET and not (svix_id and svix_timestamp and svix_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing svix headers",
        )

    payload = _verify_signature(
        body,
        svix_id=svix_id or "",
        svix_timestamp=svix_timestamp or "",
        svix_signature=svix_signature or "",
    )

    event_type = payload.get("type")
    if not isinstance(event_type, str):
        raise HTTPException(status_code=400, detail="Webhook payload missing `type`")

    if event_type not in _HANDLED_EVENTS:
        # Acknowledge so Clerk doesn't retry. Log at debug so we don't
        # spam INFO with every session.created tick.
        logger.debug("clerk.webhook.ignored", type=event_type)
        return {"ok": True, "handled": False, "type": event_type}

    data = payload.get("data")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Webhook payload missing `data`")

    user = await _upsert_from_webhook(session, data)
    logger.info(
        "clerk.webhook.handled",
        type=event_type,
        clerk_id=user.clerk_id,
        email=user.email,
    )
    return {"ok": True, "handled": True, "type": event_type, "user_id": str(user.id)}
