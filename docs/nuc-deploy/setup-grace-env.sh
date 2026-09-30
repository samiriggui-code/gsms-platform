#!/usr/bin/env bash
set -euo pipefail
cd /opt/gsms/grace/docker
PW=$(openssl rand -hex 16)
JWT=$(openssl rand -hex 32)
umask 077
cat > .env <<EOF
POSTGRES_USER=csmp
POSTGRES_PASSWORD=${PW}
POSTGRES_DB=csmp_v2
DATABASE_URL=postgresql://csmp:${PW}@postgres:5432/csmp_v2?schema=public
JWT_SECRET=${JWT}
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://192.168.1.37:3020,http://localhost:3020
WEB_HOST_PORT=3020
API_HOST_PORT=3011
EOF
chmod 600 .env
echo "ENV_KEYS:"
cut -d= -f1 .env
echo "COMPOSE_PORTS:"
docker compose -f docker-compose.yml config | awk '/published:/{print}'
