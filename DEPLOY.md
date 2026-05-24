# Stitch · Deployment guide

Three artifacts, three services:

| Layer               | Path          | Host                              | Runtime           |
| ------------------- | ------------- | --------------------------------- | ----------------- |
| **Backend**         | `apps/api/`   | **Render** (Web Service · Docker) | FastAPI + uvicorn |
| **Resident web**    | `apps/web/`   | **Vercel** (project A)            | Vite + React      |
| **Admin dashboard** | `apps/admin/` | **Vercel** (project B)            | Vite + React      |

All three layers run side-by-side; the two Vercel projects share one Render backend.

---

## 1 · Backend on Render

### 1.1 Create the service

Render Dashboard → **New** → **Web Service** → connect the repo.

| Field           | Value                                                                      |
| --------------- | -------------------------------------------------------------------------- |
| Name            | `stitch-api`                                                               |
| Region          | Frankfurt (closest to Madinet Masr)                                        |
| Branch          | `main`                                                                     |
| Runtime         | **Docker**                                                                 |
| Root Directory  | `apps/api`                                                                 |
| Dockerfile path | _(leave blank — auto-detects `apps/api/Dockerfile`)_                       |
| Plan            | Starter (512 MB) is enough for the demo; bump to Standard once Redis lands |

WebSocket support is **on by default** on Render — no extra toggle needed.

### 1.2 Environment variables

Set under **Environment** in the Render dashboard. Anything ending in `_URL` should be the real production URL.

| Key                     | Example value                                                                         | Notes                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `ALLOWED_ORIGINS`       | `https://stitch-resident.vercel.app,https://stitch-admin.vercel.app`                  | **Required for prod.** Comma-separated. When unset, the API falls back to the localhost regex (dev-only behaviour). |
| `APP_ENV`               | `production`                                                                          |                                                                                                                     |
| `APP_LOG_LEVEL`         | `INFO`                                                                                |                                                                                                                     |
| `DATABASE_URL`          | `postgresql+asyncpg://postgres.<ref>:<pwd>@aws-...-pooler.supabase.com:6543/postgres` | Use the Supabase **pooler** URL — direct `db.<ref>` host is IPv6-only and Render workers run IPv4.                  |
| `REDIS_URL`             | `rediss://default:<pwd>@<host>.upstash.io:6379`                                       | Upstash.                                                                                                            |
| `CLERK_SECRET_KEY`      | `sk_live_...`                                                                         |                                                                                                                     |
| `CLERK_PUBLISHABLE_KEY` | `pk_live_...`                                                                         |                                                                                                                     |
| `CLERK_JWKS_URL`        | `https://<your>.clerk.accounts.dev/.well-known/jwks.json`                             |                                                                                                                     |
| `GEMINI_API_KEY`        | `AIza...`                                                                             |                                                                                                                     |
| `SUPABASE_URL`          | `https://<ref>.supabase.co`                                                           |                                                                                                                     |
| `SUPABASE_ANON_KEY`     | `eyJhbGci...`                                                                         |                                                                                                                     |
| `SUPABASE_SERVICE_KEY`  | `eyJhbGci...`                                                                         | Secret.                                                                                                             |
| `PORT`                  | _(unset — Render injects automatically)_                                              | Dockerfile already reads `${PORT:-8000}`.                                                                           |

### 1.3 Health check

Render path: **`/health`** (already wired in `app/main.py`).

### 1.4 Known constraint — single worker

The image launches uvicorn with `--workers 1` on purpose. Every live hub
(`gate_simulator`, `requests_hub`, `notifications_hub`, `parking_hub`) is
process-local — multiple workers would silently fan out events to only
one process and the other workers' WS clients would never see them.

When horizontal scale is needed:

1. Swap each hub's `_broadcast()` to publish to Redis pub/sub (`REDIS_URL` is already wired in `app/core/config.py`).
2. Add a per-worker Redis subscriber that fans out to local WS subscribers.
3. Bump `--workers` in the `Dockerfile` `CMD`.

### 1.5 Migrations (when DB is wired)

Today the demo runs entirely on in-memory hubs, so Alembic doesn't need
to run at boot. When persistence lands, add a Render **Pre-Deploy
Command**:

```bash
alembic upgrade head
```

---

## 2 · Resident web (`apps/web/`) on Vercel

### 2.1 Create the project

Vercel Dashboard → **New Project** → import the repo.

