# ─── Stitch API · production image ──────────────────────────────────────────
# FastAPI + uvicorn[standard] + WebSocket support. Built on python:3.11-slim
# with `uv` for fast, reproducible dependency installs straight from uv.lock.
#
# IMPORTANT: WORKER COUNT
#   We currently launch a SINGLE worker because every live hub
#   (gate_simulator, requests_hub, notifications_hub, parking_hub) is
#   process-local — broadcasts can't cross worker boundaries today. When
#   horizontal scale is needed, swap each hub's broadcast layer for Redis
#   pub/sub (REDIS_URL is already in settings) and bump --workers.
# ────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim AS runtime

# Faster, deterministic Python + uv defaults.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

# Minimal system deps. Add libpq-dev only if/when we wire psycopg-binary;
# asyncpg ships wheels so we don't need build-essential.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Pull the static uv binary from its official OCI image — keeps the layer
# tiny and avoids pinning to a pip-installed version.
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv

WORKDIR /app

# Install deps in a dedicated layer so application code changes don't
# bust the dependency cache. uv reads pyproject.toml + uv.lock and
# installs the locked versions system-wide (no venv needed inside the
# container — the image *is* the isolation boundary).
COPY pyproject.toml uv.lock ./
RUN uv pip install --system --no-cache -r pyproject.toml

# Copy application source. .dockerignore keeps .env, .venv, caches, and
# tests out of the image.
COPY app/ ./app/
COPY alembic.ini ./
COPY migrations/ ./migrations/

# Render injects $PORT at runtime; default to 8000 for local docker runs.
EXPOSE 8000

# Healthcheck — Render polls `/health` already, but this lets `docker ps`
# show container health locally too.
HEALTHCHECK --interval=30s --timeout=4s --start-period=10s \
    CMD curl -fsS "http://127.0.0.1:${PORT:-8000}/health" || exit 1

# uvicorn[standard] includes the websockets package — no extra flags
# needed for WS support. --proxy-headers + --forwarded-allow-ips=* let
# FastAPI see the real client IP/scheme through Render's TLS terminator.
# Shell form (sh -c) so ${PORT} expands at container start.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --proxy-headers --forwarded-allow-ips=*"]
