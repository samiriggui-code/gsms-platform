#!/usr/bin/env bash
# Collect GSMS VPS credentials → /tmp/gsms-vps-creds.txt (chmod 600)
set -euo pipefail
OUT=/tmp/gsms-vps-creds.txt
umask 077
{
  echo "=== GSMS VPS credentials $(date -u +%Y-%m-%dT%H:%MZ) ==="
  echo
  echo "## Comp CRM (/opt/gsms/crm/.env)"
  grep -E '^(APP_URL|POSTGRES_PASSWORD|MINIO_ROOT_USER|MINIO_ROOT_PASSWORD|BETTER_AUTH_SECRET|CRON_SECRET|DATABASE_URL|ALLOWED_SIGN)' /opt/gsms/crm/.env 2>/dev/null || true
  echo
  echo "## Comp AI (/opt/gsms/comp/.env)"
  if [[ -f /opt/gsms/comp/.env ]]; then
    grep -E 'PASSWORD|SECRET|EMAIL|USER|DATABASE|AUTH|JWT|SEED|ADMIN' /opt/gsms/comp/.env 2>/dev/null | head -50 || true
  else
    echo "(no .env file — lab login often samir@gsms.local / gsms-local)"
  fi
  echo
  echo "## QAtrial"
  cat /opt/gsms/qatrial/.env 2>/dev/null || true
  echo
  echo "## Grace"
  cat /opt/gsms/grace/.env 2>/dev/null || true
  echo
  echo "## TenderAI MCP"
  grep -E '^(MCP_|ANTHROPIC|API_KEY|BEARER|TRANSPORT|HOST|PORT)' /opt/gsms/tenderai-mcp/.env 2>/dev/null || true
  echo
  echo "## Tencent Memory admin-key"
  echo -n "ADMIN_KEY="; cat /opt/gsms/tencent-memory/global-images/.admin-key; echo
  echo
  echo "## Memory public / ports"
  grep -E '^(MEMORY_HUB_PROXY_PUBLIC_URL|PROXY_PORT|PANEL_PORT|MEMORY_CORE_PORT|KNOWLEDGE_)' /opt/gsms/tencent-memory/global-images/.env 2>/dev/null || true
  echo
  echo "## Admin UI basic_auth"
  echo "user=admin@global-it-ss.com"
  echo "note=password = same as NUC Caddy basic_auth for status.json"
  echo
  echo "## Smoke ports host"
  echo "crm:3040 qatrial:3051 grace:3052 admin:3055 mcp:8090 hub:8125 memory:8096 minio:9001 core:8420"
} > "$OUT"
chmod 600 "$OUT"
echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
