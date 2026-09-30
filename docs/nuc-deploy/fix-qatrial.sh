#!/usr/bin/env bash
set -euo pipefail
cd /opt/gsms/qatrial
python3 - <<'PY'
import json
from pathlib import Path
p = Path("package.json")
d = json.loads(p.read_text())
deps = d.setdefault("dependencies", {})
deps["@prisma/adapter-pg"] = "^7.6.0"
deps["pg"] = "^8.16.0"
p.write_text(json.dumps(d, indent=2) + "\n")
print("package.json updated")
PY
# Sync lockfile for Docker npm ci
docker run --rm -v "$PWD":/app -w /app node:22-alpine sh -c "npm install --package-lock-only"
JWT=$(openssl rand -hex 48)
printf 'DATABASE_URL=postgresql://qatrial:qatrial@db:5432/qatrial\nJWT_SECRET=%s\n' "$JWT" > .env
# Ensure Dockerfile uses npm install fallback if needed
sed -i 's/RUN npm ci$/RUN npm ci || npm install/g' Dockerfile || true
docker compose build app
docker compose up -d
sleep 25
docker compose ps
curl -sS -o /dev/null -w 'qatrial:%{http_code}\n' http://127.0.0.1:3001/ || true
docker compose logs app --tail=40
