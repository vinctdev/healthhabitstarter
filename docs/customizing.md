# Making it yours

Health Habit Starter is a **personal** dashboard: it tracks what one person cares about, the way
that person likes it. The version in this repository is a starting point, not a finished product.
Clone it and change it: remove what you do not need, add what you are missing, adjust prompts,
colors and formulas.

The easiest way is to let an **AI coding agent** (e.g. Claude Code, Codex, Cursor) do the work.
`CLAUDE.md` in the repository root gives the agent the architecture and conventions, so you can
describe the change in plain words. Example prompts are at the end of this page.

## How the app is put together

Every area of the app is registered in one place, so adding or removing one only touches a few
files. [architecture.md](architecture.md) explains the parts in more detail,
[development.md](development.md) how to run the app and the checks after a change.

| What | Registered in | Remove | Add |
|------|---------------|--------|-----|
| Tabs (Food, Sport, Supplements, ...) | `frontend/src/features.ts` | delete the entry | view component + entry |
| Activities in the Sport tab | `frontend/src/components/sport/sportModules.ts` | delete the entry | module component + entry |
| Health data source (Fitbit, demo, ...) | `backend/app/health_providers/` | `HEALTH_PROVIDER=none` | [adding-a-health-provider.md](adding-a-health-provider.md) |
| Backend API per area | `backend/app/main.py` (`include_router`) | optional, see below | router + schema + model |
| AI mentor tools | `backend/app/routers/chat.py` (`TOOLS`) | delete the tool | tool definition + handler |
| AI features as a whole (Gemini) | `GEMINI_API_KEY` | leave it empty | [gemini.md](gemini.md) |

Navigation (desktop bar, mobile bar, mobile "More" sheet) is generated from `features.ts`. On
phones, at most four tabs fit into the bottom bar (`mobile: "bar"`); the rest go into the "More"
sheet (`mobile: "more"`). The first entry is the start tab.

### Removing a tab or a sport

Deleting the registry entry (and its import) is enough: the tab disappears everywhere and nothing
else breaks. The backend keeps its API and your data stays in the database, so you can bring the
tab back later.

For a thorough cleanup you can additionally delete the view files, the router in `main.py`, the
matching AI mentor tool in `chat.py` and the seeding in `backend/app/demo_seed.py`. Keep the
database tables (dropping them would need a new Alembic migration and deletes the data).

### Adding a tab

1. Create `frontend/src/components/<Name>View.tsx`.
2. Add an entry to `FEATURES` in `frontend/src/features.ts` (id, labels, Lucide icon, view).
3. For data: backend model in `models.py` + Alembic migration, schema in `schemas/`, router in
   `routers/` (registered in `main.py`), then `api/<feature>.ts` → `hooks/use<Feature>.ts` →
   component in the frontend.
4. Optionally add demo data to `demo_seed.py` and a read-only tool for the AI mentor in `chat.py`.

### Adding a sport

Push-ups are the smallest complete example: model `PushupEntry`, `routers/pushups.py`,
`schemas/pushups.py`, `api/pushups.ts`, `hooks/usePushups.ts` and
`components/sport/PushupModule.tsx`. Copy that path for your activity (cycling, swimming,
climbing, ...) and register the module in `sportModules.ts`. If the activity should count towards
the energy curve, look at how runs are used in `routers/health_data.py`.

## Readiness and energy curve

[energy-model.md](energy-model.md) explains how readiness and the energy curve are calculated.
All weights and effect sizes are constants at the top of `backend/app/routers/health_data.py`.

## Language and units

The UI and AI prompts are in English (the AI chat already answers in your language), and all
units are metric: kg, cm, km, min/km, °C, kcal, ml. There is no switch for either; to change
them, ask your AI agent to convert the UI texts, affected views and AI prompts.

## Prompts for your AI agent

> Remove the Supplements tab from the app. Follow `docs/customizing.md`, do a thorough cleanup
> (view files, router, AI mentor tool, demo data) but keep the database tables.

> Add a "Cycling" module to the Sport tab, modelled on the push-up module: rides with date,
> distance (km), duration and elevation gain (m). Include the backend model, migration, router,
> frontend module, demo data and a read-only tool for the AI mentor. Follow `docs/customizing.md`.

> In the readiness score, weight HRV higher than sleep. Update `docs/energy-model.md` and the
> tests in `backend/tests/test_readiness.py`.

> Add a new tab "Meditation" to log daily minutes with a weekly goal. Follow
> `docs/customizing.md` and the conventions in `CLAUDE.md`.
