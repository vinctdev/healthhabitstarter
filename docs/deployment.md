# Deployment

Health Habit Starter runs as three containers: `frontend` (nginx, serves the app and proxies `/api`),
`backend` (FastAPI) and `database` (PostgreSQL 18). Images for `linux/amd64` and `linux/arm64` are
published to the GitHub Container Registry.

## Quick start

```bash
git clone https://github.com/vinctdev/healthhabitstarter.git
cd healthhabitstarter
cp .env.example .env          # set DB_PASSWORD (e.g. `openssl rand -hex 32`) and TZ
docker compose pull && docker compose up -d     # prebuilt images
# or: docker compose up -d --build              # build your own (customized) version
```

Open <http://localhost:8080>. To try the app without a fitness tracker, set `HEALTH_PROVIDER=demo`
in `.env`. Demo data is stored like real data: before connecting your tracker,
`docker compose down -v` clears **all** data.

## Configuration

All settings live in `.env` next to `docker-compose.yml` (template: `.env.example`). After a change,
run `docker compose up -d`: it recreates the containers whose settings changed.

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PASSWORD` | (required) | Password of the bundled PostgreSQL, e.g. from `openssl rand -hex 32`. |
| `DB_USER`, `DB_NAME` | `healthhabitstarter` | Database user and name. |
| `TZ` | `UTC` | Your [IANA time zone](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones), e.g. `Europe/Berlin`. Used to convert tracker timestamps to local time. |
| `HEALTH_PROVIDER` | `auto` | Source of sleep, heart rate and run data: `google`, `demo` (generated data), `none`, or `auto` (`google` if a refresh token is set, otherwise `none`). |
| `GOOGLE_HEALTH_CLIENT_ID`, `GOOGLE_HEALTH_CLIENT_SECRET`, `GOOGLE_HEALTH_REFRESH_TOKEN` | (empty) | Fitbit / Pixel Watch access, see [google-health.md](google-health.md). |
| `GEMINI_API_KEY` | (empty) | Enables the AI features. Without it they are greyed out. See [gemini.md](gemini.md). |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Gemini model for all AI features. |
| `DB_URL` | (empty) | Use an external database instead of the bundled one, see [External PostgreSQL](#external-postgresql). |

PostgreSQL applies `DB_USER`, `DB_NAME` and `DB_PASSWORD` only when it creates the database on the
first start. Changing them later in `.env` does not change the database, see
[Troubleshooting](#troubleshooting).

Day boundary, wake and sleep times, calorie target and similar personal settings are not
environment variables: they are set in the app (gear icons) and stored in the database.

## Securing access

The app has **no login**. It is built for one person, and access control is left to the network
around it. That is why the port is bound to `127.0.0.1` by default: only the machine running the
containers can open it.

**Never expose port 8080 directly to the internet.** Anyone who finds it could read and change your
health data and use your Gemini API key.

To use the app from other devices (your phone, a laptop), pick one of these:

### Option 1: VPN (recommended)

A VPN keeps the app private and works from anywhere, including your phone.

- **Tailscale**: install it on the server and your devices, then publish the local port to your
  tailnet only, with HTTPS:

  ```bash
  tailscale serve --bg 8080
  ```

  The app is then available at `https://<machine>.<tailnet>.ts.net` for your devices, and nowhere else.
