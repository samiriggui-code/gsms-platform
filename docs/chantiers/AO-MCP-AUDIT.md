# Chantier AO-MCP — audit de l'existant et plan d'implémentation

> Réponse au §20 de [`AO-MCP.md`](./AO-MCP.md). Audit réalisé le 2026-10-03 sur `main` (a501216), en lecture
> seule. Rien n'est implémenté tant que Samir n'a pas validé ce plan.

Sommaire : 1. Inventaire · 2. Gaps · 3. Architecture cible · 4. Mapping outils existants → capacités ·
5. Fichiers à modifier · 6. Nouveaux modules minimaux · 7. Tests · 8. Ordre d'implémentation (une PR par étape) ·
9. Décisions prises / points à valider.

---

## 1. Inventaire

### 1.1 MCP Appel d'offres — `apps/tenderai-mcp-server-max`

- Python 3.12, FastMCP (`mcp[cli]` 1.x), transport stdio ou HTTP streamable (`app/server.py:146-185`).
  Authentification : OAuth, sinon Bearer statique `MCP_API_KEY`, sinon **aucune** (simple warning).
  La comparaison du Bearer n'est pas à temps constant (`app/middleware/auth.py:47`).
- Base SQLite globale (`db/tenderai.db`), tables `rfp`, `proposal`, `vendor`, `bom`, `partner`,
  `partner_deliverable`, `past_proposal_index` (FTS5 + vecteurs Voyage), `oauth_*`.
  **Aucune notion de workspace ni de tenant.** L'identifiant d'un AO est `rfp.id`, 12 caractères hexadécimaux.
- **Les fichiers sont désignés par des chemins locaux au serveur** (`file_path`, `quote_file`, `folder_name`).
  Aucun outil ne permet d'envoyer ou de récupérer un fichier : le Core distant ne peut ni fournir un DCE, ni
  récupérer un livrable.
- LLM Anthropic (`ANTHROPIC_API_KEY`). Le modèle par défaut (`app/config.py:30`) est un identifiant invalide, à
  surcharger. Les prompts sont en anglais et orientés intégrateur IT (Oman, devise OMR), rien de sûreté privée.
- **Aucun test.** Le serveur n'est pas déployé par `deploy/deploy-all.sh` (il a son propre
  `deploy/vps/docker-compose.vps.yml`, port 8090, `mcp.gsms-security.com`).

**Liste réelle des outils : 18** (+ 5 resources, 4 prompts).

| # | Outil (fichier:ligne) | Nature | Constat |
|---|---|---|---|
| 1 | `parse_tender_rfp` (`tools/document.py:32`) | LLM | Texte tronqué à 15 000 caractères, structuré en JSON par le LLM |
| 2 | `generate_compliance_matrix` (`document.py:121`) | LLM | **Statut forcé à « Compliant »** (l.157), sans preuve ni page |
| 3 | `check_submission_deadline` (`document.py:172`) | déterministe | Jours restants, jalons J-14…J0 |
| 4 | `validate_document_completeness` (`document.py:255`) | déterministe | 7 sections « IT » codées en dur, ne lit pas les pièces exigées par le DCE |
| 5 | `write_technical_section` (`tools/technical.py:210`) | LLM | Contextualisé par les propositions passées (RAG) |
| 6 | `build_full_technical_proposal` (`technical.py:302`) | LLM | 9 sections génériques en série, puis DOCX |
| 7 | `generate_architecture_description` (`technical.py:360`) | LLM | Orienté IT |
| 8 | `write_compliance_narrative` (`technical.py:411`) | LLM | Un paragraphe par exigence |
| 9 | `ingest_vendor_quote` (`tools/financial.py:32`) | LLM | **Lignes extraites non persistées** |
| 10 | `build_bom` (`financial.py:114`) | déterministe | Lignes BOM et marge |
| 11 | `calculate_final_pricing` (`financial.py:180`) | déterministe | Marge par catégorie (SQL) |
| 12 | `generate_financial_proposal` (`financial.py:228`) | déterministe | DOCX et XLSX de BOM ; société « TenderAI » codée en dur |
| 13 | `draft_partner_brief` (`tools/partners.py:26`) | LLM | Brief partenaire |
| 14 | `create_nda_checklist` (`partners.py:83`) | statique | 8 points NDA |
| 15 | `track_partner_deliverable` (`partners.py:163`) | déterministe | Suivi de livrable partenaire |
| 16 | `index_past_proposal` (`tools/indexing.py:96`) | LLM + embeddings | Indexe une réponse passée |
| 17 | `search_past_proposals` (`indexing.py:261`) | déterministe | FTS5, vecteurs, fusion de rangs (RRF) |
| 18 | `list_indexed_proposals` (`indexing.py:358`) | déterministe | — |

