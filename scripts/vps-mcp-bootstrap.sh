#!/bin/bash
set -euo pipefail
mkdir -p /opt/gsms/tenderai-mcp
cd /opt/gsms/tenderai-mcp
tar -xzf /tmp/mcp-vps.tgz
# Lab .env — replace Anthropic key from NUC for real use
if [ ! -f .env ]; then
  cat > .env <<'EOF'
TRANSPORT=http
HOST=0.0.0.0
PORT=8090
MCP_API_KEY=gsms-lab-mcp-key-change-me
OAUTH_ISSUER_URL=
ANTHROPIC_API_KEY=
LLM_MODEL=claude-sonnet-4-5-20241022
LLM_MAX_TOKENS=4096
VOYAGE_API_KEY=
DATABASE_PATH=db/tenderai.db
DATA_DIR=data
COMPANY_NAME=GSMS
DEFAULT_CURRENCY=EUR
DEFAULT_MARGIN_PCT=15
LOG_LEVEL=INFO
EOF
  echo "created lab .env (ANTHROPIC_API_KEY empty — copy from NUC)"
fi
docker compose --env-file .env -f deploy/vps/docker-compose.vps.yml up -d --build
sleep 5
docker ps -a | grep gsms-tenderai
curl -s -m 10 -o /dev/null -w "mcp=%{http_code}\n" http://127.0.0.1:8090/mcp || true
curl -s -m 10 -o /dev/null -w "root=%{http_code}\n" http://127.0.0.1:8090/ || true
docker logs gsms-tenderai-mcp --tail 25 2>&1
