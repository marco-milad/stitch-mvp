# ruff: noqa: E402  -- `load_dotenv()` MUST run before `from app.*` imports
# (those trigger `settings = Settings()` which reads env at import time).
import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address

# Load .env into os.environ so dev `os.environ.get(...)` reads work. In
# prod (Railway, Docker) there's no .env file — load_dotenv is a no-op
# and the platform's injected env vars are used directly.
load_dotenv()

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


# CORS — explicit allow-list from `ALLOWED_ORIGINS` env var, plus a regex
# that matches every Vercel deployment (production alias + per-PR previews).
# CORSMiddleware ORs the two: origin matches if it's in the list OR the regex.
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
VERCEL_ORIGIN_REGEX = r"https://stitch-mvp-web(-[a-z0-9-]+)?\.vercel\.app$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=VERCEL_ORIGIN_REGEX,
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
