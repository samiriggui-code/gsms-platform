# Audit — QAtrial (`apps/qatrial`)

**Date :** 2026-10-02 · **Décision V2 :** KEEP + ADAPT (service CAPA formelle), **revue à M+6** (garder ou remplacer par une CAPA native du Core, réimplémentée sans copie AGPL)

## Identité
- **Origine :** `MeyerThorsten/QAtrial` (QMS orienté pharma / GxP).
- **Licence :** **AGPL-3.0-only**.
- **Stack :**
  - serveur : Hono 4 sur Node 20 (`tsx`), Prisma 7 (adapter-pg), Postgres 16 ;
  - front : React 19, Vite 8, Tailwind 4, Zustand (21 stores, souvent `persist` localStorage), react-router 7, PWA ;
  - mode double démo localStorage / serveur.
- **Auth :** JWT HS256 (accès 24 h, refresh 7 j), bcrypt, 5 rôles + 2 hérités, **SSO OIDC** (`server/routes/sso.ts`).

## Données (source de vérité)
- **Base :** Postgres dédiée, 48 modèles, statuts en `String` libres (aucun enum), liens faibles (`String[]`).
- **Hiérarchie :** `Organization → Workspace → Project` ; isolation par `orgId` du JWT (`server/lib/projectAccess.ts`).
- **Utile GSMS :** CAPA, Deviation, ChangeControl, AuditRecord / AuditFinding, Evidence, Document / DocumentVersion, Approval, Signature, AuditLog, WorkflowTemplate / Execution (SLA), Notification, Comment, QTask.
- **Hors métier :** ComputerizedSystem / PeriodicReview (GAMP), Training / Quiz (doublon School), Supplier portal, LIMS / SAP (stub), IA prédictive.

## API / intégrations
- 49 routers (~14 000 lignes) dont `/capa`, `/deviations`, `/audit-records`, `/evidence`, `/signatures`, `/approvals`, `/workflows`, `/documents`, `/realtime` (SSE).
- **Webhooks sortants HMAC-SHA256** (`X-QAtrial-Signature`), ~34 événements (`capa.created`, `capa.resolved`, `audit.finding_created`…). **Personne ne les écoute aujourd'hui.**
- **Ajouts GSMS :**
  - `/api/findings` au contrat `shared/contracts/finding.schema.json` (`client_id` = env) ;
  - `/api/catalogs` (`shared/controls`) ;
  - `policy-gen`.
- **Verticals GSMS dans le composeur (client) :** `securite_privee`, `incendie_prevention`, `surete_entreprise`, `datacenter_infra`. Le composeur n'existe que côté client (`src/templates/composer.ts`).

## Moteur
- Machines d'état en constantes `VALID_TRANSITIONS` dupliquées par route. La CAPA est linéaire : open → investigation → in_progress → verification → resolved → closed.
- `routes/workflows.ts` (647 lignes) : moteur configurable à SLA, le composant le plus générique.
- **Piste d'audit non Part 11 réelle :** pas de hash ni de chaînage, `onDelete: Cascade` depuis Project.
- **Signatures :** ressaisie du mot de passe, meaning, reason, contrôle `canApprove`. Pas de scellement.

## UI
- 26 pages (Accueil, Portfolio, ProjectHub, Requirements, CAPA / Deviations, Documents, Audits, Workflows, Reports…). Refonte nav déclarée faite (tokens Grace, `components/hifi`, shell).
- Pas de landing.

## Tests / CI / déploiement / poids
- **Tests :** Vitest, 9 fichiers / ~82 cas, **11 en échec** (approvals, evidence en 404).
- **CI :** aucune.
- **Docker :** Dockerfile 3 étages, compose, `deploy/vps`, helm, vercel. ⚠ Ni Prisma ni le serveur ne chargent `.env` ; secret JWT par défaut dans le compose.
- **55 Mo :**
  - `public/media` = **27 Mo de média Metronic** (thème commercial, ~99 % inutilisé, **risque licence en dépôt public**) ;
  - `server/generated/prisma` = 14 Mo versionnés ;
  - `.refonte-shots` = 11 Mo.

## Actions V2
1. **Correspondance :** GSMS workspace (site) ↔ QAtrial `Workspace` ; Mission ↔ `Project`.
2. **Webhooks** → `POST {CORE}/api/v1/events/ingest/qatrial` (vérification `X-QAtrial-Signature`).
3. **API de création CAPA** utilisée par le Core (WF-REMÉDIATION) ; findings filtrés par workspace.
4. Réparer les 11 tests ; `import 'dotenv/config'` ; retirer `server/generated` du suivi git ; purger le média Metronic non référencé.
5. Désactiver / retirer GAMP, Training / Quiz, Supplier portal, LIMS / SAP, IA prédictive, verticals pharma résiduels.
6. **Revue M+6 :** si seule la CAPA simple est utilisée → CAPA native dans le Core.
