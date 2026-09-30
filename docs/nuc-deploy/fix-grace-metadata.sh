#!/usr/bin/env bash
set -euo pipefail
mkdir -p /opt/gsms/grace/server/prisma/migrations/21_assessment_metadata
cp /tmp/21_assessment_metadata.sql /opt/gsms/grace/server/prisma/migrations/21_assessment_metadata/migration.sql
docker exec -i csmp-v2-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < /tmp/21_assessment_metadata.sql
echo ALTER_OK
curl -sS -m 5 http://127.0.0.1:3020/api/healthz
echo
