#!/bin/bash
set -e
echo "=== users ==="
docker exec gsms-comp-postgres psql -U postgres -d comp -c 'SELECT id, email, "emailVerified", role, "isPlatformAdmin" FROM "user" ORDER BY "createdAt" DESC LIMIT 20;'
echo "=== orgs ==="
docker exec gsms-comp-postgres psql -U postgres -d comp -c 'SELECT id, name, slug FROM organization LIMIT 10;'
echo "=== members ==="
docker exec gsms-comp-postgres psql -U postgres -d comp -c 'SELECT id, "userId", "organizationId", role FROM member LIMIT 10;'
echo "=== account/session tables ==="
docker exec gsms-comp-postgres psql -U postgres -d comp -c '\dt' | grep -iE 'user|account|session|member|org' | head -30
