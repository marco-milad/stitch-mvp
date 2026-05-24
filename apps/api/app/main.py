"""Stitch FastAPI app bootstrap.

CORS is handled by a handcrafted middleware (see `cors` below) rather than
the stock `fastapi.middleware.cors.CORSMiddleware` — Starlette's regex
matching was flaking under Railway's edge for Vercel's rotating preview
subdomains, so we do the matching and header injection in plain Python
where the behaviour is deterministic.
"""

import os
import re
from collections.abc import AsyncGenerator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, logger
from app.services import gate_simulator

configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("api.starting", env=settings.APP_ENV, model=settings.GEMINI_MODEL)
    gate_simulator.start()
    try:
        yield
    finally:
        await gate_simulator.stop()
        logger.info("api.stopping")


limiter = Limiter(key_func=get_remote_address)
app = FastAPI(
    title="Stitch API",
    version="0.1.0",
    description="Community management backend for Stitch (mobile + admin clients).",
    lifespan=lifespan,
)
app.state.limiter = limiter


# ─── CORS — handcrafted, bulletproof ───────────────────────────────────────
#
# Policy
#   - Any http(s)://localhost(:port)?          → allow.
#   - Any https://<anything>.vercel.app         → allow (covers every
#     rotating Vercel preview + production URL).
#   - Anything in the `ALLOWED_ORIGINS` env var (comma-separated)
#     → allow (for custom prod domains like `https://stitch.app`).
#
# Why not `fastapi.middleware.cors.CORSMiddleware`?
#   - Starlette's regex path was flaking against Railway's edge on
#     preview-URL preflights; debugging across the proxy is painful.
#   - Doing the matching ourselves with stdlib `re.fullmatch` removes the
#     variable — behaviour is fully deterministic from this file alone.
#   - Short-circuiting the OPTIONS preflight at the TOP of the middleware
#     stack means no exception handler / router / response model can
#     accidentally strip, duplicate, or rewrite a CORS header.
#
# Credentials note
#   `Access-Control-Allow-Credentials: true` (Clerk cookies need this).
#   The CORS spec forbids `*` for `Allow-Origin` when credentials are on,
#   so we explicitly **echo** the request `Origin` back rather than
#   sending a wildcard.
#
# WebSockets
#   This middleware runs only on HTTP — `@app.middleware("http")` is HTTP
#   scope only. FastAPI / Starlette WebSocket endpoints don't enforce
#   `Origin` by default; any browser can open the socket once it reaches
#   the server. If WS connections still fail after this patch, the cause
#   is almost certainly **mixed content** — a page served over `https://`
#   cannot open a `ws://` connection. The fix lives on the Vercel side:
#       VITE_WS_URL = wss://<your-railway-host>     (not ws://)

_VERCEL_LOCAL_RE = re.compile(r"^https?://(localhost(:\d+)?|.+\.vercel\.app)$")
_EXTRA_ALLOWED: frozenset[str] = frozenset(
    o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()
)
# Methods enumerated explicitly. `*` is technically allowed alongside
# credentials in modern browsers, but enumerating is portable across all
# UAs and proxies.
_ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS"


def _origin_allowed(origin: str | None) -> bool:
    if not origin:
        return False
    if origin in _EXTRA_ALLOWED:
        return True
    return bool(_VERCEL_LOCAL_RE.match(origin))


@app.middleware("http")
async def cors(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    origin = request.headers.get("origin")
    allowed = _origin_allowed(origin)

    # Preflight short-circuit. Browsers send `Access-Control-Request-Headers`
    # with the exact headers they intend to use on the real request — we
    # echo that list back (the most permissive value that's safe with
    # credentials enabled; literal `*` does not reliably work in every UA).
    if request.method == "OPTIONS" and allowed and origin:
        req_headers = request.headers.get("access-control-request-headers", "*")
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": _ALLOWED_METHODS,
                "Access-Control-Allow-Headers": req_headers,
                "Access-Control-Max-Age": "86400",
                "Vary": "Origin",
            },
        )

    response = await call_next(request)

    # Real request — echo Origin so the browser accepts the response body.
    if allowed and origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        existing_vary = response.headers.get("vary")
        response.headers["Vary"] = f"{existing_vary}, Origin" if existing_vary else "Origin"

    return response


register_exception_handlers(app)
app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready", tags=["health"])
async def ready() -> dict[str, bool]:
    return {"ready": True}
