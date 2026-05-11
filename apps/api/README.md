# @stitch/api

FastAPI backend for Stitch. Async SQLAlchemy 2.0 + asyncpg + Alembic + Gemini Live voice WebSocket.

## Quick start

```powershell
cd apps/api
uv sync                                    # install deps into .venv
uv run uvicorn app.main:app --reload       # start dev server on :8000
```

Then:

- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health
- Voice WS: ws://localhost:8000/api/v1/voice?context=general

## Layout

```
apps/api/
├── app/
│   ├── main.py            # FastAPI app, middleware, lifespan
│   ├── core/              # config, database, redis, logging, exceptions, security
│   ├── api/v1/            # route modules (health, voice, ...)
│   ├── models/            # SQLAlchemy models (one file per domain)
│   ├── schemas/           # Pydantic schemas
│   ├── services/          # business logic
│   └── repositories/      # DB access layer
├── migrations/            # Alembic
├── scripts/seed.py        # seed local DB with prototype data
└── tests/                 # pytest
```

## Migrations

```powershell
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```

## Seed

```powershell
uv run python -m scripts.seed
```
