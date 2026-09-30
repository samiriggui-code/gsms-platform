#!/bin/bash
set -e
# Force ACME for comp.global-it-ss.com now that DNS points to this VPS.
# Keep certresolver only on app router to avoid duplicate LE orders.
cd /opt/gsms/comp

# Patch running container labels via compose recreate after editing yml
python3 - <<'PY'
from pathlib import Path
p = Path("docker-compose.vps.yml")
text = p.read_text()
old = "      - traefik.http.routers.comp-api.tls.certresolver=letsencrypt\n"
new = "      - traefik.http.routers.comp-api.tls=true\n"
if old in text:
    p.write_text(text.replace(old, new, 1))
    print("patched: api tls=true (no duplicate certresolver)")
else:
    print("api certresolver line already patched or missing")
PY

docker compose -f docker-compose.vps.yml up -d --force-recreate api app
echo "restart traefik..."
docker restart traefik-mvbo-traefik-1
sleep 20
echo "=== cert now ==="
echo | openssl s_client -connect 127.0.0.1:443 -servername comp.global-it-ss.com 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>&1 | head -10
echo "=== traefik log ==="
docker logs traefik-mvbo-traefik-1 --since 2m 2>&1 | grep -iE 'comp\.global|Unable to obtain|Certificate obtained|acme' | tail -25
