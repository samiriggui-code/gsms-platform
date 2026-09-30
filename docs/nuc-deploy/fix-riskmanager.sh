#!/usr/bin/env bash
set -euo pipefail
cd /opt/gsms/riskmanager/deploy
docker compose down || true
docker rm -f gsms-riskmanager gsms-riskmanager-mysql 2>/dev/null || true
# Drop broken mysql volumes from previous attempts (lab only)
docker volume rm deploy_riskmanager-mysql 2>/dev/null || true
docker compose up -d
echo "Waiting for SimpleRisk..."
for i in $(seq 1 60); do
  code=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:8081/ 2>/dev/null || true)
  if [ "$code" = "200" ] || [ "$code" = "302" ] || [ "$code" = "301" ]; then
    echo "risk UP http=$code"
    curl -sS -I http://127.0.0.1:8081/ | head -12
    exit 0
  fi
  sleep 5
done
echo "TIMEOUT"
docker compose ps
docker logs gsms-riskmanager --tail=40
exit 1
