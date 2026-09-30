#!/usr/bin/env bash
set -euo pipefail
PASS='GsmsAdmin2026!'
export PASS
python3 <<'PY'
from pathlib import Path
import os, subprocess
raw = subprocess.check_output(
    ["docker", "run", "--rm", "httpd:2.4-alpine", "htpasswd", "-nbB", "admin@global-it-ss.com", os.environ["PASS"]],
    text=True,
).strip()
b = chr(96)
Path("/opt/gsms/traefik/dynamic/gsms-admin.yaml").write_text(
    f"""http:
  middlewares:
    gsms-admin-auth:
      basicAuth:
        users:
          - "{raw}"
  routers:
    gsms-admin:
      rule: Host({b}admin.global-it-ss.com{b})
      entryPoints: [websecure]
      service: gsms-admin
      tls:
        certResolver: letsencrypt
      priority: 10
    gsms-admin-status:
      rule: Host({b}admin.global-it-ss.com{b}) && Path({b}/status.json{b})
      entryPoints: [websecure]
      service: gsms-admin
      middlewares: [gsms-admin-auth]
      tls:
        certResolver: letsencrypt
      priority: 100
  services:
    gsms-admin:
      loadBalancer:
        servers:
          - url: http://127.0.0.1:3055
"""
)
print("admin_user=admin@global-it-ss.com")
print("admin_pass=" + os.environ["PASS"])
print("wrote gsms-admin.yaml ok")
PY

# QAtrial register
curl -sS -o /tmp/qa_reg.json -w "qatrial_reg:%{http_code}\n" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@gsms.local","password":"admin123","name":"Admin GSMS"}' \
  http://127.0.0.1:3051/api/auth/register || true
head -c 400 /tmp/qa_reg.json; echo

# Dump meta router route list
docker exec tdai-memory-core sh -c "grep -n 'meta/' /app/src/metadata/router/v3-meta-router.ts | head -60"
