#!/bin/bash
set -euo pipefail
cd /opt/gsms/crm
# Fix required ALLOWED_SIGN_IN without dumping secrets
if grep -q '^ALLOWED_SIGN_IN=$' .env 2>/dev/null || ! grep -q '^ALLOWED_SIGN_IN=' .env 2>/dev/null; then
  if grep -q '^ALLOWED_SIGN_IN=' .env; then
    sed -i 's/^ALLOWED_SIGN_IN=.*/ALLOWED_SIGN_IN=global-it-ss.com/' .env
  else
    echo 'ALLOWED_SIGN_IN=global-it-ss.com' >> .env
  fi
  echo "set ALLOWED_SIGN_IN"
else
  # empty quoted value
  sed -i 's/^ALLOWED_SIGN_IN=""$/ALLOWED_SIGN_IN=global-it-ss.com/' .env
  sed -i "s/^ALLOWED_SIGN_IN=''$/ALLOWED_SIGN_IN=global-it-ss.com/" .env
  echo "normalized ALLOWED_SIGN_IN"
fi
# ensure non-empty
val=$(grep '^ALLOWED_SIGN_IN=' .env | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
if [ -z "$val" ]; then
  sed -i 's/^ALLOWED_SIGN_IN=.*/ALLOWED_SIGN_IN=global-it-ss.com/' .env
  echo "forced ALLOWED_SIGN_IN"
fi
grep -c '^ALLOWED_SIGN_IN=.' .env || true
docker compose --env-file .env -f deploy/vps/docker-compose.vps.yml up -d api
sleep 8
docker ps -a | grep gsms-crm-api
curl -s -m 10 -o /dev/null -w "api=%{http_code}\n" http://127.0.0.1:3041/health
curl -s -m 10 -o /dev/null -w "app=%{http_code}\n" http://127.0.0.1:3040/
docker logs gsms-crm-api --tail 15 2>&1