| Field              | Value                                        |
| ------------------ | -------------------------------------------- |
| Project name       | `stitch-resident`                            |
| Framework Preset   | **Vite** (auto-detected)                     |
| **Root Directory** | `apps/web`                                   |
| Build Command      | `pnpm --filter @stitch/web build`            |
| Output Directory   | `dist`                                       |
| Install Command    | `pnpm install --frozen-lockfile`             |
| Node version       | 22.x (matches the monorepo's `engines.node`) |

The repo's [pnpm-workspace.yaml](pnpm-workspace.yaml) is detected automatically — workspace deps (`@stitch/types`, `@stitch/constants`, `@stitch/api-client`) resolve without extra config. The committed [apps/web/vercel.json](apps/web/vercel.json) holds the SPA rewrite rule (`/*` → `/index.html`) so React Router routes don't 404 on direct hits.

### 2.2 Environment variables

Set under **Settings → Environment Variables** for `Production`, `Preview`, and `Development`:

| Key                          | Production value                         |
| ---------------------------- | ---------------------------------------- |
| `VITE_API_URL`               | `https://stitch-api.onrender.com/api/v1` |
| `VITE_WS_URL`                | `wss://stitch-api.onrender.com`          |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...`                            |

Note the **`wss://`** (TLS WebSocket) — required because the Vercel page is served over HTTPS and browsers refuse `ws://` from secure origins.

---

## 3 · Admin dashboard (`apps/admin/`) on Vercel

Identical pattern to the resident web — separate project so each gets its
own domain + deploy lifecycle.

| Field            | Value                               |
| ---------------- | ----------------------------------- |
| Project name     | `stitch-admin`                      |
| Framework Preset | **Vite**                            |
| Root Directory   | `apps/admin`                        |
| Build Command    | `pnpm --filter @stitch/admin build` |
| Output Directory | `dist`                              |
| Install Command  | `pnpm install --frozen-lockfile`    |

### Environment variables

| Key                 | Production value                         |
| ------------------- | ---------------------------------------- |
| `VITE_API_URL`      | `https://stitch-api.onrender.com/api/v1` |
| `VITE_WS_URL`       | `wss://stitch-api.onrender.com`          |
| `VITE_USE_MOCK_API` | `false`                                  |

---

## 4 · Bring-up order

```
1.  Push to main → Render starts building Docker image (~3-5 min first time).
2.  Once `/health` is green on Render, copy the public URL
    (e.g. https://stitch-api.onrender.com).
3.  Set VITE_API_URL + VITE_WS_URL on both Vercel projects to the URL from step 2.
4.  Trigger redeploys on Vercel so the new env vars get baked into the bundle.
5.  Copy the two Vercel domains and set them on Render as ALLOWED_ORIGINS,
    e.g.:
      ALLOWED_ORIGINS="https://stitch-resident.vercel.app,https://stitch-admin.vercel.app"
6.  Render auto-restarts → CORS now scoped to those two front-ends.
```

CORS-locking the API is intentionally the **last** step so the first
Vercel build can fetch the OpenAPI / health endpoint without scrambling
to fill in the dependency loop.

---

## 5 · Local Docker smoke test (optional but recommended)

```bash
# From repo root — build with the apps/api Dockerfile
docker build -t stitch-api -f apps/api/Dockerfile apps/api

# Run with the same env shape Render will inject
docker run --rm -p 8000:8000 \
  -e ALLOWED_ORIGINS="http://localhost:5173,http://localhost:5174" \
  -e DATABASE_URL="postgresql+asyncpg://localhost/stitch" \
  -e REDIS_URL="redis://localhost:6379" \
  -e CLERK_SECRET_KEY=sk_test_x \
  -e CLERK_PUBLISHABLE_KEY=pk_test_x \
  -e CLERK_JWKS_URL=https://example.clerk.dev/.well-known/jwks.json \
  -e GEMINI_API_KEY=key \
  -e SUPABASE_URL=https://example.supabase.co \
  -e SUPABASE_ANON_KEY=key \
  -e SUPABASE_SERVICE_KEY=key \
  stitch-api

# Verify
curl http://localhost:8000/health
curl -i -X OPTIONS http://localhost:8000/api/v1/me/notifications \
     -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: GET"
# Expect: 200 with Access-Control-Allow-Origin: http://localhost:5173
```

---

## 6 · Custom domains (optional)

| Layer | Vercel/Render dashboard step                                    |
| ----- | --------------------------------------------------------------- |
| API   | Render → Service → Settings → Custom Domains → `api.stitch.app` |
| Web   | Vercel → `stitch-resident` → Domains → `stitch.app`             |
| Admin | Vercel → `stitch-admin` → Domains → `admin.stitch.app`          |

After adding domains, update `ALLOWED_ORIGINS` on Render to reflect them
(both the `*.vercel.app` and the custom one if you want both to work
during cutover).

---

## 7 · Cheat sheet — env var matrix

| Var                                                      | apps/api | apps/web |         apps/admin          |
| -------------------------------------------------------- | :------: | :------: | :-------------------------: |
| `ALLOWED_ORIGINS`                                        |    ✅    |    —     |              —              |
| `DATABASE_URL` / `REDIS_URL` / Clerk / Gemini / Supabase |    ✅    |    —     |              —              |
| `VITE_API_URL`                                           |    —     |    ✅    |             ✅              |
| `VITE_WS_URL`                                            |    —     |    ✅    |             ✅              |
| `VITE_CLERK_PUBLISHABLE_KEY`                             |    —     |    ✅    |              —              |
| `VITE_USE_MOCK_API`                                      |    —     |    —     | ✅ (set to `false` in prod) |
