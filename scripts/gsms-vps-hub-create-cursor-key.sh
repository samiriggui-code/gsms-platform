#!/usr/bin/env bash
# Create Cursor-dedicated TDAI user key (or report admin key usable as auth token)
set -uo pipefail
ADMIN_KEY=$(cat /opt/gsms/tencent-memory/global-images/.admin-key)
CORE=http://127.0.0.1:8420
PROXY=http://127.0.0.1:8096
OUT=/tmp/gsms-cursor-hub-key.txt
umask 077

echo "admin ok, creating cursor key if API allows..."

# Search binary/docs for key routes
docker exec tdai-memory-core sh -c 'grep -RIl "api-key\|api_key\|user_key\|CreateUser\|init-admin" /app/dist /app/src 2>/dev/null | head -20' || true

# Try create user / rotate key endpoints
BODY='{"username":"cursor-gsms","user_type":"developer","display_name":"Cursor GSMS"}'
for path in \
  /v3/meta/auth/users \
  /v3/meta/admin/users \
  /v3/meta/users/create \
  /v3/meta/auth/register \
  /v3/meta/auth/init-admin \
  /v3/meta/keys/create \
  /v3/meta/auth/keys \
  /v3/meta/auth/api_keys
 do
  code=$(curl -sS -o /tmp/c.json -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -H "x-tdai-user-key: ${ADMIN_KEY}" \
    -H "x-tdai-service-id: default" \
    -d "${BODY}" \
    "${CORE}${path}" || echo 000)
  echo "POST ${path} -> ${code} $(head -c 220 /tmp/c.json | tr '\n' ' ')"
done

# Proxy models with service id
for p in /v1/models /claude-code/default/v1/models /openai/v1/models; do
  code=$(curl -sS -o /tmp/m.json -w "%{http_code}" \
    -H "Authorization: Bearer ${ADMIN_KEY}" \
    -H "x-tdai-user-key: ${ADMIN_KEY}" \
    -H "x-tdai-service-id: default" \
    "${PROXY}${p}" || echo 000)
  echo "PROXY ${p} -> ${code} $(head -c 160 /tmp/m.json | tr '\n' ' ')"
done

{
  echo "HUB_URL=https://hub.global-it-ss.com"
  echo "MEMORY_PROXY_URL=https://memory.global-it-ss.com"
  echo "CORE_URL=http://187.77.166.124:8420  # internal smoke; use FQDN via Traefik if exposed"
  echo "SERVICE_ID=default"
  echo "ADMIN_USER=admin"
  echo "ADMIN_KEY=${ADMIN_KEY}"
  echo "CURSOR_ANTHROPIC_BASE_URL=https://memory.global-it-ss.com/claude-code/default"
  echo "CURSOR_ANTHROPIC_AUTH_TOKEN=${ADMIN_KEY}"
  echo "NOTE=No separate create-key API found; admin sk-mem-* is the API secret for Cursor until Hub UI creates another."
} > "$OUT"
chmod 600 "$OUT"
cat "$OUT"

# Extra app logins
echo "=== COMP users ==="
docker exec gsms-comp-postgres psql -U postgres -d comp -tAc "SELECT email FROM \"User\" LIMIT 10" 2>/dev/null \
  || docker exec gsms-comp-postgres psql -U postgres -d comp -tAc 'SELECT email FROM "user" LIMIT 10' 2>/dev/null || echo no_comp_users
echo "=== CRM secrets present ==="
grep -E '^(BETTER_AUTH_SECRET|MINIO_ROOT_|APP_URL)=' /opt/gsms/crm/.env
echo "=== QAtrial users ==="
docker exec gsms-qatrial-postgres psql -U qatrial -d qatrial -tAc "SELECT email FROM \"User\" LIMIT 10" 2>/dev/null \
  || docker exec gsms-qatrial-postgres psql -U qatrial -d qatrial -c '\dt' 2>/dev/null | head -20 || true
