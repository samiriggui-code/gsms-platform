#!/bin/bash
set -e
echo "=== tables ==="
docker exec gsms-comp-postgres psql -U postgres -d comp -c '\dt' | head -100
echo "=== user-like ==="
docker exec gsms-comp-postgres psql -U postgres -d comp -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename ILIKE '%user%' OR tablename ILIKE '%member%' OR tablename ILIKE '%org%') ORDER BY 1;"
echo "=== migrations applied count ==="
docker exec gsms-comp-postgres psql -U postgres -d comp -c "SELECT COUNT(*) FROM _prisma_migrations;" 2>&1 || true
echo "=== migration status via prisma ==="
docker exec -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/comp -w /app/packages/db gsms-comp-api \
  npx prisma migrate status 2>&1 | tail -40
