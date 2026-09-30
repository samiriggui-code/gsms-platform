# Comp CRM — déploiement VPS Hostinger

**VPS :** `187.77.166.124` · Traefik déjà en place (Comp).  
**NUC :** lab `http://192.168.1.37` via Caddy — DB `crm` séparée de Comp AI.  
**FQDN :** `crm.global-it-ss.com` (A encore NUC jusqu’au GO).

## Ordre migration GSMS (après Comp)

| # | App | FQDN | État |
|---|-----|------|------|
| 1 | Comp AI | `comp.global-it-ss.com` | **VPS + DNS** |
| 2 | Comp CRM / Eve | `crm.global-it-ss.com` | en cours |
| 3 | TenderAI MCP | `mcp.global-it-ss.com` | à faire |
| 4 | QAtrial | `qatrial.global-it-ss.com` | à faire |
| 5 | GRACE | `grace.global-it-ss.com` | à faire |
| — | InvoicePilot vitrine | `global-it-ss.com` | déjà VPS |
| — | Hub / Memory / Tencent | `hub` / `memory` | **reste NUC** |

## État (2026-09-05)

| Service | Conteneur | Smoke |
|---------|-----------|-------|
| API | `gsms-crm-api` | `http://187.77.166.124:3041/health` → **200** |
| App | `gsms-crm-app` | `http://187.77.166.124:3040/` → **307** |
| Postgres / Redis / MinIO / Eve | `gsms-crm-*` | UP |

**DNS :** A `crm` encore NUC — attendre GO.  
**Données :** stack lab fraîche (migrate). Dump NUC → restore si tu veux la prod Deal/Contact.


## Commandes

```bash
cd /opt/gsms/crm
# .env à la racine CRM (secrets) — copier depuis NUC /root/crm/.env si données réelles
docker compose -f deploy/vps/docker-compose.vps.yml up -d --build
```

## Données

- Postgres volume `gsms_crm_pg` — **pas** partagé avec Comp.
- Pour reprendre la prod NUC : `pg_dump` depuis NUC → `pg_restore` dans `gsms-crm-postgres`.
- MinIO volume `gsms_crm_minio` idem (blobs).

## DNS (GO user)

A `crm` : `82.66.254.106` → `187.77.166.124`  
Puis Let’s Encrypt via Traefik (`crm-app` certresolver). Rollback snapshot Hostinger avant mutation.
