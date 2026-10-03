# Handoff Cursor → Claude

## 2026-10-03 — Chantier Core : pipeline documentaire Docling + Digest (suite de la PR #3)

Branche `cursor/gsms-core-context-authority-74cc` (même PR #3). Reprise depuis l'état GitHub : l'« audit document pipeline » et la mise à jour de ce fichier faits par Cursor n'avaient pas été poussés (perdus avec la session).

**Décision appliquée :** Docling = moteur documentaire universel (engine), DocuLens = interface documentaire, Digest = Core.

**Livré (Core uniquement, tout le reste de PR #3 conservé tel quel) :**
- **Adapter :**
  - `documents/parsers/` : `DocumentParser` (interface), `DoclingAdapter` (seul fichier qui importe Docling, import paresseux, convertisseur injectable), `NormalizedDocument` + `SourceRef` (page / section / bloc pour PDF-DOCX ; feuille + cellule A1 pour XLSX).
  - Docling en extra optionnel `gsms-core[docling]`.
- **Pipeline :** `documents/parsing.py` + table `document_parse` (PENDING → RUNNING → PARSED | FAILED, `result` = NormalizedDocument JSON).
- **Digest :** `digest/` (classifier, requirements, obligations, deadlines, deliverables, risks, reconciliation, conflicts, completeness, provenance, engine, service, router) + table `digest_workspace_digest`.
  - `WorkspaceDigest` multi-document : documents, entités, exigences, obligations, échéances, livrables, risques, informations manquantes, conflits, prochaines actions.
  - Conflit `STAFFING_QUANTITY_MISMATCH` (ex. CCTP 2 SSIAP1 / BPU 1 / DPGF 2), `DEADLINE_MISMATCH`.
  - Garde-fou `WorkspaceMismatch` : jamais deux workspaces mélangés.
- **Workspace canonique :** partout `workspace_id` Core (aucun autre identifiant documentaire). `client_id`, `site_id` et l'engagement (Mission) sont résolus comme dans le ContextResolver.
- **EventBus existant :**
  - `document.uploaded` (déjà là), `document.parsing.started`, `document.parsed`, `document.parsing.failed` ;
  - `digest.build.started`, `digest.updated`, `digest.failed`, `digest.conflict.detected`, `digest.missing_information.detected`.
  - Pas de route sortante (outbox) : contrat prêt pour l'orchestration.
- **API :**
  - `POST|GET /api/v1/workspaces/{ws}/documents/{id}/parse` (dans le router documents existant) ;
  - `GET /api/v1/workspaces/{ws}/digest`, `POST …/digest/rebuild`, `GET …/digest/conflicts`, `GET …/digest/missing`.
- **Asynchrone :** chemin minimal `BackgroundTasks` (202, puis parsing et reconstruction du Digest hors requête, session dédiée). Le Core n'a pas encore de worker.
- **ApplicationRegistry :**
  - `ApplicationKind` business / engine ;
  - `docling` = engine, non liable à un workspace (400) ;
  - DocuLens recentré sur `document_upload/view/search/navigation/provenance` ;
  - `CORE_CAPABILITIES["core_digest"]` ;
  - « Intake / Digest » renommé « Intake ».
- **ContextResolver :** `context.digest` = dernier Digest (id, date, compteurs).
- **Migration `0003_document_parse_digest`** (validée upgrade/downgrade sur PostgreSQL 16 + SQLite).
- **Tests :** `tests/test_docling_adapter.py` (8) + `tests/test_digest.py` (11), Docling simulé (`tests/fake_docling.py`). Suite complète **100 verts**, ruff propre.

**DEFERRED / CHANTIER SUIVANT (non fait volontairement) :**
- Worker de parsing (l'outbox existe ; Celery/RQ ou worker dédié à l'image Docling) à la place de `BackgroundTasks` ; image Docker Core avec l'extra `docling` ou worker séparé.
- Brancher DocuLens UI → Core (upload/parse/digest) ; retirer `DOCULENS_DEFAULT_WORKSPACE_ID` côté DocuLens.
- Orchestration : routes outbox `digest.*` → Tender MCP / GRACE / QAtrial / Eve.
- Chunking hybride + embeddings + recherche citée (pgvector, `tsvector('french')`) au-dessus de `NormalizedDocument` ; reprise possible de `evaluation/retrieval.py` de DocuLens.
- Extraction enrichie (LLM en assistance, jamais décideur) : obligations / livrables plus fins, critères de notation, allotissement.
- Front `apps/web` : écran Digest du workspace.
- Les 5 chantiers lancés puis arrêtés (i18n web/CRM/GRACE/QAtrial, refonte DocuLens) sont dans `git stash` (« abandoned-5-chantiers-… ») sur `main`, non poussés.

---

## 2026-10-03 — PRIORITÉ N°1 : autorité contexte GSMS Core (audit + fondations)

Branche `cursor/gsms-core-context-authority-74cc`.

**Problème :** `X-GSMS-Workspace-Id` manquant n’est pas un bug de header — le concept workspace/prestation/client n’est pas centralisé. DocuLens / CRM / QAtrial / GRACE portent des « workspaces » incompatibles ; le front retombait sur `workspaces[0]`.

**Phase 1 — Audit :** `docs/architecture/GSMS-CONTEXT-WORKSPACE-AUDIT.md` (16 réponses + inventaire).

**Phases 2–5 livrées dans Core + web :**
- `gsms_core/context/` : ApplicationRegistry, ServiceCatalog, WorkspaceManager, ContextResolver, Contact + bindings (`workspace_application_bindings`, `client_application_bindings`, `contact_application_bindings`)
- API : `POST /engagements`, `GET /context/by-{workspace,engagement,site,client}`, `GET/POST /workspaces/{ws}/applications|context`, catalogues apps/types
- Migration `0002_context_bindings`
- Web : `lib/gsms/context.ts` + `load-context.ts` ; `coreFetch` propage Tenant/Client/Site/Engagement/Workspace ; **suppression du fallback `workspaces[0]`**
- Connecteurs Core : headers client/site/engagement étendus
- Tests : `tests/test_context.py` (5) + auth/isolation verts

**Règle :** Mission Core = Engagement ; Workspace Core = seul ID canonique ; apps liées via bindings (jamais inventer un UUID DocuLens côté UI).

**Suite (phases 6–13) :** brancher DocuLens/Tender/GRACE/QATrial/Eve sur bindings ; WorkflowEngine/EventBus déjà présents à enrichir ; supprimer defaults DocuLens (`DOCULENS_DEFAULT_WORKSPACE_ID`) sur la branche serveur DocuLens.

---

## 2026-10-02 — Clarification : Core = pont, pas CRM ; sous-domaines `*.gsms-security.com`

**Intention user (reformulée) :**
- Un Docker / une base **par** app (CRM, GRACE, QAtrial, MCP…).
- Tous sous **`*.gsms-security.com`** (pas `global-it-ss.com` — domaine entreprise / vitrine du studio).
- Landing + Core = façade client ; chaque app spécialité travaille un dossier (manuel **et** circuit).
- Formulaire `/demande` : CRM crée Company/Contact/Deal ; Core crée Workspace/Mission (en parallèle si possible).

**Réponse technique (code actuel) :**
- Le Core **peut** (et doit) être le **pont** : événements, missions, workspaces, connecteurs, passerelle MCP.
- Le Core **ne remplace pas** Comp CRM + Eve aujourd’hui : pas d’`/intake`, pas de Company/Deal/mail/agenda/Eve. La landing attend `POST /api/v1/intake` (absent → 503).
- **Garder CRM + Eve** dans le circuit sous `crm.gsms-security.com`. Canon V2 WF-INTAKE = landing → Core intake → CRM (deal) + Core (org/ws/mission).

---

## 2026-10-02 — Unification sous `gsms-security.com` (état live + recommandation)

### État live (vérifié aujourd’hui)

Tout pointe déjà vers **le même VPS** `187.77.166.124` :

| Host | HTTP | Stack actuelle |
|---|---|---|
| `gsms-security.com` | 200 | `gsms-platform` = `db` + `core` + `web` (Traefik → web seulement) |
| `crm.global-it-ss.com` | 307 → `/sign-in` | compose `gsms-crm` (Postgres + Redis + MinIO + api + app + eve) |
| `grace.global-it-ss.com` | 200 | compose `gsms-grace` (Postgres + api + web nginx) |
| `qatrial.global-it-ss.com` | 200 | compose `gsms-qatrial` (Postgres + app) |
| `mcp.global-it-ss.com` | 401 Bearer | compose `gsms-mcp` (TenderAI MAX) |

Ce n’est **pas** un problème de machine séparée : ce sont **plusieurs projets Compose + Host Traefik** sur un seul VPS. Arrêter « pour les mettre sur le même Docker que la landing » n’apporte rien tant que le Core n’est pas branché (`GSMS_*_URL` / tokens encore vides côté platform).

### DocuLens

- `apps/doculens` = amont MIT, **non déployé**, compose showcase + Caddy local seulement.
- Canon V2 § 18 : **ne pas déployer DocuLens comme service**. Extraire le moteur vers `apps/core/.../documents` ; UI → `/app/documents` dans `apps/web`. Déployer DocuLens à côté de la landing contredit cette doctrine.

### Ce qu’il ne faut pas faire d’un coup

1. **Un seul mega-compose** qui fusionne CRM + GRACE + QAtrial + MCP + DocuLens + landing dans `docker-compose.yml` de la plateforme → casse le déploiement actuel (`deploy.sh` ne connaît que db/core/web), mélange AGPL (GRACE/QAtrial) avec le Core/Web, multiplie les Postgres dans un seul projet, et augmente le blast radius d’un `compose down`.
2. **Exposer GRACE/QAtrial sous le portail client** (`gsms-security.com/app…`) → risque AGPL § 20 (client final = `apps/web` + Core seulement).
3. **Arrêter** les stacks `global-it-ss.com` avant smoke + bascule DNS + branchement Core.

### Cible recommandée (sans casser)

**Phase A — exposition sous marque GSMS (DNS + Traefik, stacks inchangées)**  
Sous-domaines internes / outils experts, pas le navigateur client public :

- `crm.gsms-security.com` → stack CRM actuelle  
- `grace.gsms-security.com` → GRACE  
- `qatrial.gsms-security.com` → QAtrial  
- `mcp.gsms-security.com` → TenderAI (Bearer, jamais public)  

Garder `*.global-it-ss.com` en parallèle (redirect ou double Host Traefik) jusqu’au GO, puis bascule A-record. Ne pas arrêter NUC lab sans GO.

**Phase B — brancher le Core (réseau interne)**  
Dans `/opt/gsms-platform/.env` : `GSMS_CRM_URL`, `GSMS_GRACE_URL`, `GSMS_QATRIAL_URL`, `GSMS_TENDERAI_MCP_*` + recopier `GSMS_WEBHOOK_SECRETS` dans chaque émetteur. Les apps spécialisées restent des compose séparés ; le Core les appelle, le navigateur parle à `apps/web` seulement (liens profonds expert en transition).

**Phase C — DocuLens**  
Pas de déploiement DocuLens. Extraire Docling/chunking/embeddings vers Core (P2 V2) ; UI documents dans `apps/web`.

**Phase D (optionnelle, plus tard)** — un `docker-compose.platform.yml` d’orchestration qui **inclut** les fichiers compose existants (`include:` / profiles) pour un `up` unique, **sans** fusionner les bases ni le code.

### Décision demandée

Valider Phase A (sous-domaines `*.gsms-security.com` + double Host) avant toute modification Traefik/DNS ou arrêt des stacks `global-it-ss.com`.
