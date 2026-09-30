#!/bin/bash
set -euo pipefail
ls -la /tmp/crm-vps.tgz
mkdir -p /opt/gsms/crm
cd /opt/gsms/crm
tar -xzf /tmp/crm-vps.tgz
# Ensure vps compose present (may be in tarball already)
ls deploy/vps/docker-compose.vps.yml
ls deploy/nuc/Dockerfile.api

# Lab .env if missing (smoke only — replace with NUC secrets for real data)
if [ ! -f .env ]; then
  PW=$(openssl rand -hex 16)
  SECRET=$(openssl rand -hex 32)
  CRON=$(openssl rand -hex 16)
  BRIDGE=$(openssl rand -hex 16)
  cat > .env <<EOF
CRM_DOMAIN=crm.global-it-ss.com
APP_URL=https://crm.global-it-ss.com
POSTGRES_PASSWORD=${PW}
DATABASE_URL=postgresql://postgres:${PW}@db:5432/crm?schema=public
NEXTAUTH_SECRET=${SECRET}
NEXTAUTH_URL=https://crm.global-it-ss.com
ALLOWED_SIGN_IN=
AGENT_BRIDGE_SECRET=${BRIDGE}
CRON_SECRET=${CRON}
MINIO_ROOT_USER=crmminio
MINIO_ROOT_PASSWORD=${PW}
S3_BUCKET=crm-blob
S3_PUBLIC_URL=https://crm.global-it-ss.com/blob/crm-blob
CRM_TELEMETRY_DISABLED=1
EOF
  echo "created lab .env"
else
  echo ".env already present"
fi

# Build can take long — start db/redis/minio first then build apps
cd /opt/gsms/crm
docker compose -f deploy/vps/docker-compose.vps.yml up -d db redis minio
sleep 5
docker compose -f deploy/vps/docker-compose.vps.yml up -d --build migrate minio-init api agent app cron
echo DONE
docker compose -f deploy/vps/docker-compose.vps.yml ps
