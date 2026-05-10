# Setup Guide

> Detailed setup will be filled in during Phase 7. This file is a placeholder.

## Required tools

| Tool    | Version | Install                                       |
| ------- | ------- | --------------------------------------------- |
| Node.js | >= 22   | https://nodejs.org/                           |
| pnpm    | >= 9    | `npm install -g pnpm@9`                       |
| Python  | >= 3.11 | https://www.python.org/                       |
| uv      | latest  | `irm https://astral.sh/uv/install.ps1 \| iex` |
| Git     | >= 2.40 | https://git-scm.com/                          |

## First-time setup

1. Clone the repo: `git clone https://github.com/marco-milad/stitch-mvp.git`
2. Install deps: `pnpm install`
3. Copy env: `cp .env.example .env` (and fill in values)
4. API: `cd apps/api && uv sync`
5. Run all: `pnpm dev`

(Full env-by-env walkthrough lands in Phase 7.)
