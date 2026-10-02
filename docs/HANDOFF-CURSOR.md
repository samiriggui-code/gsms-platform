# Handoff Cursor → Claude

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