- **WireGuard** (or another VPN): bind the port to the VPN interface address, see
  [Changing the port binding](#changing-the-port-binding).

### Option 2: Reverse proxy with authentication

If the app must be reachable from the internet, put a reverse proxy with HTTPS and a login in front
of it. A minimal [Caddy](https://caddyserver.com/) config (on the same host, with automatic HTTPS):

```caddyfile
health.example.com {
	basic_auth {
		# user + hash from `caddy hash-password`
		me $2a$14$replace-with-your-hash
	}
	reverse_proxy 127.0.0.1:8080
}
```

If your proxy runs in Docker itself, attach it to the `healthhabitstarter_web` network and proxy to
`frontend:8080` instead.

For single sign-on or two-factor authentication, use [Authelia](https://www.authelia.com/),
[Authentik](https://goauthentik.io/), [oauth2-proxy](https://oauth2-proxy.github.io/oauth2-proxy/)
or [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/) (with a
Cloudflare Tunnel, no open ports needed).

## Changing the port binding

Create a `docker-compose.override.yml` next to `docker-compose.yml`. Docker Compose merges it
automatically, and it is gitignored, so your local setup stays out of the repository:

```yaml
services:
  frontend:
    ports: !override
      - "192.168.1.10:8080:8080"   # address of the network interface to listen on
```

Only bind to an address in a network you trust (home LAN, VPN). The app has no login there either.

## Updating

With the prebuilt images:

```bash
git pull                                  # updated docker-compose.yml and docs
docker compose pull && docker compose up -d
```

With your own build (for example after customizing the code):

```bash
git pull                                  # or merge upstream changes into your fork
docker compose up -d --build
```

Database migrations run automatically when the backend starts. Make a [backup](#backup-and-restore)
before larger updates.

## Backup and restore

Your data lives in the Docker volume `healthhabitstarter_db_data`. Back it up with `pg_dump`, run
from the directory that contains `docker-compose.yml`:

```bash
docker compose exec -T database sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > healthhabitstarter-$(date +%F).dump
```

The dump contains all your health data: store it somewhere safe and private. To back up regularly,
run the same command from cron or a systemd timer.

To restore a dump, stop the app (the database keeps running) and replace the database contents:

```bash
docker compose stop frontend backend
docker compose exec -T database sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  < healthhabitstarter-2026-11-03.dump
docker compose up -d
```

## Upgrading PostgreSQL

Minor versions (e.g. 18.1 → 18.2) arrive with `docker compose pull` and need nothing else. A new
major version (e.g. 18 → 19) cannot read the old data files directly. To move your data to the new version, use a dump:

1. Make a backup as described in [Backup and restore](#backup-and-restore).
2. Stop everything: `docker compose down`.
3. Change the image in `docker-compose.yml` (for example `postgres:18-alpine` → `postgres:19-alpine`).
   Since PostgreSQL 18 the data is stored in a versioned subdirectory (`/var/lib/postgresql/18/docker`),
   so the new version starts with an empty database next to the old one in the same volume.
4. Start only the database and restore the dump into it:

   ```bash
   docker compose up -d --wait database
   docker compose exec -T database sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' \
     < healthhabitstarter-2026-11-03.dump
   ```

5. Start the app: `docker compose up -d`, and check that your data is there.
6. Once everything works, remove the old data directory to free the space:

   ```bash
   docker compose exec database rm -rf /var/lib/postgresql/18
   ```

## External PostgreSQL

To use a PostgreSQL server you already run, set `DB_URL` in `.env`:

```bash
DB_URL=postgresql://user:password@db.example.com:5432/healthhabitstarter
```

`DB_URL` takes precedence over the bundled database. Special characters in the password must be
[URL-encoded](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding). `DB_PASSWORD`
still needs a value (any will do).

The bundled `database` container is then unused. If you don't want it to start at all, remove the
backend's dependency on it in a `docker-compose.override.yml`:

```yaml
services:
  backend:
    depends_on: !reset {}
```

and start only the app: `docker compose up -d frontend` (this starts the backend as well).

## Troubleshooting

Start with the status and the logs:

```bash
docker compose ps                  # all three services should be "healthy"
docker compose logs -f backend     # or frontend, database
```

| Symptom | Cause and fix |
|---------|---------------|
| `set DB_PASSWORD in .env` when starting | `.env` is missing or has no `DB_PASSWORD`. Copy `.env.example` to `.env` and set it. |
| Backend restarts, log shows `password authentication failed` | `DB_PASSWORD` was changed after the first start. Set it back, or set the new password inside PostgreSQL: `docker compose exec database sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'`, then `\password`. |
| Page loads, but shows errors or `502 Bad Gateway` | The backend is not running or not healthy yet. Check `docker compose logs backend`. |
| No sleep or heart rate data | `HEALTH_PROVIDER` is `none` (the default without a refresh token). Set up [Google Health](google-health.md) or use `demo`. |
| AI buttons are greyed out | `GEMINI_API_KEY` is empty, or `docker compose up -d` was not run after setting it. |
| Times are off by some hours | `TZ` is not set to your time zone. |
