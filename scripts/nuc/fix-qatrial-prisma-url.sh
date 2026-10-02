#!/usr/bin/env bash
set -euo pipefail
cd /opt/gsms/qatrial
cat > server/prisma/prisma.config.ts <<'EOF'
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://qatrial:qatrial@db:5432/qatrial',
  },
  migrate: {
    async url() {
      return process.env.DATABASE_URL ?? 'postgresql://qatrial:qatrial@db:5432/qatrial';
    },
  },
});
EOF

cat > docker-compose.yml <<'EOF'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://qatrial:qatrial@db:5432/qatrial
      - JWT_SECRET=${JWT_SECRET:-qatrial-production-secret-change-me-32chars-min}
      - AI_PROVIDER_TYPE=${AI_PROVIDER_TYPE:-}
      - AI_PROVIDER_URL=${AI_PROVIDER_URL:-}
      - AI_PROVIDER_KEY=${AI_PROVIDER_KEY:-}
      - AI_PROVIDER_MODEL=${AI_PROVIDER_MODEL:-}
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - uploads:/app/uploads
      - ./server/prisma/prisma.config.ts:/app/server/prisma/prisma.config.ts:ro
    command: ["sh", "-c", "npx prisma db push --schema=server/prisma/schema.prisma --accept-data-loss && npx tsx server/index.ts"]
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=qatrial
      - POSTGRES_PASSWORD=qatrial
      - POSTGRES_DB=qatrial
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U qatrial"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pgdata:
  uploads:
EOF

docker compose up -d --force-recreate app
sleep 25
docker compose ps
curl -sS -o /dev/null -w 'qatrial:%{http_code}\n' http://127.0.0.1:3001/ || true
docker compose logs app --tail=40
