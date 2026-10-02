#!/usr/bin/env sh
# Attend la base, applique les migrations Alembic, puis lance la commande (API par défaut).
# Même principe que gsms-qualiopi/backend/docker/entrypoint.sh.
set -e

python - <<'PY'
import os, sys, time
from sqlalchemy import create_engine, text

url = os.environ.get("GSMS_DATABASE_URL", "")
if url.startswith("sqlite"):
    sys.exit(0)
engine = create_engine(url, pool_pre_ping=True)
for _ in range(60):
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        break
    except Exception:
        time.sleep(2)
else:
    sys.exit("PostgreSQL injoignable après 120 s")
PY

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  alembic upgrade head
fi

exec "$@"
