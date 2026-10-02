# GSMS Tenant Core + Portail client

> **V2 (2026-10-02) :** ce POC est **en cours d'absorption** — modèle identité/workspace réécrit dans [`../core`](../core/README.md), UI (Shell, login, notifications, plaquette PDF) portée dans [`../web`](../web/README.md). Voir [`../../audits/tenant-core/AUDIT.md`](../../audits/tenant-core/AUDIT.md).


**Un seul package** (`apps/tenant-core`) — comme QAtrial : API Hono + front Vite.

| Couche | Stack |
|--------|--------|
| API | Hono · Prisma · **Postgres** · JWT cookie |
| Front | Vite · React 19 · TanStack Router · Tailwind 4 |
| Ports | API `:3090` · Web `:5190` (proxy `/api`) |

## Setup

```bash
cd apps/tenant-core
# Créer la DB Postgres une fois :
#   CREATE DATABASE tenant_core;
cp .env.example .env   # si besoin
bun install
bun run setup          # prisma generate + db push + seed
bun run dev            # api + web
```

- Portail : http://localhost:5190  
- Login seed : `client@demo.gsms.local` / `Demo!2026`  
- 2 workspaces : Lyon + Paris (sélecteur site)

## Modèle

`Organization` → `Workspace` (= `workspace_id` UUID établissement) → `Membership`