**Excel dans le MCP**
- Lecture : openpyxl avec `data_only=True` (`app/services/parser.py:89`). Les formules sont perdues et le classeur
  est aplati en texte.
- Écriture : un nouveau classeur BOM en valeurs, sans formule.
- **Aucun remplissage d'un modèle client** : ni BPU, ni DPGF, ni DQE.

**Rien sur** : effectifs, vacations, majorations, plan de prévention, checklist des pièces administratives, PDF,
ZIP.

**`apps/mcp-tenders`** : proxy stdio vers LexSocket (veille TED et sources nationales). Le Core appelle
directement `mcp.lexsocket.ai`, donc ce paquet est hors périmètre.

**`apps/tdai-memory-agents`** : outillage mémoire Eve/Jarvis, sans lien avec les AO.

### 1.2 GSMS Core — `apps/core`

**Ce qui sert déjà au circuit AO**

- **Dossier AO**
  - `tender_case`, un par mission `APPEL_OFFRES` (`tenders/models.py`).
  - Grille Go/No-Go **déterministe** (`tenders/scoring.py` : moyenne pondérée, seuil 60, critère éliminatoire).
  - Décision humaine motivée et auditée (`tenders/service.py:103-145`), événement `tender.go_no_go.decided`.
  - Veille LexSocket (`tenders/opportunities.py`).
  - Routes : `GET|POST /workspaces/{ws}/tenders`, `GET /{mission}`, `GET /{mission}/go-no-go`,
    `POST /{mission}/go-no-go/decision`, `GET /opportunities`.
  - Aucun endpoint ne permet de saisir les critères : `score_case` n'est appelé que dans les tests.
- **Documents**
  - Upload hashé SHA-256 et chiffré (coffre-fort AES-256-GCM, clé par workspace), versions, dossiers.
  - Journal d'accès, audit chaîné, `DocumentSource.GENERATED` pour les livrables produits.
- **Analyse et Digest**
  - Parse Docling : PDF, OCR, DOCX, XLSX, CSV, PPTX, images.
  - `NormalizedDocument`, où chaque bloc ou cellule porte un `SourceRef` : document, version, page, feuille,
    section, tableau, **cellule A1**, extrait.
  - Digest **par règles, sans LLM** (`digest/`) :
    - classification des pièces : rc, cctp, ccap, ae, bpu, dpgf, dqe, dc1, dc2, memoire_technique… ;
    - exigences, **uniquement le staffing** (SSIAP 1/2/3, ADS, rondier, cynophile) ;
    - obligations, échéances, livrables, risques, conflits, pièces manquantes ;
    - identifiants stables.
  - Le Digest se reconstruit automatiquement après chaque parse.
- **Infrastructure**
  - EventBus persistant avec outbox (aucun worker ne la vide).
  - Moteur de workflows déclaratif ; une seule définition, `WF-REMEDIATION` ; les timers ne sont pas branchés.
  - Audit chaîné.
  - `context/engagements` crée un workspace, une mission et des bindings d'applications. Le catalogue `tender`
    déclare déjà les étapes ingestion_dce, matrice_conformite, production_bpu_dpgf_dqe, memoire_technique,
    controle_qualite, submission_checklist, sans les exécuter.
- **Passerelle MCP** (`mcp_gateway/`)
  - Client JSON-RPC HTTP avec liste blanche.
  - TenderAI : 7 outils autorisés, tous existants, mais **le client TenderAI n'est appelé nulle part**.
    `generate_financial_proposal` est autorisé mais inutilisable, car il exige un `proposal_id` produit par
    `build_bom`, qui n'est pas autorisé.
  - URL par défaut `localhost:8765`, alors que le serveur écoute sur 8000, ou 8090 sur le VPS.
- **Connecteurs**
  - CRM : branché sur l'intake.
  - GRACE `list_findings` et QAtrial `list_findings`/`create_capa` : réels mais jamais appelés.
- **Dépendances** : jinja2 est présent ; **openpyxl, python-docx et un moteur PDF sont absents**.
- **Tests** : environ 146 tests sur SQLite en mémoire, Docling simulé (`tests/fake_docling.py`, avec fixtures RC,
  CCTP, BPU et DPGF). `test_migrations.py` vérifie la cohérence entre migrations et modèles.

