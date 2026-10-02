# GSMS Platform — Core V2 (Python + Next.js)

**Statut :** proposition d'architecture, en attente du GO de Samir. Aucun code applicatif n'a été modifié.
**Date :** 2026-10-02
**Branche :** `claude/gsms-core-v2-architecture`
**Méthode :** six audits du code réel menés en parallèle (CRM, GRACE, QAtrial, Tenant Core, Tender ×3, DocuLens upstream) et relecture de la doctrine existante (`DOCTRINE.md`, `STACK-GSMS-FINALE.md`, `GSMS_INTEGRATION_MAP.md`, `CHANTIERS-METIER-INTERCONNEXION.md`, `circuit/*`, `HANDOFF-*`).

> **Décision en une phrase.** Je recommande une architecture **hybride** :
> - un **Core Python natif** (FastAPI, SQLAlchemy, PostgreSQL) qui possède le transverse : identité, établissements, missions, documents, événements, workflows, actions, échéances et audit trail ;
> - le **moteur documentaire de DocuLens extrait dans ce Core** ;
> - **GRACE, QAtrial et le CRM gardés comme services spécialisés**, connectés au Core ;
> - **TenderAI et LexSocket gardés en MCP**, derrière une passerelle MCP du Core ;
> - **une seule UI Next.js**, qui ne parle qu'au Core.
>
> Fusionner les moteurs GRACE et QAtrial dans le Core serait plus propre sur le papier, mais c'est **juridiquement et économiquement le mauvais choix aujourd'hui** (§ 10).

---

## Sommaire

