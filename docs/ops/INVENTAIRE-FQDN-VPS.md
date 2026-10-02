# Inventaire FQDN VPS — `*.gsms-security.com`

**IP VPS :** `187.77.166.124`  
**Règle :** un FQDN = une stack Docker = sa base. **Pas** de double Host Traefik.  
**Apex :** `gsms-security.com` = landing + plateforme (`apps/web` + `apps/core`).

Ancien domaine lab/prod `*.global-it-ss.com` : à retirer des routeurs plateforme une fois la bascule smoke OK (pas en parallèle).

---

## A. Déjà sur le VPS (bascule FQDN seule)

| App | Ancien FQDN | Nouveau FQDN | Compose Traefik | Smoke IP |
|-----|-------------|--------------|-----------------|----------|
| Platform web+core | — | `gsms-security.com` | `deploy/docker-compose.traefik*.yml` | déjà prod |
| CRM / Eve | `crm.global-it-ss.com` | `crm.gsms-security.com` | `apps/crm/deploy/vps/docker-compose.vps.yml` | `:3040` |
| MinIO console (CRM) | `minio.global-it-ss.com` | `minio.gsms-security.com` | idem | `:9001` |
| GRACE | `grace.global-it-ss.com` | `grace.gsms-security.com` | `apps/grace/deploy/vps/docker-compose.vps.yml` | `:3052` |
| QAtrial | `qatrial.global-it-ss.com` | `qatrial.gsms-security.com` | `apps/qatrial/deploy/vps/docker-compose.vps.yml` | `:3051` |
| TenderAI MCP | `mcp.global-it-ss.com` | `mcp.gsms-security.com` | `apps/tenderai-mcp-server-max/deploy/vps/docker-compose.vps.yml` | `:8090` |
| Admin sondes | `admin.global-it-ss.com` | `admin.gsms-security.com` | `apps/crm/deploy/vps/admin/docker-compose.vps.yml` | `:3055` |

**DNS A (tous → `187.77.166.124`) :**  
`crm` · `grace` · `qatrial` · `mcp` · `minio` · `admin` (+ apex déjà fait).

**Après DNS + labels :** rebuild/recreate stack concernée, smoke HTTPS, **puis** couper l’ancien Host / DNS `global-it-ss.com` pour cette app.

**`.env` CRM à aligner sur le VPS :**
```
CRM_DOMAIN=crm.gsms-security.com
APP_URL=https://crm.gsms-security.com
NEXTAUTH_URL=https://crm.gsms-security.com
ALLOWED_SIGN_IN=gsms-security.com
S3_PUBLIC_URL=https://crm.gsms-security.com/blob/crm-blob
```
**GRACE :** `CORS_ORIGIN=https://grace.gsms-security.com`

---

## B. Pas encore / hors scope VPS plateforme (deploy préparé ou reporté)

| App | FQDN cible | État | Notes |
|-----|------------|------|-------|
| DocuLens | `doculens.gsms-security.com` (proposé) | **pas sur VPS** | stack à préparer ; pas dans le monorepo Traefik actuel |
| Tenant Core (portail client) | `client.gsms-security.com` (proposé) | **pas sur VPS** | lab local ; pas fusionné dans `web` |
| Comp AI GRC | — | **STOPPED** (OOM) | hors circuit ; ne pas remonter sans GO |
| Memory Hub | `hub.gsms-security.com` (si GO) | **reste NUC** | doctrine Jarvis / Tencent |
| Memory Proxy | `memory.gsms-security.com` (si GO) | **reste NUC** | idem |

---

## C. Modèle cible (rappel)

```
Internet
  └─ Traefik :443
       ├─ gsms-security.com          → web → core → db plateforme
       ├─ crm.gsms-security.com      → stack CRM (db propre)
       ├─ grace.gsms-security.com    → stack Grace (db propre)
       ├─ qatrial.gsms-security.com  → stack QAtrial (db propre)
       └─ mcp.gsms-security.com      → TenderAI MCP
Core = pont HTTP vers les stacks ; CRM+Eve = commercial / intake.
```

## D. Ordre ops (sans couper la prod d’un coup)

1. DNS A des sous-domaines `*.gsms-security.com` → VPS (tu dis : déjà prêts).
2. Pull repo + recreate stacks A (labels déjà `*.gsms-security.com` dans ce commit).
3. Smoke HTTPS par FQDN.
4. Retirer Host / DNS `*.global-it-ss.com` app par app.
5. Ensuite seulement : DocuLens / Tenant Core si GO.