### 1.3 Portail — `apps/web`

- `/app/tenders` liste les dossiers et la veille. `/app/tenders/[missionId]` affiche un en-tête et 14 onglets
  (`lib/tenders/tabs.ts`) : synthese, pieces, analyse, exigences, conformite, go-no-go, risques, questions,
  reponse-technique, reponse-financiere, documents, echeances, historique, agents.
- Seuls **liste, veille, synthèse et go/no-go** ont un endpoint Core ; les 12 autres onglets reçoivent un 404.
- Les boutons « Déposer le DCE », « Lancer l'analyse », etc. sont désactivés, et aucun formulaire de décision
  Go/No-Go n'existe.
- Les données passent par `coreFetch` côté serveur et la passerelle `app/api/core/[...path]`. L'upload multipart
  existe déjà pour le coffre-fort (`app/api/vault/[ws]`).
- Pas de types générés, pas de tests front. CI : lint, tsc, build.

### 1.4 DocuLens — `apps/doculens`

- Décision du 2026-10-03 : **Docling et le Digest appartiennent au Core**. DocuLens est l'interface
  documentaire en mode Core : dépôt, consultation, recherche, affichage de provenance (« Feuille!B4 », « p. N »).
- Le backend amont (Celery, vecteurs, classification par LLM) n'est pas utilisé et ne doit pas être réactivé.
- Manques :
  - pas de dépôt ZIP de DCE ;
  - pas de rattachement des pièces à un lot ;
  - pas de lignes de prix structurées ;
  - pas de rectificatifs du DCE.

### 1.5 GRACE — `apps/grace` (Fastify, Prisma, PostgreSQL)

- Moteur de risques complet :
  - `Assessment` (avec `metadata` JSON), `Threat`, `Countermeasure`, `CountermeasureGap`, `ActionPlan`,
    `Recommendation` ;
  - packs ERP, IGH, site sûreté et CNAPS ;
  - rapports PDF et HTML.
- API utile : `GET /api/findings` (contrat `shared/contracts/finding.schema.json`),
  `GET /api/assessments/:id/applicability`, `…/suggested-threats`, `…/summary`, `…/action-plans`, `…/report.pdf`.
- **Pas d'authentification de service à service** : JWT local ou connexion GSMS via le navigateur.
- **Pas de modèle « plan de prévention » ni « prescription »**, pas de rattachement au workspace (sauf
  `metadata`), pas de webhook sortant.

### 1.6 QAtrial — `apps/qatrial` (Hono, Prisma, PostgreSQL)

- `Project`, `Requirement`, `Test`, `Evidence`, `CAPA`, `AuditFinding`, `FormTemplate` (utilisable comme
  checklist), `Webhook`.
- `GET /api/evidence/completeness?projectId=` donne la couverture des exigences par les preuves.
- Import en masse des exigences, export bundle.
- **Pas d'authentification de service, pas de champ workspace externe, pas de détection de contradictions.**
- Ses webhooks utilisent un format incompatible avec le Core.
- Le connecteur du Core a deux défauts :
  - il envoie `project_id` au lieu de `projectId` ;
  - QAtrial ignore les champs CAPA `severity`, `description` et `dueDate` qu'il transmet.

### 1.7 CRM Camp AI / Eve — `apps/crm` (lecture seule, autre session en cours)

- `Deal` porte `sourceSystem` et `externalId`, uniques ensemble : c'est le point d'ancrage naturel du
  `workspace_id`.
