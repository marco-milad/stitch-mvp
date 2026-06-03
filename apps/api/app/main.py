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
from app.core.database import AsyncSessionLocal
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, logger
from app.services import gate_simulator, requests_hub

configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("api.starting", env=settings.APP_ENV, model=settings.GEMINI_MODEL)
    async with AsyncSessionLocal() as session:
        await requests_hub.seed_demo_data(session)
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


# CORS — three-tier allow-list:
#   1. EXPLICIT_ALLOWED_ORIGINS — guaranteed entries baked into the source
#      so they survive any .env drift. Currently the production Vercel
#      alias + the active localtunnel for hybrid dev (Vercel frontend
#      pointing at a local FastAPI via tunnel).
#   2. ALLOWED_ORIGINS env var — per-environment additions (localhost
#      ports, preview tunnels, etc.). Merged with the explicit list as a
#      dedup'd set.
#   3. VERCEL_ORIGIN_REGEX — wildcard for every per-PR Vercel preview URL.
# CORSMiddleware ORs the list and the regex: origin matches if it's in
# the merged set OR matches the regex.
EXPLICIT_ALLOWED_ORIGINS = [
    "https://stitch-mvp-web.vercel.app",
    "https://nephew-unclog-untimed.ngrok-free.dev",
]
_env_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
ALLOWED_ORIGINS = sorted({*EXPLICIT_ALLOWED_ORIGINS, *_env_origins})
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
