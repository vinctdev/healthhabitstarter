# Development

How to run the app locally, make changes and run the same checks as the CI. For how the code is
organized, see [architecture.md](architecture.md). If you work with an AI coding agent,
`CLAUDE.md` in the repository root gives it the same information in condensed form.

## Prerequisites

- Python 3.13 or newer
- Node.js 26 (the version in `frontend/.nvmrc`, e.g. via [nvm](https://github.com/nvm-sh/nvm):
  `nvm use` in `frontend/`)
- Docker with Compose, only for building and testing the images

Local development needs no database server: without database settings the backend uses SQLite
(`backend/dev.db`).

## Setup

```bash
# Backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/alembic upgrade head
.venv/bin/python -m app.demo_seed --reset     # optional: ~90 days of demo data

# Frontend
cd ../frontend
npm ci
```

Settings for local development go into `backend/.env` (same variables as in
[deployment.md](deployment.md#configuration), without the database ones). The demo seeder
refuses to run with `ENVIRONMENT=production`.

## Running

In two terminals:

```bash
cd backend && HEALTH_PROVIDER=demo .venv/bin/uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to the backend on port 8000. The interactive API
documentation is at <http://localhost:8000/docs>.

Both servers only listen on localhost, because the app has no login and the API returns all your
data. To open the dev app on your phone, run `npm run dev -- --host`: anyone in the same network
can then reach it, so only do this in a network you trust.

`HEALTH_PROVIDER=demo` generates tracker data, so the Performance tab works without a fitness
tracker. AI features need a `GEMINI_API_KEY` ([gemini.md](gemini.md)); without one they are
greyed out.

## Checks

The CI (`.github/workflows/ci.yml`) runs these on every push to `main` and on pull requests. Run
them before you commit:

```bash
# Backend (in backend/)
.venv/bin/ruff check .
.venv/bin/ruff format --check .      # without --check: formats the code
.venv/bin/pytest

# Frontend (in frontend/)
npm run lint
npm run format:check                 # npm run format: formats the code
npm run build                        # type check (tsc) + production build
```

Tests run against a fresh SQLite database per test, without a tracker and without AI
(`backend/tests/conftest.py`). The `set_now` fixture freezes the clock for date-dependent logic.
Add a test when you change a calculation such as streaks, the sleep index or the energy curve.
Deprecation warnings from `app/` fail the test run.

## Changing the database schema

1. Change or add models in `backend/app/models.py` (and import new models in
   `backend/alembic/env.py`).
2. Generate a migration and review it:

   ```bash
   cd backend
   .venv/bin/alembic revision --autogenerate -m "add xyz"
   .venv/bin/alembic upgrade head
   ```

3. Update `backend/app/demo_seed.py` if the change affects demo data or enum-like values.

Never edit a migration that has already been applied somewhere. `tests/test_migrations.py` fails
when `models.py` and the migrations disagree.

## Screenshots

```bash
cd frontend
npm run screenshot -- --out /tmp/shots     # all tabs of the running dev app
```

This opens every tab in a real browser and exits with an error if a page logs a console error or
a request fails: a quick smoke test after UI changes. It needs Playwright's Chromium
(`npx playwright install chromium`).

## Docker images

```bash
docker compose up -d --build     # builds both images from your working tree
```

The images are built and published to the GitHub Container Registry by
`.github/workflows/docker.yml` when a tag `v*` is pushed (and manually from the Actions tab). It
runs the CI checks first and publishes nothing if they fail.

## Updating dependencies

Versions are pinned and updated by hand, not by a bot:

```bash
cd frontend && npm outdated
cd backend && .venv/bin/pip list --outdated
```

Raise the versions in `package.json` and `requirements*.txt`, reinstall, and run all
[checks](#checks).