- `DealStage` n'a pas d'étape AO (dossier en préparation, déposé, attribué).
  *Mise à jour du 2026-10-03 (PR #15 du CRM)* : `DealStage` devient PROSPECT, QUALIFICATION, NOT_QUALIFIED,
  NEEDS_ANALYSIS, QUOTE_SENT, NEGOTIATION, CLOSED_WON, CLOSED_LOST. Devise EUR. Nouveaux champs d'affaire :
  `type_de_mission`, `r_f_rence_ao`, `date_limite_de_remise_des_offres`.
- `Activity` sert aux relances et tâches (`dueAt`).
- Eve : `AgentTask`, agents déclenchés sur `deal.stage.changed`, aucun outil AO.
- API REST `/rest/*` authentifiée par `x-api-key`. Intake public `POST /api/public/tender-request`, idempotent
  sur `externalId`.
- Défauts du connecteur Core (`connectors/crm.py`) :
  - `get_company` et `get_deal` appellent `/api/...` au lieu de `/rest/...` (404) ;
  - il envoie un Bearer au lieu de `x-api-key` ;
  - `externalId` est aléatoire au lieu d'être l'identifiant du workspace.
- Pas de webhook sortant du CRM vers le Core.

### 1.8 Génération documentaire et Excel existants (synthèse)

| Besoin | Existe ? | Où |
|---|---|---|
| Lecture Excel avec cellules A1 | oui | Core (Docling → `SourceRef.cell`) |
| Lecture Excel en préservant les formules | non | — |
| Remplissage d'un modèle client | non | — |
| DOCX | oui, générique | MCP (python-docx) |
| PDF | rapports GRACE uniquement | GRACE |
| ZIP dossier final + manifeste | non | — |
| Gabarits | jinja2 (e-mails) | Core |

---

## 2. Gaps (classés selon le circuit cible)

1. **Workspace unique** : il n'y a pas de référence lisible `WS-AO-AAAA-NNNN`. Les applications ne reçoivent pas
   le `workspace_id`, sauf le CRM, et encore avec un `externalId` aléatoire.
2. **Entrée DCE** : pas de dépôt ZIP, pas de rattachement des pièces au dossier AO, pas de gestion des
   rectificatifs.
3. **Digest métier** : les exigences se limitent au staffing. Manquent : critères et pondérations, horaires et
   postes, pénalités, clauses sociales et environnementales, CNAPS, sous-traitance, reprise du personnel
   (article L1224 / avenant CCN), délais de mobilisation, trames imposées, attestations.
4. **Matrice de conformité** : aucune table. Le MCP produit un DOCX où tout est « Compliant ».
5. **GO/NO-GO** :
   - la grille existe, mais les critères ne se saisissent pas ;
   - il n'y a pas de matrice de capacités (humaine, réglementaire, technique, financière, documentaire, délais,
     certifications, moyens, risques, dépendances, manques) ;
   - il n'y a pas de sortie READY/WARNING/BLOCKED sourcée.
6. **Moteur de chiffrage déterministe** : absent (effectifs, vacations, majorations, coûts, marge).
7. **BPU/DPGF/DQE** : ni lecture structurée des lignes, ni remplissage d'un modèle en préservant les formules,
   ni contrôle des cellules non prévues, ni versions de travail et finale.
8. **Mémoire technique** : générique, en anglais, sans lien avec les exigences.
9. **GRACE** : pas d'appel « analyse pour ce site / ce CCTP », pas de plan de prévention.
10. **QAtrial** : pas d'appel « contrôle ce dossier contre cette matrice ».
11. **Checklist finale et package** : rien. Il n'existe que la complétude par type de pièce.
12. **Validation humaine** : pas de cycle DRAFT/REVIEW/READY/APPROVED/SUBMITTED, pas de table de validation.
13. **Orchestration** :
    - le client MCP TenderAI n'est pas branché ;
    - pas de workflow AO ;
    - outbox non vidée, donc rien ne part vers le CRM ;
    - `tender.submitted` n'est jamais émis.
14. **MCP** :
    - échange de fichiers impossible à distance ;
    - mono-tenant ;
    - pas de tests ;
    - pas déployé par `deploy-all.sh` ;
    - outils non regroupés.
15. **Portail** : 12 onglets vides, aucune action d'écriture.

---

## 3. Architecture cible

```
CRM Eve ──(deal.sourceSystem=gsms-core, externalId=workspace)──┐
                                                               ▼
                         ┌──────────────────── GSMS Core (orchestre, source de vérité) ─────────────────────┐
 Portail Next.js ──────▶ │ Dossier AO (tender_case + statut DRAFT→SUBMITTED, réf. WS-AO-2026-0042)          │
 (Analyse du DCE,        │ Documents/coffre-fort (DCE ZIP, versions, hash) → Docling → Digest (provenance)   │
  Exigences, Chiffrage,  │ Matrice d'exigences (tables Core, statuts humains)   GO/NO-GO (matrice capacités) │
  Mémoire, Documents,    │ Workflow WF-TENDER (EventBus, audit chaîné, validations humaines)                 │
  Contrôles, Dossier     │ Package final (ZIP + manifeste hash/provenance/journal)                            │
  final)                 └───────┬───────────────────┬───────────────────┬───────────────────┬───────────────┘
                                 │ mcp_gateway        │ connecteur        │ connecteur        │ outbox → webhook
                                 ▼                    ▼                   ▼                   ▼
                   MCP AO (tenderai-mcp-server-max)   GRACE               QAtrial             CRM / Eve
                   ├─ ao_engine (Python pur, Decimal) risques, mesures,   couverture,         suivi dépôt,
                   │  staffing · pricing · xlsx BPU/   plan de prévention preuves, checklist, relance,
                   │  DPGF/DQE · checklist · package   (enrichissement)   CAPA                résultat
                   └─ outils LLM : mémoire, narratifs, détection d'incohérences (jamais de calcul)
```

