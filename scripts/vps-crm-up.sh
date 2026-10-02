#!/bin/bash
set -euo pipefail
cd /opt/gsms/crm
cp -f /tmp/docker-compose.vps.yml deploy/vps/docker-compose.vps.yml

# Ensure required keys exist without printing secrets
need_regen=0
for k in POSTGRES_PASSWORD MINIO_ROOT_USER MINIO_ROOT_PASSWORD APP_URL NEXTAUTH_SECRET CRON_SECRET AGENT_BRIDGE_SECRET; do
  if ! grep -q "^${k}=" .env 2>/dev/null || grep -q "^${k}=$" .env 2>/dev/null || grep -q "^${k}=\"\"$" .env 2>/dev/null; then
    echo "missing $k"
    need_regen=1
  fi
done

if [ "$need_regen" = "1" ]; then
  PW=$(openssl rand -hex 16)
  SECRET=$(openssl rand -hex 32)
  CRON=$(openssl rand -hex 16)
  BRIDGE=$(openssl rand -hex 16)
  cat > .env <<EOF
CRM_DOMAIN=crm.gsms-security.com
APP_URL=https://crm.gsms-security.com
POSTGRES_PASSWORD=${PW}
DATABASE_URL=postgresql://postgres:${PW}@db:5432/crm?schema=public
NEXTAUTH_SECRET=${SECRET}
NEXTAUTH_URL=https://crm.gsms-security.com
ALLOWED_SIGN_IN=
AGENT_BRIDGE_SECRET=${BRIDGE}
CRON_SECRET=${CRON}
MINIO_ROOT_USER=crmminio
MINIO_ROOT_PASSWORD=${PW}
S3_BUCKET=crm-blob
S3_PUBLIC_URL=https://crm.gsms-security.com/blob/crm-blob
CRM_TELEMETRY_DISABLED=1
EOF
  echo "wrote lab .env"
fi

# Compose needs env vars from .env in cwd when interpolating
set -a
# shellcheck disable=SC1091
source .env
set +a

docker compose --env-file .env -f deploy/vps/docker-compose.vps.yml up -d db redis minio
sleep 8
docker compose --env-file .env -f deploy/vps/docker-compose.vps.yml up -d --build migrate minio-init
docker compose --env-file .env -f deploy/vps/docker-compose.vps.yml up -d --build api agent app cron
docker compose --env-file .env -f deploy/vps/docker-compose.vps.yml ps
echo SMOKE
curl -s -m 10 -o /dev/null -w "api=%{http_code}\n" http://127.0.0.1:3041/health || true
curl -s -m 10 -o /dev/null -w "app=%{http_code}\n" http://127.0.0.1:3040/ || true
