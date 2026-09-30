#!/bin/bash
set -e
ACME=/var/lib/docker/volumes/traefik-mvbo_traefik-letsencrypt/_data/acme.json
python3 -c '
import json
d=json.load(open("/var/lib/docker/volumes/traefik-mvbo_traefik-letsencrypt/_data/acme.json"))
certs=(d.get("letsencrypt") or {}).get("Certificates") or d.get("Certificates") or []
print("certs", len(certs))
for c in certs:
    dom=c.get("domain") or {}
    print("-", dom.get("main"), dom.get("sans"))
'
echo "=== challenge http ==="
curl -sI -m 5 -H "Host: comp.global-it-ss.com" "http://127.0.0.1/.well-known/acme-challenge/test" | head -20
echo "=== labels ==="
docker inspect gsms-comp-app --format '{{json .Config.Labels}}' | tr ',' '\n' | grep traefik | head -20
docker inspect gsms-comp-api --format '{{json .Config.Labels}}' | tr ',' '\n' | grep traefik | head -20
echo "=== public dns ==="
getent hosts comp.global-it-ss.com || true
echo "=== recent traefik acme ==="
docker logs traefik-mvbo-traefik-1 --since 30m 2>&1 | grep -iE 'comp\.global|certificate|acme' | tail -20