### Principes

1. **Le Core est la source de vérité et l'orchestrateur.** Il stocke les pièces, le Digest, la matrice, les
   décisions, les versions et les validations. Il ne calcule pas de prix.
2. **Le MCP AO est le moteur opératoire, sans état métier propre** pour les nouveaux outils.
   - Il reçoit du Core le `workspace_id`, les données (exigences, paramètres de chiffrage) et les fichiers
     (modèles Excel, en base64, plafond de taille).
   - Il renvoie des résultats structurés et les fichiers produits.
   - Le Core les range dans le coffre-fort (`source=generated`), avec le hash, la version, le moteur et l'état.
3. **Calculs = `ao_engine`, Python pur.** Il est déterministe (`Decimal`, arrondis explicites), sans I/O ni LLM,
   et testé à part. Le LLM n'intervient que pour rédiger, expliquer, proposer et signaler des incohérences, et
   ses sorties sont validées par schéma.
4. **Toute donnée porte sa provenance** (`SourceRef` du Core). Les exigences, cellules remplies, sections du
   mémoire et contrôles renvoient à l'exigence et à la pièce d'origine.
5. **Statut global calculé** (READY / WARNING / BLOCKED), **statut de dossier validé par un humain** (DRAFT →
   REVIEW → READY → APPROVED → SUBMITTED). Le passage à APPROVED ou SUBMITTED est réservé à un utilisateur
   habilité, motivé et audité. Rien n'est déposé automatiquement.
6. **GRACE et QAtrial sont des experts appelés**, pas des producteurs de dossier. Leurs résultats entrent dans la
   matrice et la checklist comme des contrôles sourcés.

### Regroupement des outils MCP (vue métier)

Les noms techniques restent invisibles dans le portail.

