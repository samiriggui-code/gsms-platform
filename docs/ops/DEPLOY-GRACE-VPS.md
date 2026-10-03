# Grace (CSMP) — déploiement VPS

**FQDN :** `grace.gsms-security.com` (A → VPS)  
**Smoke :** `http://187.77.166.124:3052` → 200 · `/healthz` → 200

## Setup

```bash
cd /opt/gsms/grace
# .env : POSTGRES_PASSWORD, JWT_SECRET, CORS_ORIGIN=https://grace.gsms-security.com
docker compose --env-file .env -f deploy/vps/docker-compose.vps.yml up -d --build
```

Traefik pointe sur `web` (nginx) ; `/api` est proxifié vers `api:3001` dans le container.

## DNS (après smoke)

A `grace` → `187.77.166.124` puis LE Traefik.
