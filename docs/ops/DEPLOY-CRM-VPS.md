# Comp CRM — déploiement VPS Hostinger

**VPS :** `187.77.166.124` · Traefik déjà en place (Comp).  
**NUC :** lab `http://192.168.1.37` via Caddy — DB `crm` séparée de Comp AI.  
**FQDN :** `crm.gsms-security.com` (A encore NUC jusqu’au GO).

## Ordre migration GSMS (après Comp)

| # | App | FQDN | État |
|---|-----|------|------|
| 1 | Comp AI | `comp.gsms-security.com` | **VPS + DNS** |
| 2 | Comp CRM / Eve | `crm.gsms-security.com` | en cours |
| 3 | TenderAI MCP | `mcp.gsms-security.com` | à faire |
| 4 | QAtrial | `qatrial.gsms-security.com` | à faire |
| 5 | GRACE | `grace.gsms-security.com` | à faire |
| — | InvoicePilot vitrine | `gsms-security.com` | déjà VPS |
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
