#!/usr/bin/env bash
set -euo pipefail
ADMIN_KEY=$(cat /opt/gsms/tencent-memory/global-images/.admin-key)
CORE=http://127.0.0.1:8420
PROXY=http://127.0.0.1:8096

# auth verify needs service id — try common values
for sid in default local gateway memory-core tdai open; do
  code=$(curl -sS -o /tmp/ver.json -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -H "x-tdai-user-key: ${ADMIN_KEY}" \
    -H "x-tdai-service-id: ${sid}" \
    -d "{\"user_key\":\"${ADMIN_KEY}\"}" \
    "${CORE}/v3/meta/auth/verify" || echo 000)
  echo "verify sid=${sid} code=${code} body=$(head -c 200 /tmp/ver.json)"
done

# List routes from binary help / embedded
docker exec tdai-memory-core sh -c 'ls /app 2>/dev/null; ls /usr/local/bin 2>/dev/null; which memory-core gateway 2>/dev/null; ps aux' | head -40

# Proxy path discovery
for p in / /health /v1/models /claude-code/default/v1/models /openai/v1/models /proxy/v1/models; do
  code=$(curl -sS -o /tmp/p.json -w "%{http_code}" \
    -H "Authorization: Bearer ${ADMIN_KEY}" \
    -H "x-tdai-user-key: ${ADMIN_KEY}" \
    "${PROXY}${p}" || echo 000)
  echo "proxy ${p} -> ${code} $(head -c 120 /tmp/p.json | tr '\n' ' ')"
done

# Extra CRM / Comp secrets
echo "=== CRM extra ==="
grep -E 'BETTER_AUTH|SECRET|EMAIL|PASSWORD|MINIO' /opt/gsms/crm/.env | head -30
echo "=== COMP docker env ==="
docker inspect gsms-comp-app --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -iE 'PASS|SECRET|EMAIL|USER|AUTH|DATABASE' | head -40 || true
echo "=== COMP API env ==="
docker inspect gsms-comp-api --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -iE 'PASS|SECRET|EMAIL|USER|AUTH|DATABASE' | head -40 || true
