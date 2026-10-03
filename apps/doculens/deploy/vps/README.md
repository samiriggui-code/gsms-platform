# GSMS Documents — déploiement VPS

Expose `https://doculens.gsms-security.com` derrière Traefik (API FastAPI + frontend + Celery + Timescale + Redis).

## Prérequis

1. DNS **A** `doculens.gsms-security.com` → IP du VPS.
2. Réseau Docker Traefik externe (défaut `proxy`).
3. Secrets alignés avec le Core :
   - `GSMS_PLATFORM_JWT_SECRET` = `jwt_secret` du Core
   - `GSMS_CORE_WEBHOOK_SECRET` = `webhook_secrets.doculens` du Core

## Déploiement

```bash
cd apps/doculens/deploy/vps
cp .env.example .env
# éditer .env
docker compose -f docker-compose.vps.yml up -d --build
curl -fsS https://doculens.gsms-security.com/health/live
```

## Auth

- Bearer JWT Core (`iss=gsms-core`) **ou** compte Documents local **ou** `X-API-Key` de service.
- Header obligatoire : `X-GSMS-Workspace-Id` (sauf si le jeton Core porte déjà `workspace_id`).
