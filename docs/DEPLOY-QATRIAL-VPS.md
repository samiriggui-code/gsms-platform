# QAtrial — déploiement VPS

**FQDN :** `qatrial.global-it-ss.com` (A → VPS)  
**Smoke :** `http://187.77.166.124:3051` → 200

## Setup

```bash
cd /opt/gsms/qatrial
# .env : POSTGRES_PASSWORD, JWT_SECRET (>=32)
docker compose --env-file .env -f deploy/vps/docker-compose.vps.yml up -d --build
```

## DNS (après smoke)

A `qatrial` → `187.77.166.124` puis LE Traefik.
