# Audit — Tenant Core / portail (`apps/tenant-core`)

**Date :** 2026-10-02 · **Décision V2 :** modèle d'identité **MERGE INTO CORE** (réécrit en Python dans `apps/core`) · UI **EXTRACT → `apps/web`** · backend Hono **REMOVE** après bascule

## Identité
- **Origine :** code GSMS neuf (pas un fork), aucune licence tierce. UI inspirée d'InvoicePilot (shadcn) et de DocuLens (tokens, notifications).
- **Stack :** package unique `@gsms/tenant-core`.
  - API : Hono 4 + Prisma 6 + Postgres, zod, jose, bcryptjs (`:3090`).
  - Web : Vite 8 + React 19 + TanStack Router + Tailwind 4 + shadcn + zustand + i18next + `@react-pdf/renderer` (`:5190`).
  - **`db push` seulement**, pas de migrations.

## Données
- **Modèles :**
  - `User` ;
  - `Organization` ;
  - `Workspace` (id = `workspace_id` canonique, 1 workspace = 1 établissement, `crmCompanyId?`) ;
  - `Membership` (user ↔ org, `role` string).
- **Limites :**
  - membership au niveau org, pas site ;
  - rôles non typés ;
  - matrice de permissions **uniquement côté front** (`src/lib/roles.ts`) ;
  - pas d'invitation, de reset, d'audit, de sessions.
- Les docs de référence citées (`gsms-core/docs/WORKSPACE_ID_CONTRACT.md`, `STACK_TENANT_PORTAIL.md`, `PORTAIL_CLIENT_IA_V1.md`, `TENANT_CORE_OPENAPI.md`) **n'ont jamais été poussées**. Le contrat est repris dans le modèle du Core (V2 § 11).

## API
- **Routes :**
  - `/api/auth/{login,logout,me}` ;
  - `/api/workspaces` + `/switch` (re-signature du JWT) ;
  - `/api/members` ;
  - BFF `/api/bff/*` (dashboard, prestations, documents, échanges, finance, pdf, sign).
- **Couverture OpenAPI partielle :** 13 opérations.
- **Auth :** JWT HS256 en cookie httpOnly 7 j, **sans `Secure`**, sans refresh ni révocation, premier membership pris au login, pas de rate-limit.
- **Intégration réelle :** CRM seulement (`x-api-key`, `/rest/companies|deals`) ; documents, échanges et finance = **mocks** (`server/lib/mock-data.ts`, 549 lignes).

## UI (meilleure coque applicative du dépôt)
- Shell responsive avec sélecteur de site et tiroir mobile.
- Login brandé `AuthBrandedLayout`.
- Notifications (pattern DocuLens).
- Plaquette devis React + PDF.
- Pages prestations / finance / documents / profil / paramètres.
- i18n FR/EN, 23 primitives shadcn, tokens HSL clair / sombre, Manrope / DM Mono.

## Tests / CI / poids
- **Aucun test, aucune CI, aucun Dockerfile.** `tsconfig.tsbuildinfo` est commité.
- **26 Mo, dont `public/` = 25 Mo de média Metronic.** Seuls `media/flags/france.svg` et `united-states.svg` sont utilisés ; doublon mal encodé `t├®l├®chargement.jpg`.

## Actions V2
1. Réécrire le modèle dans `apps/core/gsms_core/identity` : membership par site, rôles enum, autorisation serveur, migrations Alembic, cookie `Secure`, rate-limit, choix d'organisation.
2. Script de migration des données `tenant_core` → `gsms_core`.
3. Porter Shell, login, notifications, plaquette PDF et i18n dans `apps/web`.
4. Purger `public/media` (hors drapeaux) ; supprimer `mock-data.ts`.
5. Retirer le backend Hono quand `apps/web` + Core couvrent le portail.
