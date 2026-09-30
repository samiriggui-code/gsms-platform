# Comp AI — déploiement VPS Hostinger

> **OBSOLÈTE 2026-09-06.** Comp AI GRC hors stack — ne plus déployer.  
> Salvage : `docs/circuit/controls/` · plan : `COMP-AI-DECOMPOSITION.md`.  
> Purge restante : NUC `/opt/gsms/comp` puis VPS `gsms-comp-*` (GO user).  
> CRM (`apps/crm`) n’est **pas** concerné.

**VPS :** `server.hosting-global-it-ss.com` · `187.77.166.124` · KVM 8 (8 vCPU / 32 Go)  
**NUC :** lab via **IP** `http://192.168.1.37:3030` — voir doctrine [`GSMS_NUC_VPS_SPLIT.md`](./GSMS_NUC_VPS_SPLIT.md).  
**Déploiement VPS :** autre agent. **Tencent / clés :** hors périmètre (reste NUC).

## Principe (historique — ne plus suivre pour Comp GRC)

1. Déployer Comp sur VPS (ports `3030` / `3333` + labels Traefik).
2. Smoke via `http://187.77.166.124:3030` **avant** bascule DNS.
3. Quand GO : changer A `comp.global-it-ss.com` → `187.77.166.124` (pas le NUC Freebox).
4. Traefik + Let’s Encrypt prend le relais HTTPS.
5. Garder NUC stoppé ou lab léger pour tests IP uniquement.

**Ne pas** déplacer la vitrine apex : `global-it-ss.com` / `www` sont déjà sur ce VPS.  
**Ne pas** migrer `hub` / `memory` / `tdai-*` avec Comp.

## DNS (quand tu dis GO)

| FQDN | Avant (NUC Freebox) | Après (VPS) |
|------|---------------------|-------------|
| `comp.global-it-ss.com` | `82.66.254.106` | `187.77.166.124` |

Autres sous-domaines (qatrial, grace, …) : migrer **un par un** après Comp.

## Commandes VPS

```bash
cd /opt/gsms/comp
docker compose -f docker-compose.vps.yml up -d --build
docker logs -f gsms-comp-app
```

Login lab : `samir@gsms.local` / `gsms-local`

## État (2026-09-05)

| Service | Conteneur | Smoke |
|---------|-----------|-------|
| API Nest | `gsms-comp-api` | `http://127.0.0.1:3333/api/auth/get-session` → **200** |
| App Next | `gsms-comp-app` | `http://187.77.166.124:3030/` → **307** (redirect auth) |
| Postgres | `gsms-comp-postgres` | healthy |

**Build :** one-shot `scripts/gsms-vps-app-build.sh` (native bindings + `SKIP_TYPECHECK=1`), puis start réutilise `.next/BUILD_ID`.  
**DNS :** A `comp.global-it-ss.com` → **`187.77.166.124`** (2026-09-05). Rollback snapshot `178317451`.

### Rebuild / restart

```bash
# Build (hors boucle restart)
docker run --rm --name gsms-comp-build -v /opt/gsms/comp:/app -w /app --network gsms-comp \
  -e SKIP_TYPECHECK=1 -e SKIP_ENV_VALIDATION=1 -e NODE_ENV=production \
  -e NODE_OPTIONS=--max-old-space-size=6144 \
  -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/comp \
  gsms-comp-app:dev bash /app/scripts/gsms-vps-app-build.sh

docker start gsms-comp-app
```

