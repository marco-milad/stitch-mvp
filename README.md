# Stitch

Community management mobile app for Egyptian compounds — turning gated communities into living, connected ecosystems.

> **Status:** Week 1 foundation. Feature implementation begins Week 2.

## Stack

| Layer          | Tech                                                                 |
| -------------- | -------------------------------------------------------------------- |
| Mobile         | React Native + Expo (SDK 52) + TypeScript + NativeWind + Expo Router |
| Admin          | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui          |
| API            | FastAPI (Python 3.11+) + async SQLAlchemy 2.0 + asyncpg + Alembic    |
| DB / Storage   | Supabase (cloud)                                                     |
| Cache / Queues | Upstash Redis (cloud)                                                |
| Auth           | Clerk (mobile + admin)                                               |
| AI Voice       | Google Gemini Live                                                   |
| Realtime       | Pusher (Channels)                                                    |
| Tooling        | Turborepo · pnpm workspaces · uv (Python) · Husky · GitHub Actions   |

## Repo layout

```
stitch-mvp/
├── apps/
│   ├── mobile/   # Expo app (residents, prospects)
│   ├── admin/    # Next.js dashboard (compound management)
│   └── api/      # FastAPI backend
├── packages/
│   ├── types/        # Shared TS types + Zod schemas
│   ├── api-client/   # Typed API client
│   ├── constants/    # Enums, app-wide constants
│   ├── ui/           # Shared mobile components
│   └── config/       # eslint / tsconfig / prettier presets
├── docs/             # Architecture, conventions, env reference
└── .github/workflows # CI
```

## Quick start

See [`SETUP.md`](./SETUP.md) for full setup instructions.

```bash
pnpm install            # Install JS deps
pnpm dev                # Run all 3 apps in parallel via Turborepo
```

For the API:

```bash
cd apps/api
uv sync                 # Install Python deps
uv run uvicorn app.main:app --reload
```

## Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — System design and Three Worlds model
- [`docs/API_CONVENTIONS.md`](./docs/API_CONVENTIONS.md) — REST conventions
- [`docs/FOLDER_NAMING.md`](./docs/FOLDER_NAMING.md) — File and folder naming rules
- [`docs/BRANCHING.md`](./docs/BRANCHING.md) — Git Flow
- [`docs/COMMITS.md`](./docs/COMMITS.md) — Conventional Commits
- [`docs/ENVS.md`](./docs/ENVS.md) — Environment variable reference

## License

Proprietary — all rights reserved.
