# Audit — GRACE (`apps/grace`)

**Date :** 2026-10-02 · **Décision V2 :** KEEP + ADAPT (service d'audit terrain ; pas de fusion dans le Core)

## Identité
- **Origine :** fork de « GRACE Engine » / CSMP Risk Manager v0.1.0 (`grace-pse/grace`, CI amont `mtspl/csmp_v2`). Packages `@csmp/{server,client,shared}`.
- **Licence :** **AGPL-3.0** + licence commerciale (`COMMERCIAL_LICENSE.md`). ⚠ Copier son code dans le Core rendrait le Core AGPL.
- **Stack :**
  - pnpm 9, Node ≥ 20 ;
  - serveur : Fastify 4.28 + Zod + Swagger, Prisma 5.22, Postgres 16, croner, Puppeteer 23 (PDF) ;
  - client : React 19, Vite 5, TanStack Router, Zustand, Tailwind 4, @xyflow, Leaflet, PWA ;
  - i18n FR/EN maison (FR par défaut).
- **Auth :** JWT HS256 7 jours en localStorage, bcrypt, RBAC 5 rôles. **Ni SSO ni handoff.**

## Données (source de vérité)
- **Base :** Postgres dédiée, ~45 modèles, 40 enums.
- **Possède :**
  - actifs hiérarchiques (SITE > BUILDING > FLOOR > ROOM > EQUIPMENT), clusters, relations ;
  - **Assessment** (assistant 7 étapes), **Threat** 3-A (IRV, priorité, TEAR), Countermeasure, **CountermeasureGap** (≈ constats), Recommendation, ActionPlan ;
  - enquêtes (templates, réponses, scoring AAA, planification) ;
  - packs / modules de référentiels.
- **Mono-tenant :** la migration `20260512_single_tenant` a supprimé `tenant_id` ; `client_id` des findings = `GSMS_CLIENT_ID` (env).
  - Plan multi-client écrit, non codé : [`PLAN-MULTI-CLIENT-2026-09-10.md`](./PLAN-MULTI-CLIENT-2026-09-10.md).
- **Dérive schéma ↔ migrations :** le modèle `Incident` n'a pas de migration (patch lab).
- **Preuves cyber :** magasin JSON sur disque (`server/data/cyber/store.json`), hors Prisma.

## API / intégrations
- **Métier :** `/api/*` : assets, assessments (CRUD, advance, review, menaces, gaps, snapshots, summary, applicability), surveys, templates (import / export JSON), action-plans, incidents, audit-log, notifications.
- **Couche circuit GSMS (lecture seule) :**
  - `GET /api/findings` au contrat `shared/contracts/finding.schema.json` ;
  - `GET /assessments/:id/circuit-handoff` (⚠ cible encore SimpleRisk / Xacta, retirés) ;
  - `/controls` (catalogues `shared/controls`) ;
  - `/cyber/*`.
- **Applicabilité :** lit `shared/rulesets/*.json`.
- **Exports :** PDF / HTML (React SSR + Puppeteer). Pas de DOCX.
- **Aucun webhook ni événement sortant.**

## UI
- ~45 routes, sidebar Travail / Catalogue / Conformité / Admin.
- Très gros fichiers : `AssessmentWizardPage.tsx` 3 015 lignes, `AdminTemplatesPage.tsx` 2 813.
- Desktop seulement (overlay « mobile non supporté » < 767 px).
- Pas de landing.

## Moteur
- **Pur (portable) :** `lib/risk-engine.ts` (matrices IRV 5×5, priorité 5×4, ~50 lignes), `surveys/scoring.ts`, `countermeasures/scoring.ts`.
- **Couplé à Prisma :** AAA, couverture, propagation, applicabilité, résumé, génération de findings.
- **Capital métier = données :** packs `erp_precommission`, `igh_precommission`, `site_surete`, `sec_privee_cnaps`, `entreprise_risques` (`server/prisma/*`).

## Tests / CI / déploiement
- **Tests :** **2 fichiers** Vitest (circuit findings, control-ref-map). Aucun test du moteur ni des routes.
- **CI :** workflows amont non exécutés depuis la racine.
- **Docker :** compose `docker/` ; VPS `deploy/vps` (Traefik `grace.global-it-ss.com`). Runbook : `docs/ops/DEPLOY-GRACE-VPS.md`.

## Actions V2
1. **Multi-client :** appliquer le plan (Client + scope via Asset `SITE` = workspace GSMS ; header `X-GSMS-Workspace-Id`) ; findings filtrés par client.
2. **Service account Core** (JWT de service) ; SSO OIDC émis par le Core pour les liens profonds (phase 6).
3. **Événements sortants** `audit.started|completed`, `finding.created|closed` → `POST {CORE}/api/v1/events/ingest/grace` (HMAC), émis dans les handlers d'advance / review / gaps.
4. Retargeter `circuit-handoff` (QAtrial + Core seulement). Preuves cyber → Core Documents (URL présignée).
5. Tests : moteur de risque, scoring, routes assessment critiques ; migration manquante `Incident`.
6. UI : garder pour la saisie terrain (outil expert) ; les vues de consultation passent dans `apps/web`.

## Annexes conservées
- [`LOCALISATION-FR-DANS-GRACE.md`](./LOCALISATION-FR-DANS-GRACE.md) — comment GRACE a été francisé (packs, surveys, tags).
- [`GLOSSARY-I18N-FR.md`](./GLOSSARY-I18N-FR.md) — glossaire FR de référence.
- [`PLAN-MULTI-CLIENT-2026-09-10.md`](./PLAN-MULTI-CLIENT-2026-09-10.md) — plan multi-client (entrée de la phase P3).