| Groupe | Outils |
|---|---|
| workspace | `ao_workspace_load` |
| document | `parse_tender_rfp` (existant, conservé pour compatibilité) |
| requirements | `ao_requirements_analyze` |
| compliance | `ao_compliance_matrix` (remplace l'usage de `generate_compliance_matrix`) |
| staffing | `ao_staffing_compute` |
| pricing | `ao_pricing_compute`, `ao_price_grid_inspect`, `ao_price_grid_fill` (BPU, DPGF, DQE) |
| memory | `ao_memoire_plan`, `ao_memoire_draft_section` (réutilise `write_technical_section` et `search_past_proposals`) |
| prevention | `ao_prevention_plan_skeleton` |
| quality | `ao_checklist_run`, `ao_consistency_check` |
| export | `ao_package_build` |

L'enchaînement en 16 étapes du §10 est porté par le workflow **WF-TENDER du Core**, qui appelle ces outils. Le
MCP reste appelable seul (par Claude ou un autre client) avec le même `workspace_id`.

---

## 4. Mapping outil existant → capacité cible

| Outil existant | Capacité cible | Décision |
|---|---|---|
| `parse_tender_rfp` | Analyse du DCE | **Remplacé dans le circuit** par Docling et le Digest du Core, qui sont multi-pièces, sans troncature et sourcés. Conservé pour un usage autonome. |
| `generate_compliance_matrix` | Matrice de conformité | **Remplacé** par la matrice du Core. La version MCP force « Compliant ». |
| `check_submission_deadline` | Échéances | Réutilisé comme logique ; le Core a déjà les échéances du Digest. |
| `validate_document_completeness` | Checklist finale | **Réécrit** en `ao_checklist_run`, piloté par les pièces exigées par le RC. |
| `write_technical_section` | Mémoire technique | **Réutilisé**, avec prompts français sûreté/sécurité et exigences sources en entrée. |
| `build_full_technical_proposal` | Mémoire technique | Remplacé par `ao_memoire_plan`, qui ne génère que les sections liées à des exigences. |
| `write_compliance_narrative` | Réponse prévue (matrice) | Réutilisé pour proposer un texte par exigence, validé par un humain. |
| `search_past_proposals`, `index_past_proposal`, `list_indexed_proposals` | Base de connaissances mémoire | **Réutilisés tels quels.** |
| `ingest_vendor_quote`, `build_bom`, `calculate_final_pricing` | Coûts matériel (vidéo, contrôle d'accès) | Réutilisables plus tard pour les consommables et équipements. Hors circuit initial (bug de persistance à corriger s'ils sont utilisés). |
| `generate_financial_proposal` | BPU/DPGF/DQE | **Remplacé** par `ao_price_grid_fill`, qui remplit le modèle du client. |
| `generate_architecture_description` | — | Hors circuit sûreté. Conservé, non exposé au Core. |
| `draft_partner_brief`, `create_nda_checklist`, `track_partner_deliverable` | Sous-traitance / cotraitance | Conservés, hors circuit initial. |

---

## 5. Fichiers à modifier (existants)

### Core
- `tenders/models.py`, `schemas.py`, `service.py`, `router.py` : statut de cycle de vie, référence, routes par
  onglet, transitions, validations.
- `identity/models.py` : `Workspace.reference` (unique, lisible).
- `context/workspace_manager.py` : création d'un workspace AO avec sa référence.
- `digest/requirements.py`, `digest/schemas.py`, `digest/classifier.py` : exigences génériques par catégorie (§2
  du chantier) et lignes de prix structurées.
- `documents/router.py`, `documents/service.py` : dépôt d'un ZIP de DCE.
- `mcp_gateway/registry.py` : liste blanche des nouveaux outils `ao_*`.
- `settings.py` : URL TenderAI par défaut alignée.
- `connectors/grace.py`, `connectors/qatrial.py`, `connectors/crm.py` : nouveaux appels et correction des
  défauts relevés.
- `events/bus.py` : routes `tender.*`.
- `workflows/__init__.py` : enregistrement de WF-TENDER.
- `pyproject.toml` : `openpyxl` et `python-docx` si le Core doit relire des fichiers, sinon côté MCP uniquement.

### Portail
- `apps/web/lib/core/endpoints.ts`.
- `lib/tenders/tabs.ts`, à réorganiser en vues métier : Analyse du DCE, Exigences, GO/NO-GO, Chiffrage,
  Mémoire, Documents, Contrôles, Dossier final, Historique.
- `components/platform/tender-views.tsx` : actions branchées.
- `app/(platform)/app/tenders/page.tsx` : bouton « Nouveau dossier AO ».

### MCP
- `app/server.py`, `app/config.py`, `app/middleware/auth.py` : comparaison à temps constant, auth obligatoire en
  HTTP.
- `app/services/llm.py` : prompts français, sorties validées.
- `requirements.txt`.

### GRACE
- `server/src/modules/` : nouveau module `gsms` (authentification de service, analyse pour un workspace, plan de
  prévention).

### QAtrial
- `server/routes/` : nouveau module `gsms` (contrôle d'un dossier contre une matrice).

### Déploiement et CI
- `deploy/deploy-all.sh`, `deploy/README.md` : service MCP AO, URL interne.
- `.github/workflows/` : nouveau job `mcp-ao.yml`.

### CRM
**Rien n'est modifié dans cette session.** La coordination se fait avec la session CRM (voir §8, étape 11).

## 6. Nouveaux modules minimaux

| Module | Emplacement | Rôle |
|---|---|---|
| `ao_engine/` | `apps/tenderai-mcp-server-max/ao_engine/` (paquet Python pur, sans dépendance au serveur) | `staffing.py` (postes, plages, cycles → heures, vacations, ETP), `pricing.py` (taux, majorations nuit/dimanche/férié/heures supplémentaires, encadrement, coûts directs/indirects, marge, prix de vente), `params.py` (barème versionné), `xlsx_grid.py` (lecture, détection des cellules à remplir, remplissage, contrôle des formules et des cellules intouchées), `checklist.py`, `package.py` (arborescence, manifeste, hash) |
| `app/tools/ao.py` | MCP | Outils `ao_*` : enveloppe mince autour d'`ao_engine` et des services LLM existants |
| `tenders/requirements.py` + table `tender_requirement` | Core | Matrice centrale (§11), alimentée par le Digest, statuts humains |
| `tenders/feasibility.py` | Core | Matrice de capacités → READY/WARNING/BLOCKED, sources ; réutilise `scoring.py` |
| `tenders/production.py` + table `tender_artifact` | Core | Livrables produits : type, version, hash, moteur, état, validation, lien vers le document du coffre-fort |
| `tenders/lifecycle.py` + table `tender_validation` | Core | DRAFT → SUBMITTED, qui / quand / version figée / motif |
| `workflows/tender.py` | Core | WF-TENDER, enchaînement des étapes du §10 |
| `events/outbox_worker.py` | Core | Envoi de l'outbox (CRM, puis GRACE et QAtrial) |
| Migration `0010_tender_dossier` puis suivantes | Core | Une migration par étape qui en a besoin |

## 7. Tests

- **`ao_engine`** :
  - tests unitaires purs, cas chiffrés à la main : un poste 24/7 sur un an, jours fériés, nuit, dimanche,
    remplacement ;
  - tests de propriétés : total = Σ lignes ; aucune cellule hors périmètre modifiée ; formules intactes ;
  - classeurs BPU, DPGF et DQE de test générés par openpyxl dans les fixtures (aucune donnée client réelle dans
    le dépôt).
- **MCP** : tests des outils `ao_*` en appel direct, ainsi qu'un test HTTP du serveur avec le client de la
  passerelle du Core.
- **Core** :
  - tests par étape dans `tests/test_tenders_*.py`, avec Docling simulé (fixtures RC, CCTP, BPU et DPGF
    existantes, enrichies) ;
  - MCP simulé pour la passerelle ;
  - `test_migrations.py` (automatique) ;
  - vérification en vrai sur PostgreSQL 16 local pour chaque migration.
- **GRACE / QAtrial** : tests de route pour les nouveaux endpoints, dans leur propre framework.
- **Portail** : lint, tsc et build, plus un parcours Playwright (Chromium local) par étape qui touche l'interface :
  créer un AO, déposer le DCE, voir les exigences avec leur provenance, etc.
- **CI** : nouveau workflow `mcp-ao.yml` (ruff + pytest).

---

## 8. Ordre d'implémentation — une PR par étape

Branches `cursor/ao-mcp-<étape>`. Chaque étape est livrable, testée et déployable seule.

| # | Étape | Livre |
|---|---|---|
| 0 | **Audit** (cette PR) | `AO-MCP.md` + ce document |
| 1 | **Dossier AO et DCE** | Référence `WS-AO-AAAA-NNNN` (un workspace dédié par AO, créé par `context/engagements`). Bouton « Nouveau dossier AO ». Dépôt du DCE en ZIP ou en fichiers, dans le dossier « Dossier de consultation », puis analyse automatique. Cycle DRAFT/REVIEW/READY/APPROVED/SUBMITTED avec table de validation (transitions humaines, auditées). Onglets Pièces, Documents, Échéances et Historique branchés sur le Digest existant. |
| 2 | **Digest AO et matrice d'exigences** | Extraction par règles et provenance des catégories du §2 : critères et pondérations, horaires, postes, qualifications SSIAP/CNAPS, pénalités, clauses sociales et environnementales, reprise du personnel, sous-traitance, pièces et attestations à produire, trames imposées. Table `tender_requirement` (colonnes et statuts du §11). Onglets Exigences et Conformité : édition du statut, du responsable, de la preuve et du document cible ; lien vers la page ou la cellule source. |
| 3 | **GO / NO-GO documenté** | Matrice de capacités du §3, calculée à partir des exigences et d'un profil société GSMS (paramètres du portail : agréments, effectifs mobilisables, certifications). Sortie READY/WARNING/BLOCKED, justification et sources. Grille de score existante réutilisée. Formulaire de décision humaine. |
| 4 | **MCP AO remis à niveau** | `workspace_id` dans les outils, échange de fichiers en base64, authentification obligatoire et à temps constant, modèle LLM corrigé, prompts en français, outils `ao_*` regroupés. Liste blanche et URL du Core alignées. Déploiement par `deploy-all.sh`, CI et premiers tests. Le Core appelle réellement le MCP (`ao_workspace_load`). |
| 5 | **Moteur de chiffrage** (`ao_engine` staffing + pricing) | Effectifs, heures, vacations, cycles, majorations, heures supplémentaires, encadrement, matériel, tenues, véhicules, consommables, frais, coûts directs et indirects, marge, prix de vente. Barème paramétrable et versionné. Onglet Chiffrage : hypothèses, sous-détail de prix, explication. 100 % Python. |
| 6 | **BPU / DPGF / DQE** | Lecture du modèle Excel reçu, détection des cellules à remplir (à valider à l'écran), remplissage des quantités et des prix depuis le chiffrage, contrôle des totaux et des formules, garantie « aucune autre cellule modifiée ». Version de travail, puis version finale validée (source, version, date, moteur, état, validateur). |
| 7 | **Mémoire technique** | Plan déduit des exigences : une section n'existe que si une exigence ou une trame imposée la justifie. Rédaction par section avec le LLM via le MCP, en s'appuyant sur les réponses passées. Chaque paragraphe cite ses exigences. Relecture et validation par section. Export DOCX. |
| 8 | **GRACE et plan de prévention** | Côté GRACE : authentification de service et endpoint « analyse pour ce workspace / ce site / ce CCTP » (risques, mesures, prescriptions). Côté Core : connecteur et étape du workflow. Squelette du plan de prévention (gabarit Python) enrichi par GRACE et rattaché aux exigences. |
| 9 | **Contrôles QAtrial et checklist finale** | Côté QAtrial : authentification de service et endpoint « contrôle ce dossier contre cette matrice » (couverture, preuves, pièces manquantes, CAPA si anomalie grave). Côté Core : connecteur corrigé. Checklist finale du §12 en Python déterministe (pièces, totaux, dates, raison sociale, nommage, formats, tailles), plus contrôles QAtrial et incohérences signalées par le LLM. Onglet Contrôles. |
| 10 | **Dossier final et dépôt** | Package `Administratif/ Technique/ Financier/ Annexes/ Checklist/` avec originaux, fichiers générés, manifeste (versions, hash, provenance, journal de production). ZIP, ainsi que DOCX, XLSX et PDF. APPROVED puis SUBMITTED uniquement par un humain. Événement `tender.submitted`, worker d'outbox. Onglet Dossier final. |
| 11 | **CRM / Eve** (coordonné avec la session CRM) | Côté Core : connecteur corrigé (`/rest`, `x-api-key`, `externalId = workspace`), opportunité CRM → dossier AO, envoi des événements `tender.*`. Côté CRM (autre session, déjà convenu) : champ d'affaire « Statut dossier AO » (en préparation / déposé / attribué / non retenu), mis à jour par les événements `tender.*` ; `DealStage` reste le pipeline commercial. L'étape 2 du CRM ajoute le webhook signé vers `/api/v1/events/ingest/crm` (`deal.created`, `deal.stage.changed`) et le filtre `externalId` sur `/rest/deals`. L'étape 4 du CRM ajoute les outils Eve de suivi (`tender.go_no_go.decided`, `tender.submitted`). |

L'étape 4 peut passer avant la 3 si Samir préfère voir le MCP branché plus tôt ; les étapes 1 à 3 n'en dépendent
pas.

---

## 9. Décisions prises et points à valider

**Décisions prises** (raisonnables, réversibles) :
- Un AO correspond à un workspace dédié (type `TEMPORARY`, créé par `context/engagements`) avec une référence
  lisible `WS-AO-AAAA-NNNN`. L'UUID reste la clé technique. Les URL du portail gardent l'identifiant interne et
  affichent la référence.
- Docling et le Digest restent dans le Core. DocuLens reste l'interface documentaire : on ne réactive pas son
  backend.
- La matrice d'exigences, les décisions et les validations vivent dans le Core. Les calculs vivent dans
  `ao_engine`, appelé par le MCP.
- Les fichiers transitent du Core vers le MCP en base64, avec un plafond (20 Mo par fichier). Le MCP ne garde rien
  des nouveaux outils.

**À valider par Samir** (métier) :
1. **Barème de chiffrage** :
   - taux horaires par qualification (ADS, SSIAP 1, 2, 3, chef de poste, maître-chien) ;
   - majorations de la convention collective prévention-sécurité (IDCC 1351) : nuit, dimanche, jours fériés ;
   - taux de charges, frais de structure, marge cible.

   Je mettrai des valeurs par défaut marquées « à valider », modifiables dans le portail. Aucune ne sera codée en
   dur.
2. **Un DCE réel anonymisé** (RC, CCTP, BPU, DPGF ou DQE) pour caler l'extraction et le remplissage Excel. Il
   restera hors du dépôt : seules des fixtures synthétiques seront commitées.
3. **Profil société GSMS** pour le GO/NO-GO : agréments CNAPS, certifications, effectifs mobilisables, zones
   d'intervention.
