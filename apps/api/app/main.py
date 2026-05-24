import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

# CORS — the regex is ALWAYS on and covers:
#   • http(s)://localhost(:port)? — every Vite dev port
#   • https://*.vercel.app         — every Vercel preview + production URL
#                                    (Vercel rotates the preview subdomain
#                                    on each deploy; an explicit allow-list
#                                    is impossible to keep in sync).
# `ALLOWED_ORIGINS` (comma-separated) layers on top for additional fixed
# origins such as a custom production domain
# (e.g. `ALLOWED_ORIGINS="https://stitch.app,https://admin.stitch.app"`).
_VERCEL_AND_LOCAL_REGEX = r"https?://(localhost(:\d+)?|.+\.vercel\.app)"
_extra_allowed = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=_VERCEL_AND_LOCAL_REGEX,
    allow_origins=_extra_allowed,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready", tags=["health"])
async def ready() -> dict[str, bool]:
    return {"ready": True}
