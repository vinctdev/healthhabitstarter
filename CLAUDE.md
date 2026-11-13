# CLAUDE.md

Guidance for AI coding agents working on **Health Habit Starter** (`healthhabitstarter`).

Health Habit Starter is a self-hosted personal health dashboard (habits, goals, nutrition, sport,
supplements, sleep/readiness, body metrics, AI mentor). It is meant to be cloned and customized by
each user, so keep code modular, readable and easy to change.

## Read first

| When you | Read |
|----------|------|
| Add or remove a tab or sport | `docs/customizing.md` |
| Connect a new tracker | `docs/adding-a-health-provider.md` |
| Change the database schema | `docs/development.md#changing-the-database-schema` |
| Set up or run the app, take screenshots, update dependencies | `docs/development.md` |
| Need the big picture (data flow, caching, AI endpoints) | `docs/architecture.md` |
| Change readiness or the energy curve | `docs/energy-model.md` (keep it in sync) |
| Add an environment variable | `docs/deployment.md#configuration` (keep it and `.env.example` in sync) |

## Before finishing a change

```bash
# Backend (in backend/)
.venv/bin/ruff check . && .venv/bin/ruff format . && .venv/bin/pytest

# Frontend (in frontend/)
npm run lint && npm run format && npm run build
```

CI (`.github/workflows/ci.yml`) runs these on pushes to `main` and on pull requests. Deprecation
warnings from `app/` fail pytest.

- **Calculations changed** (energy curve, sleep index, streaks): add a test. `set_now` in
  `tests/conftest.py` freezes the clock.
- **Model or enum-like values changed**: update `backend/app/demo_seed.py` too.
- **UI changed**: run `npm run screenshot -- --out /tmp/shots` (needs backend and Vite running; exit 1
  on console or HTTP errors).

## Language

Everything in the repository is **English**: code, comments, UI text, docs, commit messages and
LLM prompts. A fork may switch to another language (see `docs/customizing.md#language-and-units`).

## Tech stack

| Area      | Technology |
|-----------|------------|
| Frontend  | React 19, Vite 8, TypeScript 6, Tailwind CSS 3, TanStack Query, Recharts 3, react-icons (Lucide) |
| Backend   | Python, FastAPI, SQLAlchemy 2, Alembic, Pydantic Settings |
| Database  | PostgreSQL (production), SQLite (local dev fallback) |
| AI        | Google Gemini, optional (`GEMINI_API_KEY`, `GEMINI_MODEL`): photo → nutrition, nutrition suggestions, goal polish, chat mentor with tool calling |
| Health    | Pluggable providers (`HEALTH_PROVIDER`): Google Health API (Fitbit), demo, none |

## Local development

Runs natively against SQLite, without Docker. First-time setup: `docs/development.md`.

```bash
# Backend, port 8000 (in backend/)
.venv/bin/alembic upgrade head
.venv/bin/python -m app.demo_seed --reset     # ~90 days of demo data, replaces existing data
HEALTH_PROVIDER=demo .venv/bin/uvicorn app.main:app --reload --port 8000

# Frontend, port 5173, proxies /api to the backend (in frontend/)
npm run dev
```

API docs: http://localhost:8000/docs

## Layout

```
backend/app/
  main.py            FastAPI app + router registration
  config.py          settings from .env
  models.py          all SQLAlchemy models
  routers/           one router per feature area
  schemas/           Pydantic schemas per feature area
  gemini_client.py   Gemini client (streaming + tool calling)
  health_providers/  health data sources (google | demo | none), selected by HEALTH_PROVIDER
backend/alembic/     migrations
frontend/src/
  features.ts        tab registry: the one place that defines tabs (navigation + shells)
  components/        desktop views and widgets (one *View.tsx per tab)
  components/sport/  sport modules (running, push-ups), registered in sportModules.ts
  mobile/            mobile shell (< 640 px)
  api/ hooks/        fetch functions + TanStack Query hooks per feature
  types/ utils/
```

## Conventions

- **Schema changes**: edit `models.py`, import new models in `alembic/env.py`, then
  `alembic revision --autogenerate -m "<description>"`. Never edit applied migrations.
  `test_migrations.py` fails when `models.py` changes without a migration.
- **Day boundary**: a "day" starts at the configurable `user_settings.day_start_hour` (default 04:00),
  not midnight. Use `get_active_date(db)` (`routers/settings.py`) in the backend and `getActiveDate()` /
  `getDayStartHour()` (`utils/date.ts`) in the frontend, never `date.today()` or a hardcoded hour.
- **Time zones**: provider timestamps are stored as naive UTC. The backend converts with the `TZ` env
  var (`backend/app/timeutils.py`), the frontend with the browser zone (`parseUtc` in `utils/date.ts`).
  Never hardcode UTC offsets.
- **No em/en dashes** (`—`, `–`) anywhere in the frontend, including comments: they read as
  AI-generated. Use `-` for ranges and empty values, otherwise a period, colon, comma or `·`.
- **Icons**: Lucide via `react-icons/lu`; no hand-drawn SVG icons.
- **Fonts**: sans for text, mono for numbers (`frontend/src/theme/typography.ts`).
- **Data access pattern**: `api/<feature>.ts` → `hooks/use<Feature>.ts` → component.
- **Nullable nutrients**: `NULL` means unknown, `0` means measured zero. Keep that distinction.
- **AI tools**: chat tools are read-only except `adjust_energy_curve`.
- **AI is optional**: backend AI endpoints call `require_ai()` (503 without key); frontend AI buttons
  use `useAiEnabled()` + `aiGateProps()` (`hooks/useAi.ts`) to grey out with the tooltip
  "Needs GEMINI_API_KEY".
- **Health data**: routers only use `get_health_provider()` (`app/health_providers`), never a
  provider module directly.
- **Modularity**: tabs live in `features.ts`, sport activities in `components/sport/sportModules.ts`.
  Never hardcode tab ids in shells or navigation; add and remove areas via the registries.
- **Navigation**: buttons carry `data-tab="<tab id>"` (from `features.ts`). Keep these stable, the
  screenshot script discovers the tabs through them.
- **Units**: metric (kg, cm, km, °C, kcal, ml), no conversion layer. A fork may change this
  (see `docs/customizing.md#language-and-units`).
