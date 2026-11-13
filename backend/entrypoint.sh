#!/bin/sh
# Apply pending database migrations, then start the given command (default: uvicorn, see Dockerfile).
set -e
cd /app
python -m alembic upgrade head
exec "$@"
