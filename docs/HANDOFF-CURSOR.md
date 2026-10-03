# Handoff Cursor → Claude

## 2026-10-03 — Chantier 1 DocuLens serveur (auth / sites / Core / FR / Traefik)

Branche `cursor/doculens-server-gsms-74cc`. Uniquement le serveur DocuLens (pas UI i18n).

**Fait :**
- Auth réelle sur routes `/events/*` : Bearer JWT Core (`iss=gsms-core` + `GSMS_PLATFORM_JWT_SECRET`) ou compte local, ou `X-API-Key` + `X-GSMS-Workspace-Id` (service).
- Isolation par site : `workspace_id` injecté dans les events JSONB ; listes/get filtrés ; `request.state` (pas ContextVar — threadpool FastAPI).
- Notify Core HMAC : `document.ingested` / `document.classified` → `POST {GSMS_CORE_URL}/api/v1/events/ingest/doculens`.
- Taxonomie FR seedée au boot (`registre_securite`, `pv_commission_precedente`, `dce`, …) + prompt classifieur FR.
- Deploy Traefik : `apps/doculens/deploy/vps/docker-compose.vps.yml` → `doculens.gsms-security.com`.
- App renommée côté settings : **GSMS Documents**.
- Tests : `tests/test_gsms_*.py` + endpoints auth (25 passent).

**Pour Claude / ops :**
- DNS A `doculens` + secrets Core alignés (`jwt_secret`, `webhook_secrets.doculens`).
- Chantiers 2–5 (UI i18n, vitrine, CRM, GRACE/QAtrial) non touchés.

---

## 2026-10-03 — Cartographie DocuLens (auth / lifecycle / Core HMAC)

Exploration lecture seule de `apps/doculens` + ingest Core. Points utiles pour le chantier serveur :

- **JWT DocuLens** (`get_current_user`) ne protège que `GET /auth/me`. Routes documents/events = `require_api_key` (no-op si `DOCULENS_API_KEY` vide) + showcase write-guard. Pas de scoping user/workspace sur les docs.
- **Documents** = events JSONB (`document_upload` + `task_context.metadata.document`), pas de table Document. `workspace_id` n’existe que sur `document_labels` (nullable) et n’est jamais passé depuis les endpoints.
- **Hook notify Core** : après `pipeline.run` dans `app/tasks/tasks.py` (`document_upload` → ingested ; `_auto_classify_from_summary` / `record_classification_result` → classified). Core attend `POST /api/v1/events/ingest/{source}` + `X-GSMS-Signature: sha256=<hmac>` ; taxonomie FR déjà dans `gsms_core/documents/dossier.py`.
- Doctrine rappelée : ne pas déployer DocuLens tel quel ; extraction vers Core P2 (`documents/ingestion/README.md`).

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
