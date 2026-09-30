#!/usr/bin/env bash
# Create a Cursor-dedicated TDAI user API key on VPS memory-core if possible.
set -euo pipefail
ADMIN_KEY=$(cat /opt/gsms/tencent-memory/global-images/.admin-key)
CORE=http://127.0.0.1:8420
HUB=http://127.0.0.1:8125
PROXY=http://127.0.0.1:8096

echo "admin_key_len=${#ADMIN_KEY}"
echo "=== discover paths ==="
for u in \
  "$CORE/openapi.json" \
  "$CORE/docs" \
  "$CORE/v3/meta/health" \
  "$CORE/health" \
  "$CORE/v3/" \
  "$HUB/" \
  "$PROXY/" \
  "$PROXY/health"
 do
  code=$(curl -sS -o /tmp/tdai_probe.body -w "%{http_code}" "$u" || echo 000)
  echo "$code $u"
done

# Try common key-create endpoints with admin key
NEW_NAME="cursor-gsms-$(date +%Y%m%d)"
BODY=$(printf '{"name":"%s","label":"cursor"}' "$NEW_NAME")

try_post() {
  local url="$1" hdr="$2"
  echo "POST $url ($hdr)"
  if [[ "$hdr" == "x" ]]; then
    curl -sS -o /tmp/tdai_create.json -w " code=%{http_code}\n" \
      -H "Content-Type: application/json" \
      -H "x-tdai-user-key: $ADMIN_KEY" \
      -d "$BODY" "$url" || true
  else
    curl -sS -o /tmp/tdai_create.json -w " code=%{http_code}\n" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ADMIN_KEY" \
      -d "$BODY" "$url" || true
  fi
  head -c 800 /tmp/tdai_create.json; echo
}

for path in \
  /v3/meta/auth/api-keys \
  /v3/meta/api-keys \
  /v3/api-keys \
  /v3/meta/user/api-keys \
  /v3/meta/keys \
  /api/keys
 do
  try_post "$CORE$path" x
  try_post "$CORE$path" b
done

# Proxy Anthropic-compatible smoke with admin key
echo "=== proxy claude-code base ==="
curl -sS -o /tmp/tdai_proxy.json -w "proxy:%{http_code}\n" \
  -H "Authorization: Bearer $ADMIN_KEY" \
  -H "x-tdai-user-key: $ADMIN_KEY" \
  "$PROXY/claude-code/default/v1/models" || true
head -c 400 /tmp/tdai_proxy.json; echo

echo "ADMIN_KEY=$ADMIN_KEY"
echo "CURSOR_BASE_URL=https://memory.global-it-ss.com/claude-code/default"
echo "CURSOR_AUTH_TOKEN=$ADMIN_KEY"
