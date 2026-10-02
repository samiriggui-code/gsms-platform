# Audit — CRM + Eve (`apps/crm`)

**Date :** 2026-10-02 · **Décision V2 :** KEEP + ADAPT (service commercial + assistant transverse)

## Identité
- **Origine :** « Comp AI CRM » (`trycompai/crm` v1.15.3), CRM open source « agentic-first ». Ce n'est **pas** la plateforme GRC Comp AI (retirée).
- **Licence :** MIT, © 2026 Comp AI. Patterns UI DocuLens attribués dans `apps/app/components/compliance-desk/ATTRIBUTION.md`.
- **Stack :**
  - monorepo : Turborepo 2.10, Bun 1.3.12, Node ≥ 22, TS 5.9 ;
  - `apps/app` : **Next.js 16.3**, React 19.2, Tailwind 4, next-intl 4 ;
  - `apps/api` : NestJS 11 + nestjs-trpc (tRPC 11), trpc-to-openapi, Swagger ;
  - `apps/agent` : framework **eve** 0.29 (AI SDK 7), modèle par défaut `zai/glm-5.3-flash` via AI Gateway ;
  - `packages/` : auth, db (Prisma 7.9, Postgres 17), env, telemetry, ui (~70 composants shadcn), validation (zod 4) ;
  - auth : next-auth v4 (credentials/bcrypt), clés API `crm_…`, SSO.

## Données (source de vérité)
- **Base :** Postgres dédiée, ~60 modèles, 59 migrations (2026-07-31 → 2026-09-03).
- **Possède :** Company, Contact, Deal, Activity, ContactFact/Brief, FieldDefinition/Value, mail/agenda (MailboxSync, EmailThread, CalendarEvent), Slack, tracking web, et les tables Agent* (tâches, runs, audit agent).
- **Mono-workspace :** migration `remove_organizations`, `WORKSPACE_ID = "workspace"`. ⚠ Ce « workspace » n'a **rien à voir** avec le `workspace_id` GSMS (site).
- **Absent :** Mission (seulement un bloc texte `[GSMS_INTAKE]` dans `Deal.description`), Quote/Invoice, stages métier GSMS (pipeline SaaS `DEMO_BOOKED…`).

## API / intégrations
- **tRPC :** 21 routers (~160 procédures). **REST :** `/rest/*` + OpenAPI.
- **Public :** `/api/public/{tender-request,audit-request,contact}`, garde `x-gsms-public-key`, idempotent via `sourceSystem` + `externalId`, crée une AgentTask pour Eve.
- **`/api/trust/findings` + outil Eve `query_findings` :** lisent `GRACE_API_URL/api/findings` et `QATRIAL_API_URL/api/findings` (contrat `shared/contracts/finding.schema.json`).
- **Proxys Next :** `/eve/v1/*` (bridge signé `AGENT_BRIDGE_SECRET`), OAuth Google / Microsoft / Slack.
- **Absent :** aucune référence à TenderAI / LexSocket / MCP / DocuLens / Core.

## UI
- **Application :** `/[slug]/` overview, chat, agents, companies, contacts, deals, compliance (**démo** `DEMO_DOCS`), trust (réel), settings.
- **Landing GSMS :** `app/(landing)` + `components/landing` (33 fichiers), copie FR codée en dur hors next-intl, restes Comp (`github-star-button`, `built-with`, `product-shot`). → **Retenue comme base de la vitrine officielle**, portée dans `apps/web`.

## Tests / CI / déploiement
- **Tests :** ~115 fichiers bun test (agent, api, app, packages) + eval eve.
- **CI :** workflows amont dans `apps/crm/.github/` → **ne tournent pas** depuis la racine du monorepo.
- **Déploiement :**
  - `deploy/nuc` (Postgres, Redis, MinIO, api, agent, app, Caddy, backup) ;
  - `deploy/vps` (Traefik).
  - ⚠ Dockerfiles en `oven/bun:1.2` vs lockfile bun 1.3.12.
- **Télémétrie PostHog amont active par défaut** (`CRM_TELEMETRY_DISABLED=1` pour couper).

## Forces
Code amont de bonne facture (conventions strictes, docs `AGENTS.md`, tests, migrations propres). Intake public idempotent. Eve et ses outils. Kit `@crm/ui`.

## Faiblesses / écarts
- Ajouts GSMS fragiles : landing hors i18n, Compliance Desk 100 % maquette, `trust.controller` qui duplique `findings-client`.
- Le script `mint-tenant-core-key.ts` affiche une clé sur stdout.
- Résidus Better Auth (`BETTER_AUTH_SECRET` en CI).
- Enrichissement de personnes (LinkedIn / Perplexity) peu pertinent et sensible RGPD.

## Actions V2
1. Intake public **appelé par le Core** (Core crée Organization / Workspace / Mission, puis relaie au CRM).
2. Émettre `crm.deal.won|lost|stage_changed` vers `POST {CORE}/api/v1/events/ingest/crm` (HMAC).
3. Stages Deal métier GSMS ; créer Quote / Invoice **dans le CRM**.
4. Eve : ajouter le serveur MCP « gsms » du Core à ses tools (lecture d'abord, écriture en mode proposition).
5. Supprimer le Compliance Desk démo et `trust.controller` (agrégation → Core) ; déplacer la landing vers `apps/web` puis rediriger `(landing)`.
6. Désactiver télémétrie amont, enrichissement de personnes et agent builder en prod GSMS.
7. Brancher la CI du monorepo sur `apps/crm` (typecheck, lint, tests).
