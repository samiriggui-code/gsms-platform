#!/usr/bin/env bash
set -euo pipefail
ADMIN_KEY=$(cat /opt/gsms/tencent-memory/global-images/.admin-key)
CORE=http://127.0.0.1:8420
OUT=/tmp/gsms-cursor-new-key.txt

post() {
  local path="$1" body="$2"
  local code
  code=$(curl -sS -o /tmp/out.json -w "%{http_code}" \
    -H 'Content-Type: application/json' \
    -H "x-tdai-user-key: ${ADMIN_KEY}" \
    -H 'x-tdai-service-id: default' \
    -d "$body" \
    "${CORE}${path}" || echo 000)
  echo "=== ${code} ${path} ==="
  cat /tmp/out.json; echo
}

# Dump schema snippets
docker exec tdai-memory-core sh -c 'grep -n "userCreate\|UserKey\|user_key\|create-with-key\|userKey" /app/src/metadata/router/v3-meta-schemas.ts | sed -n "1,80p"'

# Create dedicated Cursor user with explicit key
NEW_KEY="sk-mem-cursor-$(openssl rand -hex 16)"
post /v3/meta/user/create-with-key "{\"username\":\"cursor-gsms\",\"display_name\":\"Cursor GSMS\",\"user_type\":\"developer\",\"user_key\":\"${NEW_KEY}\"}"
post /v3/meta/user/create "{\"username\":\"cursor-gsms2\",\"display_name\":\"Cursor GSMS 2\",\"user_type\":\"developer\"}"
post /v3/meta/user-key/create "{\"name\":\"cursor-gsms\"}"
post /v3/meta/user-key/list "{}"
post /v3/meta/auth/verify "{\"user_key\":\"${NEW_KEY}\"}"

{
  echo "NEW_KEY_ATTEMPT=${NEW_KEY}"
  echo "ADMIN_KEY=${ADMIN_KEY}"
  echo "LAST_BODY=$(cat /tmp/out.json | tr '\n' ' ')"
} > "$OUT"
chmod 600 "$OUT"
cat "$OUT"