1. [État actuel](#1-état-actuel)
2. [Inventaire des applications](#2-inventaire-des-applications)
3. [Ownership métier](#3-ownership-métier)
4. [Architecture actuelle (réelle)](#4-architecture-actuelle-réelle)
5. [Problèmes actuels](#5-problèmes-actuels)
6. [Architecture cible](#6-architecture-cible)
7. [Scénario A — Core orchestrateur](#7-scénario-a--core-orchestrateur)
8. [Scénario B — Fusion progressive des moteurs](#8-scénario-b--fusion-progressive-des-moteurs)
9. [Scénario hybride](#9-scénario-hybride)
10. [Recommandation argumentée](#10-recommandation-argumentée)
11. [Modèle de domaine du Core](#11-modèle-de-domaine-du-core)
12. [Événements](#12-événements)
13. [Workflows](#13-workflows)
14. [Stratégie données](#14-stratégie-données)
15. [Stratégie documents](#15-stratégie-documents)
16. [Stratégie frontend](#16-stratégie-frontend)
17. [Landing retenue](#17-landing-retenue)
18. [DocuLens](#18-doculens)
19. [Stratégie de migration](#19-stratégie-de-migration)
20. [Risques](#20-risques)
- [Annexe A — Matrice de décision par composant](#annexe-a--matrice-de-décision-par-composant)
- [Annexe B — Interface Appels d'offres](#annexe-b--interface-appels-doffres)
- [Annexe C — Agents / Eve](#annexe-c--agents--eve)
- [Annexe D — Écarts doctrine actuelle → V2](#annexe-d--écarts-doctrine-actuelle--v2)

---

## 1. État actuel

Le dépôt contient **sept briques** et beaucoup de documentation de chantier. Le circuit canonique actuel (`STACK-GSMS-FINALE.md`, 2026-09-04) est :

```
CLIENT → vitrine (InvoicePilot) → Comp CRM + Eve
              ├─ LexSocket → TenderAI (AO)
              └─ GRACE → QAtrial (audit / CAPA)
```

Il repose sur cinq règles :
- pas de base partagée ;
- pas de fusion de code ;
- un seul cerveau, Eve ;
- Eve consulte les apps (pull) ;
- jonction uniquement par appel HTTP.

**Dans le code, ce circuit n'existe presque pas :**

| Connexion | État vérifié dans le code |
|---|---|
| Vitrine → CRM (`/api/public/{audit-request,tender-request,contact}`) | ✅ existe (`apps/crm/apps/api/src/public/*`), idempotent par `sourceSystem` + `externalId` |
| CRM/Eve → GRACE / QAtrial (lecture des findings) | ✅ en lecture seule : `trust.controller.ts` et `agent/lib/findings-client.ts` lisent `/api/findings` des deux apps |
| GRACE et QAtrial `/api/findings` au contrat `finding.schema.json` v0.1.0 | ✅ existe, mais `client_id` = variable d'env globale (`GSMS_CLIENT_ID`), donc une instance = un client |
| GRACE `/assessments/:id/circuit-handoff` | ✅ existe, consommé par personne, cible encore SimpleRisk/Xacta (retirés) |
| Eve → TenderAI MCP | ❌ aucun client MCP dans les 28 tools Eve |
| Apps → événements → orchestration | ❌ GRACE n'émet rien ; QAtrial a des webhooks HMAC (~34 événements) que personne n'écoute ; le CRM n'a que des triggers internes à Eve |
| Tenant Core (portail) → CRM | ✅ BFF serveur à serveur (`x-api-key`) pour prestations/dashboard ; documents, échanges et finance sont des **mocks** |
| Desk documentaire / DocuLens | ❌ absent du dépôt avant cette branche ; `compliance-desk` du CRM = maquette `DEMO_DOCS` |
| Mission (objet) | ❌ n'existe nulle part ; un bloc texte `[GSMS_INTAKE]` est glissé dans `Deal.description` |

**Constat principal.** Les briques sont réelles et souvent de bonne facture, mais **le transverse n'a pas de propriétaire**. Personne ne possède Mission, Document, Action, Échéance, Événement ou Workflow. Le Tenant Core a commencé à porter l'identité et le workspace, sans tests, sans autorisation serveur, et avec une majorité de mocks.

---

## 2. Inventaire des applications

| Brique | Chemin | Stack réelle | Licence | Base | Tests | Maturité |
|---|---|---|---|---|---|---|
| **CRM + Eve** (« Comp AI CRM », trycompai/crm v1.15.3) | `apps/crm` | Turborepo/Bun, **Next.js 16.3**, React 19, NestJS 11 + tRPC 11, Prisma 7.9, Postgres 17, next-auth v4, agent **eve** 0.29 (AI SDK 7, GLM via AI Gateway) | **MIT** | Postgres dédiée, 59 migrations, ~60 modèles | ~115 fichiers bun test (CI amont inopérante depuis le monorepo) | **Haute** côté amont ; ajouts GSMS fragiles |
| **GRACE** (CSMP Risk Manager / GRACE Engine v0.1.0) | `apps/grace` | pnpm, Fastify 4, Zod, Prisma 5.22, Postgres 16, React 19 + Vite 5 + TanStack Router, Puppeteer (PDF) | **AGPL-3.0** (+ licence commerciale) | Postgres dédiée, ~45 modèles, 40 enums, **mono-tenant** (migration `single_tenant`) | **2 fichiers** (circuit uniquement) | Moyenne-haute : méthodologie riche, fichiers énormes, logique dans les handlers |
| **QAtrial** | `apps/qatrial` | Hono 4 (Node/tsx), Prisma 7, Postgres 16, React 19 + Vite 8, Zustand (souvent localStorage) | **AGPL-3.0** | Postgres dédiée, 48 modèles, statuts en `String` libres | 9 fichiers / ~82 cas, **11 en échec** | Moyenne : large mais peu profond, Part 11 surtout déclaratif |
| **Tenant Core / portail** | `apps/tenant-core` | Hono 4 + Prisma 6 + Postgres, Vite 8 + React 19 + TanStack Router + TW4 + shadcn | aucune (code GSMS) | Postgres, 4 modèles, `db push` (pas de migrations) | **0** | POC propre, données majoritairement mockées |
| **TenderAI MCP Max** | `apps/tenderai-mcp-server-max` | Python 3.12, FastMCP v1 (`mcp<2`), Anthropic, SQLite + FTS5 + sqlite-vec, python-docx/openpyxl | **⚠ aucune licence** (dbugom/tenderai-mcp-server-max) | SQLite locale (`rfp`, `proposal`, `bom`, `partner*`, `past_proposal_*`) | **0** | Fonctionnel ; **le repo est en retard sur le NUC** (2 tools et mode data-tool absents) ; `generate_compliance_matrix` renvoie toujours « Compliant » |
| **LexSocket** (`mcp-tenders`) | `apps/mcp-tenders` | Proxy Node (stdio ↔ SSE) vers `mcp.lexsocket.ai` | MIT (client) | distante | 0 | Client tiers, 23 tools TED + national ; aucun code métier |
| **tdai-memory-agents** | `apps/tdai-memory-agents` | Outillage client (import, setup proxy) de TencentDB Agent Memory | ⚠ aucune | distante (NUC/VPS) | 0 | Outillage ; le serveur n'est pas dans le repo |
| **DocuLens AI** *(réintégré sur cette branche)* | `apps/doculens` | Python 3.12, FastAPI 0.111, Celery + Redis, **Docling**, Instructor, timescale-vector (DiskANN), React 19 + Vite 7 | **MIT** | Postgres/Timescale ; un document est un `event` JSONB | 12 tests pytest, CI ruff + pyright | Bon moteur, mauvais modèle de données (§ 18) |

**Hors dépôt :**
- **InvoicePilot** (ancienne vitrine) : la version GitHub (`samiriggui-code/InvoicePilot-AI`, 2026-08-17) est encore le produit e-facture. La version adaptée GSMS n'existe que sur le laptop.
- **`gsms-core/`** (clone local contenant `upstream/doculens`, `docs/WORKSPACE_ID_CONTRACT.md`, etc.) : jamais poussé. Plusieurs documents cités dans `HANDOFF-CURSOR.md` sont donc introuvables.

**Poids mort mesuré :**
- `apps/tenant-core/public` = 25 Mo et `apps/qatrial/public/media` = 27 Mo. C'est le pack média du thème commercial **Metronic**, dont environ 99 % n'est pas référencé. **Le dépôt est public : risque de licence.**
- `apps/qatrial/server/generated/prisma` = 14 Mo d'artefact versionné.
- Les `verify-*.png` à la racine sont des captures de test : une landing DocuLens anglaise et un `ERR_CONNECTION_REFUSED`. Ce ne sont pas des preuves GSMS.

---

## 3. Ownership métier

Règle : **chaque donnée a une seule source de vérité.** Le Core ne stocke d'une donnée spécialisée que **sa référence, son statut synthétique et son contexte** (workspace, mission).

| Objet | Source de vérité | Ce que le Core connaît |
|---|---|---|
| Utilisateur, organisation cliente, établissement/site (= **workspace**), membership, rôles | **Core** (repris de Tenant Core) | tout |
| Mission, type, participants, statut, jalons | **Core** (nouveau) | tout |
| Société, contact, opportunité commerciale (Deal), activités, mails, agenda | **CRM** | `crm://company/{id}`, `crm://deal/{id}`, statut commercial synthétique |
| Devis / facture | **CRM, à créer** (n'existe nulle part) ; jamais dans le Core | `crm://quote/{id}`, montant, statut |
| Audit terrain : Assessment, menaces 3-A, contre-mesures, écarts, enquêtes, rapport PDF | **GRACE** | `grace://assessment/{uuid}`, statut, findings normalisés (`finding.schema.json`) |
| CAPA formelle, déviation, change control, signature électronique, document qualité | **QAtrial** | `qatrial://capa/{uuid}`, statut, échéance |
| Dossier AO (RFP parsé, propositions, BOM, partenaires, offres passées) | **TenderAI** (SQLite) | `tender://rfp/{id}`, deadline, go/no-go (**décision détenue par le Core**) |
| Avis d'appels d'offres publics | **LexSocket** (distant) | `lexsocket://ted/{id}` ou `lexsocket://fr/{id}`, gardé seulement si suivi |
| Fichier, version, hash, classification, extraction, chunks, index | **Core – Document Engine** | tout |
| Preuve (Evidence) | **Core** (registre) ; le fichier est un `Document` | lien vers Finding / Action / CAPA |
| Action transverse, tâche, échéance, notification | **Core** | tout |
| Événements, instances de workflow, audit trail | **Core** | tout |
| Mémoire d'agent (préférences, contexte, décisions passées) | **TencentDB Agent Memory** | **jamais une source de vérité** ; contexte uniquement |

---

## 4. Architecture actuelle (réelle)

Ce schéma décrit ce que fait le code aujourd'hui, pas ce que disent les documents.

```
                 (vitrine InvoicePilot : hors repo)        apps/crm/(landing) : landing GSMS FR
                                │                                    │
                                └──── POST /api/public/* ────────────┤
                                                                     ▼
  ┌──────────────── apps/tenant-core ───────────────┐    ┌──────── apps/crm ─────────┐
  │ Hono :3090 / Vite :5190                          │    │ Next 16 :3000             │
  │ User / Org / Workspace / Membership              │──► │ Nest+tRPC :3001 (REST)    │
  │ BFF prestations (CRM) ; docs/finance = MOCKS     │key │ Eve :2000 (28 tools CRM)  │
  └──────────────────────────────────────────────────┘    └──────┬────────────────────┘
                                                                  │ GET /api/findings (pull)
                                         ┌────────────────────────┴───────┐
                                         ▼                                ▼
                               ┌──── apps/grace ────┐           ┌──── apps/qatrial ───┐
                               │ Fastify :3011      │           │ Hono :3001          │
                               │ mono-tenant        │           │ webhooks HMAC       │
                               │ /findings /handoff │           │ (personne n'écoute) │
                               └────────────────────┘           └─────────────────────┘

  TenderAI MCP :8090 (SQLite)  ◄── personne (ni Eve, ni UI)
  LexSocket (distant)          ◄── personne dans le code
  Tencent Memory (NUC/VPS)     ◄── outillage client seulement
  DocuLens                     ◄── absent (patterns UI copiés dans CRM et Tenant Core)
```

Il y a **cinq authentifications différentes** :
- CRM : next-auth + clés API ;
- GRACE : JWT 7 jours en localStorage ;
- QAtrial : JWT + OIDC ;
- Tenant Core : JWT en cookie ;
- TenderAI : Bearer statique.

Il n'y a **aucun SSO** et **aucun identifiant client commun** : GRACE et QAtrial utilisent une variable d'env, le CRM a un `WORKSPACE_ID` singleton, et seul Tenant Core porte un vrai `workspace_id`.

---

## 5. Problèmes actuels

1. **Pas de propriétaire du transverse.** La mission n'existe pas : elle est encodée en texte dans `Deal.description`. Les actions, les échéances et les documents n'ont pas de foyer.
2. **Collision de vocabulaire « workspace ».**
   - Tenant Core : workspace = établissement (bon sens GSMS).
   - CRM : `WORKSPACE_ID = "workspace"`, l'instance entière.
   - QAtrial : `Organization → Workspace → Project`.
   - GRACE : aucun.
3. **Mono-tenant structurel** de GRACE (colonnes tenant supprimées) et du CRM (organisations supprimées). QAtrial est multi-org mais sans lien avec le reste.
4. **Pas de bus d'événements.** Tout est en pull ponctuel ; aucun workflow ne peut « reprendre » quand une preuve arrive.
5. **Le moteur AO est invisible.** TenderAI n'a ni UI ni appelant, le repo diverge de la prod, et la matrice de conformité est fausse (statut codé en dur).
6. **Documents éclatés et fictifs.** On trouve :
   - un Compliance Desk de démo dans le CRM ;
   - des mocks dans Tenant Core ;
   - un magasin JSON sur disque côté GRACE (cyber) ;
   - `Evidence` et `Document` dans QAtrial ;
   - des fichiers locaux dans TenderAI.
   
   Il n'y a ni MinIO réellement utilisé, ni hash, ni version, ni scope.
7. **Plusieurs UI concurrentes, six chartes** : CRM, GRACE, QAtrial, Tenant Core, DocuLens et InvoicePilot. Le travail d'unification visuelle a commencé (tokens « papier chaud + bleu #1a7df5 », Manrope/DM Mono), mais par copie dans chaque app.
8. **Licences non maîtrisées.** GRACE et QAtrial sont AGPL. TenderAI n'a **aucune licence**, donc tous droits réservés par défaut. Le média Metronic, commercial, est publié dans un dépôt public.
9. **Qualité inégale.** Le CRM amont est très testé. GRACE a 2 tests, Tenant Core et TenderAI zéro, QAtrial a 11 tests rouges. Aucune CI ne tourne au niveau du monorepo.
10. **Documentation désynchronisée.** Les docs citent `gsms-core/docs/*` absents, annoncent 20 tools TenderAI là où le repo en a 18, et des circuits encore orientés Xacta/SimpleRisk.

---

## 6. Architecture cible

```
                                    GSMS PLATFORM
                         ┌────────────────────────────────┐
     PUBLIC WEB          │  apps/web  (Next.js 16)         │
     /  /prestations     │  (public)  landing GSMS         │
     /demande  /login    │  (platform) /app/*  UI globale  │
                         └───────────────┬────────────────┘
                                         │ REST /api/v1 + SSE (jamais d'appel direct aux apps)
                                         ▼
 ┌─────────────────────────────── apps/core  (Python 3.12 · FastAPI · SQLAlchemy 2 · Alembic) ─┐
 │  identity      orgs · workspaces(sites) · memberships · rôles · sessions · service accounts  │
 │  missions      Mission · MissionType · participants · jalons · ExternalReference             │
 │  documents     Document · Version · Blob(MinIO, sha256) · Classification · Extraction ·      │
 │                Chunks(pgvector) · DossierTemplate (pièces attendues) · recherche · Q/R cité  │
 │  evidence      Evidence → Document ; liens Finding/Action/CAPA                               │
 │  actions       Action · Task · Deadline · Notification                                       │
 │  events        Event store + outbox · webhooks entrants signés · SSE sortant                 │
 │  workflows     WorkflowDefinition (code) · WorkflowInstance (DB) · timers · règles          │
 │  connectors    crm · grace · qatrial  (anti-corruption, service accounts)                    │
 │  mcp_gateway   client MCP → TenderAI, LexSocket ; serveur MCP « gsms » pour Eve/Claude       │
 │  agents        registre d'outils, politiques, journal d'appels (pas de LLM « décideur »)    │
 │  audit         AuditLog append-only chaîné (hash)                                           │
 │  workers       Celery + Redis : ingestion documentaire, timers, synchronisations             │
 └───────┬─────────────────┬──────────────────┬───────────────────┬────────────────────────────┘
         │ REST+webhook    │ REST+webhook     │ REST+webhook      │ MCP (streamable-http)
         ▼                 ▼                  ▼                   ▼
   ┌─────────┐       ┌──────────┐       ┌──────────┐     ┌────────────────┐   ┌───────────┐
   │  CRM    │       │  GRACE   │       │ QAtrial  │     │ TenderAI MCP   │   │ LexSocket │
   │ + Eve   │       │ (audit)  │       │ (CAPA)   │     │ (répondre AO)  │   │ (veille)  │
   └─────────┘       └──────────┘       └──────────┘     └────────────────┘   └───────────┘
   Postgres crm      Postgres grace     Postgres qatrial  SQLite tenderai       distant

   Stockage objet : MinIO (bucket unique gsms-documents, préfixes par workspace) — propriété du Core
   Mémoire agents : TencentDB Agent Memory — contexte, jamais vérité
```

**Invariants :**
1. **Next.js → Core uniquement.** Aucune URL d'app spécialisée dans le navigateur, sauf les liens profonds « ouvrir dans l'outil expert » pendant la transition.
2. **Le Core est le seul à connaître toutes les apps.** Les apps ne s'appellent pas entre elles. Elles émettent des événements vers le Core et exposent une API lue par le Core.
3. **Chaque appel du Core vers une app porte** `X-GSMS-Workspace-Id`, `X-GSMS-Mission-Id`, `X-GSMS-Actor` et `X-GSMS-Correlation-Id`. Le Core journalise l'appel.
4. **Une seule copie d'un fichier.** Le binaire est dans MinIO. Les apps reçoivent une URL présignée ou une référence `doc://`, jamais une copie stockée ailleurs.
5. **Code calcule, moteur exécute, agent assiste, humain valide** (Annexe C).

---

## 7. Scénario A — Core orchestrateur

Toutes les briques restent des services. Le Core ne fait qu'orchestrer et agréger. DocuLens devient lui aussi un service.

| | Évaluation sur le code réel |
|---|---|
| ✅ Réécriture minimale | Oui, mais **DocuLens comme service** demande quand même de refaire son modèle de données (pas de table documents, pas de scope, auth non appliquée). Le « moins de réécriture » ne tient pas pour lui. |
| ✅ Ownership clair | Oui. |
| ✅ Remplacement possible d'une brique | Oui, grâce aux connecteurs anti-corruption. |
| ❌ Documents | Deux registres documentaires (Core pour les liens, DocuLens pour le contenu) ou un DocuLens qui doit apprendre workspace, mission, version et MinIO. On recrée le Core dans DocuLens. |
| ❌ Ops | 6 services HTTP, 5 bases, 2 workers, Redis ×2, pour **une équipe d'une personne plus des agents**. |
| ❌ Auth | Le SSO reste à construire dans tous les cas. |
| ❌ Latence | Les vues transverses (dashboard site) font N appels. Il faut un cache et des projections dans le Core. |

**Verdict :** bon pour GRACE, QAtrial, CRM et Tender. **Mauvais pour DocuLens**, dont la valeur est un moteur Python sans état métier propre, exactement ce que le Core doit posséder.

## 8. Scénario B — Fusion progressive des moteurs

Les moteurs utiles deviennent des modules Python du Core, et les UI d'origine disparaissent.

| Brique | Faisabilité réelle | Bloquant |
|---|---|---|
| DocuLens engine → `core/documents` | **Haute.** Python, FastAPI et Celery, la même stack ; environ 600 lignes utiles ; MIT | aucun |
| Tenant Core identity → `core/identity` | **Haute.** 4 modèles, code GSMS sans licence tierce | aucun (réécriture en Python, petite) |
| GRACE engine → `core/audits` | **Basse.** Le moteur « pur » fait environ 150 lignes (IRV, scoring), mais le reste (AAA, couverture, propagation, applicabilité, assistant 7 étapes, PDF) est **imbriqué dans Prisma et les handlers TS**. Il faudrait réécrire environ 20 000 lignes. | **AGPL-3.0** : porter le code dans le Core rend le Core AGPL. Une réimplémentation propre (clean-room) depuis la méthodologie CSMP serait possible, mais longue. |
| QAtrial CAPA → `core/compliance` | **Moyenne techniquement** (la machine d'état CAPA est triviale, linéaire) | **AGPL-3.0**. Et la vraie valeur (signatures, document control, change control, workflows à SLA) n'est pas triviale. |
| CRM → `core/crm` | **Très basse.** TS, environ 60 modèles, sync mail/agenda/Slack, Eve, très testé | Aucun intérêt : c'est la brique la plus mûre. |
| TenderAI → `core/tenders` | **Moyenne techniquement** (Python, ~5,8 k lignes) | **Aucune licence = interdiction de copier.** Il reste un MCP externe tant que la licence n'est pas clarifiée avec l'auteur. |

**Verdict :** fusion justifiée pour **DocuLens et l'identité**. **Injustifiée à moyen terme** pour GRACE, QAtrial, CRM et TenderAI : licence, langage, volume, et valeur déjà livrée.

## 9. Scénario hybride

```
CORE PYTHON NATIF     identity · workspace · mission · document registry · events · workflows ·
                      actions · tasks · deadlines · notifications · evidence · audit trail
ENGINE INTERNE        Document Engine (extrait de DocuLens : Docling, chunking, embeddings,
                      LLM factory/Instructor, prompts, labels, classification, résumé, Q/R cité)
SERVICES SPÉCIALISÉS  GRACE (audit terrain) · QAtrial (CAPA formelle) · CRM + Eve (commercial)
EXTERNES / MCP        TenderAI MCP (répondre) · LexSocket MCP (trouver) · Tencent Memory
```

Le Core garde ce qui est **transverse** ou **sans propriétaire**. Les services gardent ce qui est **profond, testé ou sous licence restrictive**.

---

## 10. Recommandation argumentée

**Je recommande le scénario hybride, avec un point de réévaluation pour QAtrial à M+6.**

| Critère | A | B | **Hybride** |
|---|---|---|---|
| Valeur métier préservée | ✅ | ⚠ (réécrire GRACE détruit de la valeur) | ✅ |
| Licences | ✅ | ❌ (AGPL contamine le Core ; TenderAI non copiable) | ✅ |
| Réécriture | faible, mais DocuLens à refaire quand même | très forte | **faible et ciblée** (identité + documents, ~2 à 3 k lignes Python neuves) |
| Ownership des données | ✅ | ✅ | ✅ |
| Documents cohérents | ❌ (2 registres) | ✅ | ✅ |
| Ops (1 dev + agents) | ❌ (7 services) | ✅ | ✅ (Core + 3 services + MCP) |
| Tests / régression | inchangé | risque énorme | les zones neuves naissent testées (pytest) |
| Évolution vers B plus tard | possible | — | **possible, brique par brique** si une licence ou un besoin le justifie |

**Réponses explicites aux questions de la mission :**

- **Ce qui reste service :**
  - GRACE (audit terrain, 3-A, enquêtes, PDF) ;
  - QAtrial (CAPA formelle, signatures, document control qualité) ;
  - CRM + Eve (commercial, mails, agenda, intake public).
- **Ce qui entre dans le Core Python :**
  - identité / organisations / workspaces / memberships (réécriture du modèle Tenant Core) ;
  - mission ;
  - document engine (DocuLens) ;
  - evidence ;
  - actions / tâches / échéances / notifications ;
  - événements / workflows ;
  - audit trail ;
  - passerelle MCP ;
  - connecteurs.
- **Ce qui est seulement connecté :**
  - TenderAI MCP et LexSocket MCP (via la passerelle) ;
  - TencentDB Agent Memory (via Eve).
- **Ce qui est abandonné :**
  - le **backend** Tenant Core (Hono), absorbé par le Core ;
  - l'UI DocuLens et son auth ;
  - le Compliance Desk de démo du CRM ;
  - le serveur de mocks `mock-data.ts` ;
  - l'InvoicePilot vitrine ;
  - le handoff GRACE vers SimpleRisk/Xacta ;
  - les tools LLM génératifs de TenderAI en tant que « cerveau » : Eve rédige, TenderAI produit les fichiers ;
  - le média Metronic.
- **Landing officielle :** la landing GSMS du CRM, déplacée dans `apps/web` (§ 17).
- **Retour de DocuLens :** dans `apps/doculens` en amont intact (fait), puis son moteur extrait vers `apps/core/gsms_core/documents` (§ 18).
- **Interface du MCP Tender :** un module `/app/tenders` dans Next.js, alimenté par `core/tenders` et la passerelle MCP (Annexe B).
- **Circuits métier :** des événements normalisés vers le Core, puis des workflows Python déterministes (§ 12 et § 13).
- **Fusion progressive plus propre à moyen terme ?**
  - **Oui** pour le transverse et les documents.
  - **Non** pour GRACE, QAtrial, CRM et TenderAI à 12 mois.
  - Réévaluation à **M+6** pour QAtrial : si, en pratique, seule la CAPA simple sert, une CAPA native dans le Core (réimplémentation propre, pas de copie AGPL) coûtera moins cher qu'un service de 55 Mo à maintenir.

---

## 11. Modèle de domaine du Core

Schémas PostgreSQL de la base `gsms_core` : `identity`, `mission`, `document`, `work`, `event`, `audit`.

```
identity.organization      id, name, kind(CLIENT|GSMS|PARTNER), siren?, crm_company_ref?
identity.site              id, organization_id, name, address, erp_type?, erp_category?, igh_class?, geo
identity.workspace         id (= workspace_id canonique, UUID), organization_id, site_id?, name,
                           kind(PERMANENT|TEMPORARY), status, created_from_mission_id?
identity.user              id, email, name, password_hash? (ou OIDC subject), locale, is_active
identity.membership        user_id, organization_id, workspace_id? (NULL = toute l'org), role
identity.role              owner|admin|manager|auditor|consultant|member|viewer|client_*  (enum)
identity.service_account   id, name, app(crm|grace|qatrial|tenderai|eve), scopes, key_hash

mission.mission_type       code(AUDIT|COMMISSION_SECURITE|ACCOMPAGNEMENT|DOCUMENTATION|
                           APPEL_OFFRES|CONFORMITE|AUTRE), workflow_definition, dossier_template
mission.mission            id, workspace_id, type, title, status, owner_id, opened_at, due_at,
                           closed_at, origin(intake|crm|manual|tender)
mission.participant        mission_id, user_id, role(lead|contributor|client_contact|reviewer)
mission.milestone          mission_id, code, label, due_at, done_at
mission.external_ref       id, mission_id?, workspace_id, uri ("grace://assessment/…"),
                           system, kind, external_id, status_snapshot, url, synced_at

document.document          id, workspace_id, mission_id?, title, doc_type (taxonomie FR), status,
                           current_version_id, source(upload|email|crm|grace|tender|generated)
document.version           id, document_id, n, blob_id, uploaded_by, uploaded_at, note
document.blob              id, sha256 (unique), size, mime, bucket, object_key
document.classification    version_id, label, confidence, source(ai|user), classifier_version, at
document.extraction        version_id, schema_code, fields(JSONB), confidence, validated_by?
document.chunk             version_id, idx, page_from, page_to, heading, text, embedding(vector),
                           tsv(tsvector 'french')  — workspace_id dénormalisé pour filtre obligatoire
document.dossier_template  code, mission_type, required_doc_types[]
document.dossier           mission_id, template_code, completeness, missing[]   (calculé)
document.link              document_id, target_uri ("grace://…", "qatrial://capa/…", "mission://…")

work.evidence              id, workspace_id, document_version_id, target_uri, captured_at, by
work.finding_ref           id, workspace_id, mission_id, source_uri, severity, status, control_ref,
                           title  (projection du contrat finding.schema.json ; vérité = app source)
work.action                id, workspace_id, mission_id?, finding_ref_id?, title, owner_id,
                           status, priority, due_at, capa_uri?, verification_required
work.task                  id, action_id? | mission_id?, assignee_id, title, status, due_at
work.deadline              id, workspace_id, subject_uri, kind(REGULATORY|CONTRACT|TENDER|ACTION),
                           due_at, reminder_policy
work.notification          id, user_id, event_id, channel(inapp|email), read_at

event.event                id, type, source, subject_uri, workspace_id, mission_id?, actor,
                           occurred_at, data(JSONB), correlation_id, causation_id
event.outbox               event_id, destination, status, attempts, next_attempt_at
event.workflow_instance    id, definition, version, subject_uri, state, context(JSONB),
                           waiting_for(event type + filtre), timer_at
audit.log                  id, at, actor, action, subject_uri, before, after, prev_hash, hash
```

**Correspondances avec les apps** (ce sont les contrats des connecteurs) :

| Core | CRM | GRACE | QAtrial | TenderAI |
|---|---|---|---|---|
| organization | Company (`crm_company_ref`) | `Client` (à créer, plan 2026-09-10) | Organization (une, GSMS) | — |
| workspace | — (CRM mono-workspace) | Asset `SITE` du Client | Workspace (une par site) | — |
| mission | Deal (`external_ref`) | Assessment (`external_ref`) | Project (`external_ref`) | `rfp` (`external_ref`) |
| finding_ref | — | `/api/findings` | `/api/findings` | (matrice de conformité) |
| action (+ capa_uri) | Activity TASK (optionnel) | Recommendation / ActionPlan | CAPA | — |

---

## 12. Événements

Enveloppe unique, inspirée de CloudEvents, stockée dans `event.event` :

```json
{
  "id": "evt_01J…", "type": "grace.finding.created", "source": "grace",
  "subject": "grace://finding/4f2a", "workspace_id": "…", "mission_id": "…",
  "actor": "user:… | service:grace", "occurred_at": "2026-10-02T09:00:00Z",
  "correlation_id": "…", "causation_id": "…", "data": { … }
}
```

**Origine des événements :**
- **Webhook entrant signé** (HMAC) sur `POST /api/v1/events/ingest/{source}` : QAtrial (déjà capable), GRACE (à ajouter : une ligne d'émission par transition), CRM (à ajouter : un `AgentTrigger` existe déjà, il suffit d'un émetteur HTTP).
- **Synchronisation pull** de secours (toutes les N minutes) sur `/api/findings`, les assessments et les CAPA. Les écarts détectés produisent des événements `*.synced`.
- **Événements Core natifs.**

| Type | Émis par | Effet principal |
|---|---|---|
| `intake.request.received` | Core (`/demande`) ou CRM | crée ou associe Organization / Workspace / Mission |
| `crm.deal.won` / `crm.deal.lost` | CRM | mission `OPEN` ou `CANCELLED` ; AO → `WON` / `LOST` |
| `mission.created` / `mission.completed` | Core | instancie ou clôt le workflow du type |
| `document.uploaded` / `document.ingested` / `document.classified` | Core Documents | recalcul de la complétude du dossier |
| `document.missing` | Core (complétude) | tâche « demander la pièce X » + notification client |
| `tender.created` / `tender.dce.parsed` / `tender.go_no_go.decided` | Core Tenders | jalons, tâches, échéances |
| `tender.submitted` | Core | notification au CRM, attente du résultat |
| `audit.started` / `audit.completed` | GRACE | statut de mission, rapport → Document |
| `finding.created` / `finding.closed` | GRACE / QAtrial | création / clôture d'Action |
| `capa.created` / `capa.closed` | QAtrial | lien Action ↔ CAPA, reprise du workflow |
| `evidence.added` | Core | reprise du workflow (vérification) |
| `deadline.approaching` / `deadline.overdue` | Core (timers) | notifications, escalade |
| `action.verified` / `action.closed` | Core | relance du re-test GRACE si requis |

---

## 13. Workflows

**Moteur :**
- Les **définitions sont en code Python** : machine d'état, gardes et effets, versionnées et testées en pytest.
- Les **instances sont en base** (`event.workflow_instance`).
- Une instance avance sur réception d'un événement qui correspond à `waiting_for`, ou sur un timer (Celery beat).
- **Pas de Temporal ni de Camunda au départ.** Le volume (missions par mois, pas par seconde) ne le justifie pas, et Celery + Redis viennent déjà avec DocuLens.
- La définition reste découplée de l'exécution, ce qui laisse Temporal possible plus tard sans réécrire les règles.

**WF-INTAKE :**
```
landing /demande ─► intake.request.received ─► CRM Company/Contact/Deal (existant, idempotent)
  ─► Core : Organization (+crm ref) · Workspace (TEMPORARY si nouveau) · Mission(type, origin=intake)
  ─► tâche « qualifier la demande » (owner commercial) ─► crm.deal.won ─► mission OPEN
```

**WF-AUDIT et WF-COMMISSION-SECURITE :**
```
mission OPEN ─► dossier_template(type) ─► DocuLens: collecte (plans, registres, contrats, rapports,
  maintenance, contrôles) ─► document.ingested ×N ─► complétude ─► document.missing ─► tâches client
  ─► [complétude ≥ seuil ou forçage humain] ─► GRACE: création Assessment (workspace=site)
  ─► audit.started ─► visite terrain (UI GRACE experte) ─► finding.created ×N
  ─► WF-REMÉDIATION par finding ─► audit.completed ─► rapport PDF GRACE → Document(mission)
  ─► [commission] jalon « passage commission » ─► PV → Document ─► mission.completed
```

**WF-REMÉDIATION (finding → clôture) :**
```
finding.created (sévérité ≥ seuil)
  ─► règle déterministe : Action(owner = responsable site, due = f(sévérité, type de règle))
  ─► notification ─► [CAPA requise ? règle : sévérité critique | récurrence | demande client]
        └─ oui ─► QAtrial POST /api/capa (projet du workspace) ─► capa.created ─► lien capa_uri
  ─► attente evidence.added | capa.closed
  ─► vérification : humain valide la preuve (ou GRACE re-test si verification_required)
  ─► finding.closed (GRACE) ─► action.closed ─► audit log
  timers : deadline.approaching (J-7, J-1) · deadline.overdue → escalade manager
```

**WF-APPEL-OFFRES :**
```
LexSocket veille (ou CRM opportunité) ─► tender.created (Mission APPEL_OFFRES + crm://deal)
  ─► upload DCE (zip) ─► Document Engine : dézip, classification RC/CCTP/CCAP/AE/BPU/DPGF/annexes,
     extraction (date limite, critères, allotissement, visite obligatoire, pièces exigées)
  ─► MCP TenderAI parse_tender_rfp (URL présignée) ─► tender.dce.parsed ─► exigences + matrice
  ─► fiche Go/No-Go (scores calculés en Python + avis Eve + décision humaine) ─► tender.go_no_go.decided
  ─► GO : tâches (mémoire technique, offre financière, pièces administratives DC1/DC2/attestations)
       ─► TenderAI build_full_technical_proposal / generate_financial_proposal ─► Documents
       ─► relecture humaine ─► tender.submitted ─► CRM Deal stage ─► crm.deal.won|lost
  ─► NO-GO : archivage motivé (apprentissage)
```

---

## 14. Stratégie données

| Option | Verdict |
|---|---|
| Une base unique, schémas séparés | ❌ GRACE, QAtrial et CRM ont des migrations Prisma qui supposent leur propre base. Mélanger leurs cycles de migration avec le Core ajoute du risque sans rien apporter. Cela contredit aussi la doctrine (« une base par appli »). |
| **Un cluster PostgreSQL par environnement, une base par service** | ✅ **Retenu.** Bases `gsms_core`, `crm`, `grace`, `qatrial` sur la même instance Postgres 16/17 : une seule sauvegarde, un seul monitoring, des cycles de migration indépendants. |
| Bases spécialisées + références Core | ✅ c'est ce que l'option ci-dessus réalise. Le Core ne stocke que des `external_ref` et des projections (`finding_ref`, `status_snapshot`) explicitement marquées « cache », reconstruisibles par synchronisation. |

**Base par base :**
- **Base `gsms_core`** :
  - schémas `identity`, `mission`, `document`, `work`, `event`, `audit` ;
  - extensions `pgvector` et `pg_trgm` ;
  - migrations **Alembic** ;
  - le **vector store vit ici** (`document.chunk`), et **plus** dans une table créée hors migrations comme dans DocuLens ;
  - timescale-vector/DiskANN : à réévaluer seulement si le volume dépasse quelques millions de chunks.
- **TenderAI** : garde son SQLite. Le Core possède la mission AO, le go/no-go et les échéances ; TenderAI possède le contenu RFP et les propositions.
- **Données agents** :
  - `AgentTask`, `AgentRun`, etc. restent dans la base CRM (Eve) ;
  - la mémoire longue reste dans Tencent ;
  - le Core journalise chaque appel d'outil par un agent (`audit.log`, `actor = agent:eve`).
- **Source de vérité :** une donnée = une base. Tout ce qui est copié dans le Core porte `synced_at` et peut être effacé puis resynchronisé.

---

## 15. Stratégie documents

```
upload (UI / email / API / app)
  ─► Core: calcul sha256 en streaming ─► blob existe ? (dédup) ─► MinIO put
       bucket gsms-documents / ws/{workspace_id}/{sha256[:2]}/{sha256}
  ─► document + version(n+1) + liens (mission, workspace, cible)
  ─► document.uploaded ─► worker Celery « ingest » (lit MinIO, pas le disque)
       Docling (layout, tables, pages) ─► chunking hybride (800 tokens) ─► embeddings
       ─► classification (taxonomie FR, historique + correction humaine)
       ─► extraction par schéma du type (ex. RC : date limite, critères, lots, visite)
  ─► document.ingested / document.classified ─► complétude du dossier (dossier_template)
  ─► Evidence = lien d'une version figée vers un finding/action/CAPA (jamais le document mutable)
```

**Règles :**
- Le **binaire n'est stocké qu'une fois**, dans MinIO.
- GRACE, QAtrial et TenderAI reçoivent une **URL présignée** (durée courte) pour lire. Une pièce qu'ils produisent (rapport PDF GRACE, DOCX TenderAI) est **remontée dans le Core** comme nouvelle version, avec `source = grace` ou `source = tenderai`.
- **Une preuve référence une version, pas un document.** Cela rend l'audit reproductible.
- **Filtre `workspace_id` obligatoire** dans toute requête de recherche ou de Q/R, appliqué dans le repository et pas dans la route. Un test pytest le vérifie.
- **Recherche :** `tsvector('french')` + pgvector, fusion RRF, citations avec **page** (déjà dans les métadonnées DocuLens, il suffit de la remonter).
- **Fournisseurs LLM et embeddings abstraits** (Instructor, factory DocuLens). Une option d'hébergement souverain doit être prévue pour les documents clients sensibles (plans de sûreté).
- **Taxonomie FR initiale :**
  - Sécurité incendie / ERP : registre de sécurité, PV de commission, notice de sécurité, plans d'évacuation et d'intervention, rapports de vérification périodique (électricité, SSI, désenfumage, extincteurs, ascenseurs…), contrats de maintenance, consignes.
  - Sûreté : procédures, contrats de gardiennage, cartes professionnelles CNAPS.
  - Appels d'offres : RC, CCTP, CCAP, AE / ATTRI1, BPU, DPGF, DQE, DC1, DC2, attestations.

---

## 16. Stratégie frontend

**Une seule application `apps/web` (Next.js 16, App Router, TypeScript, Tailwind 4, shadcn).**

- **Pourquoi Next.js 16 :** c'est la version du CRM, l'app Next la plus mûre du dépôt. Sa landing, son kit `@crm/ui` (~70 composants) et ses tokens GSMS sont réutilisables.
- **Kit UI :** copier `apps/crm/packages/ui` dans `apps/web/components/ui`, à la manière de shadcn. La doctrine « pas de package UI partagé entre apps » reste respectée, puisque `apps/web` devient **la** UI.
- **Coque de l'application :** reprendre de Tenant Core :
  - le **Shell** responsive avec sélecteur de site ;
  - le **login brandé** (`AuthBrandedLayout`) ;
  - le pattern **notifications** ;
  - la **plaquette React + PDF** ;
  - l'**i18n FR/EN**.
- **Données :**
  - Server Components et route handlers appellent `CORE_API_URL` avec le cookie de session (JWT Core).
  - SSE `GET /api/v1/stream` pour notifications et événements.
  - TanStack Query côté client pour les vues interactives.
- **Contexte courant :** le `workspace_id` est dans l'URL (`/app/w/{workspaceId}/…`) **et** dans le token. L'URL fait foi pour le partage de liens, et le Core revérifie le membership.

**Navigation (`/app`) :**

| Entrée | Sous-vues | Données |
|---|---|---|
| Tableau de bord | attention, échéances, missions en cours, activité | Core |
| Clients | organisation, sites, contacts | Core + CRM |
| Sites | fiche site, documents, audits, actions, missions | Core |
| Missions | toutes / par type : Audits, Commission de sécurité, Appels d'offres, Accompagnement, Conformité | Core |
| Documents | bibliothèque du workspace, dossiers de mission, recherche, Q/R cité | Core Documents |
| Audits | assessments, rapports ; « ouvrir dans GRACE » pour la saisie terrain | Core ← GRACE |
| Constats et actions | findings normalisés, actions, CAPA liées | Core ← GRACE / QAtrial |
| Échéances | calendrier réglementaire, contractuel, AO | Core |
| Appels d'offres | voir Annexe B | Core ← MCP |
| Commercial | opportunités, devis ; « ouvrir dans le CRM » pour le pipeline complet | Core ← CRM |
| Assistant (Eve) | panneau latéral global plus page | Core (outils) → Eve |
| Rapports | exports mission et site | Core |
| Paramètres | équipe, sites, rôles, notifications, intégrations | Core |

**Transition des UI expertes :**
- La saisie d'audit GRACE (assistant de 3 000 lignes, menaces 3-A, enquêtes), le pipeline CRM et l'écran CAPA QAtrial **restent dans leurs UI** au départ, ouvertes par lien profond avec SSO (OIDC émis par le Core, phase 3).
- On remplace une UI experte **seulement** quand sa vue équivalente existe dans `apps/web` et qu'elle est utilisée.
- Le **client final** ne voit jamais que `apps/web`.

---

## 17. Landing retenue

**Audit des sources (code lu ; aucun rendu, les apps n'ont pas été démarrées dans cet environnement) :**

| Landing | Où | Contenu GSMS | Qualité | Verdict |
|---|---|---|---|---|
| **CRM landing GSMS** | `apps/crm/apps/app/app/(landing)` + `components/landing` (33 fichiers, ~2 500 lignes) | ✅ complet : hero, problème, contextes, parcours, offres, FAQ, `/prestations/[slug]`, formulaire `/demande` déjà branché sur l'intake | Next.js 16, tokens GSMS ; **texte FR en dur hors i18n**, responsive moyen (~39 classes), restes Comp (`github-star-button`, `built-with`, `product-shot`) | **✅ RETENUE comme base de contenu et de structure** |
| DocuLens landing | `apps/doculens/frontend/src/pages/LandingPage.tsx` | ❌ anglais, produit DocuLens | **la plus soignée visuellement** : titres en clamp, gestion de reduced-motion, éditorial | ♻ récupérer la **direction artistique** (typographie éditoriale, rythme, animations sobres) |
| Tenant Core | — | pas de landing ; **login brandé** de qualité | split responsive, i18n | ♻ récupérer le login |
| InvoicePilot | hors repo (version GitHub = e-facture) | adapté seulement sur le laptop | TanStack Start | ❌ abandon de la double vitrine. Si la version laptop a des pages ressources (FAQ, guide GE4/GH4, mentions) meilleures, en **porter le contenu** dans `apps/web` |
| GRACE | — | aucune (login + `demo/brand`) | desktop seulement | ❌ |
| QAtrial | — | aucune (login) | — | ❌ |

**Décision :**
- **Une seule vitrine publique dans `apps/web/app/(public)`**, construite à partir des composants de la landing CRM.
- Sa copie passe en **next-intl** (FR par défaut, EN).
- On y ajoute la **typographie éditoriale DocuLens** et on retire les restes Comp.
- Elle présente **toute la plateforme comme des prestations** : audits, commissions, AO, accompagnement, suivi documentaire. Aucun nom d'outil interne, conformément à la règle de `CHANTIER-01-VITRINE`.
- **Accessibilité** : audit Lighthouse/axe en CI sur `/`, `/prestations`, `/demande`.
- Une fois la landing déplacée, la route `(landing)` du CRM redirige vers `apps/web`.

**Routes :**
```
/                 landing GSMS (public)
/prestations[/slug]   offres
/demande          formulaire → POST Core /api/v1/intake (qui relaie au CRM, idempotent)
/login            login brandé (Core)
/app/...          plateforme authentifiée
```

---

## 18. DocuLens

**Source exacte retrouvée : `github.com/CodeWithMoin/doculens-ai`, commit `218caef`, MIT, © 2025 Moinuddin Shaik.**

Ce n'est pas le premier homonyme venu : plus de 150 dépôts « DocuLens » existent. L'identification repose sur cinq preuves :
- `apps/crm/.../compliance-desk/ATTRIBUTION.md` cite « DocuLens AI frontend (`gsms-core/upstream/doculens/frontend`), MIT, Moinuddin Shaik » ;
- les composants portés (`IntakePage`, `DocumentRow`, `DocumentUploadForm`, `NotificationBell/Center/Toaster`) existent tous dans ce dépôt ;
- Moinuddin Shaik = `CodeWithMoin`, et c'est son seul DocuLens ;
- stack FastAPI, Postgres et Pydantic, conforme au « Desk = FastAPI » de `HANDOFF-CURSOR.md` ;
- le clone `gsms-core/upstream/doculens` n'a jamais été poussé, ce qui explique sa disparition.

**Fait sur cette branche :**
- `git subtree add --prefix=apps/doculens` : **historique amont complet conservé** (14 commits) et licence intacte.
- `apps/doculens/GSMS-PROVENANCE.md` : origine, commit, raison du choix, procédure `subtree pull`.
- **Suppression des PDF d'exemple de l'amont** : CV de l'auteur, avis de taxe foncière, factures, certificat GSTIN. Ils restent dans l'historique amont, déjà public, mais sont retirés de l'arbre. Les dossiers d'ingestion sont désormais ignorés par git.

**Correspondance avec la chaîne demandée :**

| Étape | DocuLens aujourd'hui | Cible GSMS |
|---|---|---|
| Ingestion | upload 25 Mo, disque local, Celery | MinIO, sha256, version, workspace et mission |
| Extraction | **Docling** (layout, tables, pages) ✅ | conservé |
| Classification | LLM, labels hiérarchiques, historique et correction humaine ✅ (mais OpenAI codé en dur) | via la factory, taxonomie FR |
| Structuration | extraction de champs libre, par événement | schémas par type de pièce (RC, CCTP…) |
| Indexation | embeddings OpenAI, timescale-vector, FTS anglais | pgvector + `tsvector('french')`, fournisseur abstrait |
| Recherche | sémantique, hybride sans rerank | RRF, rerank optionnel |
| Résumé | ✅ résumé, puces, prochaines étapes | prompts FR |
| Citations | `[n]` + chunk ; **page non remontée** | page et extrait remontés |
| Dossier exploitable | ❌ | `dossier_template` + complétude + pièces manquantes (Core) |

**Décisions par composant :**

| Composant DocuLens | Décision | Justification |
|---|---|---|
| `doc_utils/extraction.py`, `chunking.py` (Docling + HybridChunker) | **EXTRACT INTO CORE** | Cœur de valeur, peu de lignes, Python et MIT. Il faut lire depuis MinIO. |
| `services/llm_factory.py`, `config/llm_config.py` (Instructor multi-fournisseurs) | **EXTRACT INTO CORE** | Abstraction utile à tout le Core (documents, Go/No-Go, résumés) ; mettre à jour `anthropic`. |
| `services/prompt_loader.py` + `prompts/*.j2` | **EXTRACT** le chargeur ; **REPLACE** les prompts | Prompts à réécrire en français et par type de pièce. |
| `services/vector_store.py`, `embedding` | **ADAPT → CORE** | Garder lots, cache et métadonnées de citation ; ajouter le filtre workspace obligatoire, Alembic, pgvector, recherche française. |
| `label_service`, `classification_service`, `classification_audit` | **ADAPT → CORE** | Labels déjà pensés par workspace ; passer par la factory et scoper. |
| `core/*` (Node, LLMNode, Pipeline, registry) | **ADAPT** (garder le motif Node avec sortie Pydantic) | Simple et lisible ; devient le pipeline d'ingestion du Core, déclenché par événement. |
| `tasks/*` Celery (late acks, prefetch 1) | **KEEP** la configuration, **ADAPT** les tâches | Worker du Core. |
| `evaluation/retrieval.py` (Recall@K, MRR) | **KEEP → CORE** | Non-régression du RAG sur un corpus GSMS. |
| Table `events` comme modèle documentaire, `api/endpoint.py` (1 266 lignes), `document_lifecycle.py` | **REMOVE** (remplacé par le modèle § 11) | Pas de table documents, pas de hash ni de version, SQL brut sur JSONB. |
| Auth (`auth_service`, `auth_router`, users, rôles) | **REMOVE** | Non appliquée aux routes ; le Core fournit l'identité. |
| Frontend complet | **REMOVE** comme application ; **ADAPT** des patterns | Le Desk devient `/app/documents` dans `apps/web` ; on garde les tokens, `design-system.md`, le rendu de citations du QA et la page Intake. |
| `demo_workspace`, `playground/`, `requests/`, compose showcase, Caddy | **REMOVE** | Démo et portfolio. |

**Statut de `apps/doculens` :**
- Il reste **intact, en amont, non déployé, et sert de référence**.
- L'extraction se fait par **copie attribuée** vers `apps/core/gsms_core/documents/` : en-tête MIT plus mention « adapted from CodeWithMoin/doculens-ai@218caef ».
- `apps/doculens` sera supprimé quand l'extraction sera complète et testée. L'historique git en garde la trace.
- **Il n'est pas maintenu comme service, et ce choix est délibéré** : le scénario A (DocuLens service) obligerait à recréer dans DocuLens le modèle workspace/mission/version que le Core doit de toute façon porter.

---

## 19. Stratégie de migration

**Principes :**
- On ne casse rien de ce qui tourne (NUC/VPS) : chaque phase est **additive**.
- Le Core naît **testé** : pytest, ruff et pyright en CI dès le premier commit.
- Une phase n'est finie que lorsque son circuit marche **de bout en bout** sur le NUC.

| Phase | Contenu | Critère de sortie |
|---|---|---|
| **P0 — Hygiène (1 à 2 sem.)** | Reporter les patches TenderAI du NUC dans le repo. Purger le média Metronic (tenant-core, qatrial) et les `verify-*.png`. Retirer `qatrial/server/generated` du versionnement. **CI racine** (GitHub Actions par chemin). Clarifier les licences (contacter l'auteur de TenderAI ; position AGPL pour un usage interne ou un portail client). Recréer dans `docs/` les docs `gsms-core/docs/*` manquants qui comptent (contrat workspace_id). | repo propre, CI verte sur l'existant |
| **P1 — Squelette Core + Web** | `apps/core` (FastAPI, SQLAlchemy 2, Alembic, pytest) : identity, workspace, membership, rôles serveur, service accounts, audit log, event store et outbox, SSE. `apps/web` : landing déplacée, login, Shell, sélecteur de site, tableau de bord vide. Migration des données Tenant Core (script). | login → choix de site → tableau de bord ; tests d'autorisation par workspace |
| **P2 — Missions et documents** | Missions, types, `external_ref`. Extraction du moteur DocuLens vers `core/documents` + MinIO + Celery. UI Documents (dépôt, liste, recherche, Q/R cité). `dossier_template` commission de sécurité, complétude, pièces manquantes. | mission « Préparation commission » : dépôt de 20 pièces → classées → manquantes listées |
| **P3 — Connecteurs** | CRM : intake via le Core, Company ↔ Organization, Deal ↔ Mission, événements `deal.won/lost`. GRACE : `Client` et scope site (plan 2026-09-10), service account, webhook d'événements, findings filtrés par client. QAtrial : Workspace/Project par site, abonnement aux webhooks, création de CAPA. Le handoff GRACE est retargeté (QAtrial et Core uniquement). | un finding GRACE crée une Action dans le Core en moins d'une minute |
| **P4 — Appels d'offres** | Passerelle MCP (client `mcp<2` streamable-http, Bearer). `core/tenders` : mission AO, DCE → Document Engine, go/no-go persistant, échéances. Patch TenderAI : `file_url` présignée + vrai statut de matrice. LexSocket : veille. UI `/app/tenders` (Annexe B). | DCE déposé → pièces typées → exigences → Go/No-Go décidé dans l'UI |
| **P5 — Workflows et assistant** | WF-REMÉDIATION complet (Action → CAPA → preuve → re-test → clôture), timers d'échéances, notifications. Serveur MCP « gsms » exposé par le Core ; les outils d'Eve sont rebranchés sur le Core (lecture d'abord, écriture en mode proposition). | les scénarios de § 13 passent en test d'intégration |
| **P6 — Décommission** | Backend Tenant Core retiré (UI absorbée). Compliance Desk CRM supprimé. Landing CRM redirigée. OIDC Core → SSO GRACE/QAtrial/CRM pour les liens profonds. **Revue M+6 de QAtrial** (garder ou remplacer par une CAPA native). | un seul point d'entrée utilisateur |

**Squelette proposé pour `apps/core` :**
```
apps/core/
  pyproject.toml  alembic.ini  Makefile
  gsms_core/
    main.py  settings.py  db.py  security.py
    identity/  missions/  documents/  evidence/  work/  events/  workflows/
    connectors/{crm,grace,qatrial}/  mcp_gateway/  agents/  audit/  workers/
  migrations/
  tests/{unit,integration,contracts}/   # contrats : finding.schema.json, webhooks, MCP
```

---

## 20. Risques

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| **Licence TenderAI absente** : usage, modification et redistribution non autorisés par défaut | haute | haut | Contacter dbugom ; à défaut, le garder strictement en service interne non redistribué et prévoir son remplacement par un `core/tenders` réimplémenté. |
| **AGPL GRACE / QAtrial** si un portail client SaaS les expose | moyenne | haut | Le client final ne touche que `apps/web` + Core (non AGPL). Les services AGPL restent internes. Publier les modifications si un jour ils sont exposés (le repo est déjà public). |
| **Média Metronic dans un dépôt public** | certaine | moyen | Purge en P0 (25 + 27 Mo, ~99 % inutilisé). |
| Second système (Core) qui ne rattrape jamais l'existant | moyenne | haut | Additif par phase ; chaque phase livre un circuit réel ; pas de réécriture des services. |
| Dérive « le Core copie tout » | moyenne | moyen | Règle § 3 : seulement `external_ref` + projection marquée cache, contrôlée en revue. |
| Multi-tenant GRACE plus coûteux que prévu | moyenne | moyen | Option de repli : une instance GRACE par gros client, ou scope par Asset `SITE` seulement. |
| Fuite de données entre workspaces dans la recherche vectorielle | faible | **critique** | Filtre au niveau du repository + test pytest systématique + `workspace_id` dans chaque chunk. |
| Données clients sensibles (plans de sûreté) envoyées à un LLM tiers | moyenne | haut | Fournisseur configurable par workspace ; option locale ; journalisation des envois. |
| Divergence repo / prod (déjà vraie pour TenderAI) | haute | moyen | P0 : réconcilier ; déployer uniquement depuis le repo. |
| Charge d'un développeur seul plus des agents | haute | moyen | Moins de services (hybride), CI stricte, contrats testés, ordre P0→P6 sans parallélisme excessif. |

---

## Annexe A — Matrice de décision par composant

| Composant | Décision | Justification courte (valeur · qualité · licence · couplage · base · tests) |
|---|---|---|
| CRM : Company / Contact / Deal / Activity / mail / agenda / tracking | **KEEP** | Mature, MIT, ~115 tests, base dédiée. |
| CRM : intake public `/api/public/*` | **KEEP + ADAPT** | Idempotent et testé ; appelé par le Core et plus seulement par la vitrine. |
| CRM : Eve (agent, 28 tools) | **KEEP + ADAPT** | Devient l'assistant transverse ; outils rebranchés sur le Core (Annexe C). |
| CRM : DealStage SaaS | **ADAPT** | Étapes métier GSMS (qualification, devis, signé, en cours, livré). |
| CRM : Quote / Invoice | **CREATE dans le CRM** | Domaine commercial ; absent partout ; jamais dans le Core. |
| CRM : landing GSMS | **REPLACE** (déplacée vers `apps/web`) | Une seule vitrine. |
| CRM : Compliance Desk (démo) | **REMOVE** | Remplacé par `/app/documents`. |
| CRM : enrichissement de personnes (LinkedIn, Perplexity…), agent builder, télémétrie PostHog amont | **REMOVE / désactiver** | Faible valeur, risque RGPD ; télémétrie active par défaut. |
| CRM : `trust.controller` (agrégation findings) | **REPLACE** | L'agrégation passe dans le Core (`work.finding_ref`). |
| GRACE : moteur 3-A, enquêtes, assistant, rapport PDF, packs FR | **KEEP + ADAPT** | Valeur métier forte ; AGPL ; couplé à Prisma. Adapter : `Client` et scope site, service account, webhooks, tests. |
| GRACE : `risk-engine.ts`, scoring (pur) | **KEEP** (pas de portage) | ~150 lignes ; le porter n'apporte rien tant que GRACE calcule. |
| GRACE : référentiels JSON (`docs/rulesets`, seeds packs) | **KEEP** comme données partagées | Réutilisables par le Core (dossier_template, échéances réglementaires). |
| GRACE : `circuit-handoff` (SimpleRisk / Xacta) | **ADAPT** | Retargeter vers QAtrial et le Core uniquement. |
| GRACE : magasin cyber JSON sur disque | **REPLACE** | Preuves → Core Documents. |
| GRACE : UI | **KEEP** (outil expert auditeur) → **REPLACE** progressivement | Vues de consultation dans `apps/web` ; la saisie terrain reste dans GRACE. |
| QAtrial : CAPA, Deviation, Signature, AuditLog, Workflows à SLA, `/findings`, webhooks | **KEEP + ADAPT** | AGPL ; utile pour la CAPA formelle. Réparer les 11 tests rouges. Revue M+6. |
| QAtrial : GAMP, LIMS/SAP (stub), Training/Quiz, Supplier portal, prédictif IA, verticals pharma restants | **REMOVE** | Hors métier ; Training doublonne School. |
| QAtrial : UI | **KEEP** (outil qualité interne) → absorbée si la CAPA migre | |
| Tenant Core : modèle User / Org / Workspace / Membership | **MERGE INTO CORE** (réécrit en Python) | Petit et propre ; corriger membership par site, enum de rôles, autorisation serveur, migrations. |
| Tenant Core : backend Hono, BFF, `mock-data.ts` | **REMOVE** (après P1/P3) | Remplacé par le Core. |
| Tenant Core : UI (Shell, login, notifications, plaquette PDF, i18n) | **EXTRACT** vers `apps/web` | Meilleure coque d'application du dépôt. |
| Tenant Core : `public/media` Metronic | **REMOVE** | Licence + 25 Mo inutiles. |
| TenderAI MCP Max | **KEEP** (service MCP) + **ADAPT** léger | Réconcilier avec le NUC ; `file_url` ; vrai statut de matrice ; mode data-tool. Licence à régulariser. |
| TenderAI : LLM intégré « cerveau » | **REMOVE** comme décideur | Eve rédige ; TenderAI structure et génère les fichiers. |
| TenderAI : OAuth claude.ai, nginx | **REMOVE** (inutilisés) | Bearer de service suffit derrière le Core. |
| LexSocket `mcp-tenders` | **KEEP** comme configuration | Client tiers ; aucune logique à maintenir. |
| tdai-memory-agents / TencentDB Memory | **KEEP** séparé | Mémoire de contexte pour Eve ; jamais une vérité métier. |
| DocuLens | voir § 18 | Moteur → Core ; reste → retiré. |
| InvoicePilot (vitrine hors repo) | **REMOVE** comme vitrine ; **EXTRACT** du contenu si meilleur | Une seule landing. |
| `docs/circuit/contracts/finding.schema.json` | **KEEP** (contrat des connecteurs) | Déjà implémenté par GRACE et QAtrial ; devient un test de contrat du Core. |

## Annexe B — Interface Appels d'offres

**Circuit imposé :** `Next.js → Core /api/v1/tenders/* → mcp_gateway → TenderAI / LexSocket → résultats structurés → Core (persistance) → Next.js`. L'UI n'appelle jamais `:8090`.

| Onglet (`/app/tenders/{missionId}`) | Source | Tool / donnée |
|---|---|---|
| **Opportunités** (`/app/tenders`) | LexSocket | `search_tenders`, `search_ted`, `get_open_opportunities`, `browse_by_deadline` ; filtres CPV / NUTS / montant / date |
| Dossier, synthèse | Core | mission AO, acheteur, lots, montant, statut, prochaines échéances |
| DCE / Pièces | Core Documents | upload zip, pièces typées RC/CCTP/CCAP/AE/BPU/DPGF/annexes, pièces exigées vs fournies |
| Analyse | TenderAI + Core | `parse_tender_rfp` (URL présignée), sections, critères d'évaluation |
| Exigences | TenderAI → Core | `rfp.requirements` persistées par le Core, avec propriétaire et statut |
| Conformité | TenderAI (`generate_compliance_matrix`, JSON) | **⚠ statut codé en dur à corriger avant exposition** ; statut final décidé par l'humain dans le Core |
| Go / No-Go | **Core** | grille déterministe (adéquation métier, capacité, géographie, marge, risques, délai) + avis Eve + décision humaine tracée |
| Risques | Core | issus de l'analyse et de la grille |
| Questions | Core | questions à l'acheteur, date limite de questions |
| Réponse technique | TenderAI | `write_technical_section`, `build_full_technical_proposal` → Document versionné |
| Réponse financière | TenderAI | `ingest_vendor_quote`, `build_bom`, `calculate_final_pricing`, `generate_financial_proposal` |
| Documents | Core | toutes les versions générées et déposées |
| Échéances | Core + `check_submission_deadline` | jalons (questions, visite, remise), rappels |
| Historique | Core `event` + `audit.log` | |
| Agents | Eve (panneau) | « prépare les pièces du DCE », « résume le CCTP », recherche dans les offres passées (`search_past_proposals`) |

## Annexe C — Agents / Eve

**Doctrine : CODE CALCULE · MOTEUR EXÉCUTE · AGENT EXPLIQUE / ASSISTE / ORCHESTRE · HUMAIN VALIDE.**

- **Eve reste l'unique assistant.** Le framework eve (TS) reste dans `apps/crm/apps/agent`, sans réécriture.
- **Le Core expose un serveur MCP « gsms »** dont les outils sont des appels à l'API Core, avec les permissions de l'utilisateur qui pose la question.
  - Exemples d'outils : `list_tenders(closing_within=7d)`, `missing_documents(mission)`, `summarize_audit(workspace)`, `explain_capa_status(capa)`, `prepare_dce_pieces(mission)`, `open(uri)`.
  - Eve ajoute ce serveur à ses tools existants.
- **Lecture d'abord.** Une écriture par un agent (créer une tâche, une action, un brouillon) est **une proposition** qu'un humain valide dans l'UI. Les exceptions explicites, dans une politique `agents/policy.py`, couvrent les actions réversibles à faible enjeu.
- Chaque appel d'outil est journalisé (`audit.log`, `actor = agent:eve`, plus l'utilisateur pour le compte de qui il agit).
- **Les décisions métier ne sont pas prises par un LLM** : échéances, sévérité, complétude, CAPA requise ou non, score Go/No-Go sont calculés en Python. Le LLM explique, résume et rédige.
- **La mémoire Tencent sert au contexte** (préférences, décisions passées). Elle n'est jamais lue par le Core comme une donnée métier.

## Annexe D — Écarts doctrine actuelle → V2

| Doctrine actuelle (`STACK-GSMS-FINALE.md`) | V2 | Pourquoi |
|---|---|---|
| « Cockpit / Core = Comp AI CRM + Eve » | Core = `apps/core` (Python). Le CRM redevient le domaine commercial. | Le CRM n'a ni mission, ni multi-tenant, ni documents ; en faire le Core le transformerait en monolithe. |
| « Eve décide ; Eve pull ; rien ne pousse » | Les apps poussent leurs **événements vers le Core** (pas vers le CRM) ; les workflows sont déterministes ; Eve assiste. | Sans événements, aucun workflow ne peut reprendre à l'arrivée d'une preuve. |
| « Pas de fusion des codebases » | Maintenu pour CRM, GRACE, QAtrial et TenderAI ; **fusion ciblée** DocuLens + identité Tenant Core dans le Core. | Licences et valeur. |
| « Une base par appli, jamais partagée » | **Maintenu**, sur un cluster Postgres commun par environnement. | Cycles de migration indépendants. |
| « InvoicePilot = vitrine + portail » | Une seule app `apps/web` (landing + plateforme + portail client). | Fin des vitrines concurrentes. |
| « Pas de package UI partagé » | Maintenu : `apps/web` est **la** UI ; les UI expertes ne sont pas restylées davantage. | |

---

*Ce document est une proposition. Rien ne démarre (P0 compris) sans GO explicite de Samir. Les chiffres (lignes, tests, tailles) viennent des audits de code du 2026-10-02 sur `main@80e7419`.*
