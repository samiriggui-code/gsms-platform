# Reprise en local — état au 2026-10-03 (17 h 40 UTC)

Ce document permet à un agent local de reprendre le travail des deux sessions cloud. Il complète
[`HANDOFF-CURSOR.md`](./HANDOFF-CURSOR.md), qui contient le détail de chaque livraison, la plus récente en haut.

## 1. Démarrer

```bash
git clone https://github.com/samiriggui-code/gsms-platform.git
cd gsms-platform
git fetch --all
```

Lire ensuite, dans cet ordre :
1. ce document ;
2. `docs/HANDOFF-CURSOR.md` (journal des livraisons) ;
3. `docs/architecture/GSMS-PLATFORM-CORE-V2.md` et `docs/architecture/IDENTITE-SSO.md` ;
4. pour le chantier Appel d'offres : `docs/chantiers/AO-MCP.md` (commande d'origine, ne pas modifier) puis
   `docs/chantiers/AO-MCP-AUDIT.md` (plan en 12 étapes, §8) ;
5. pour le CRM : `apps/crm/AGENTS.md` (règles strictes, voir §4).

## 2. Règles de travail avec Samir

- **Répondre en français**, simplement, étape par étape.
- **Commandes VPS une par une**, une seule ligne à la fois, avec ce qu'on doit voir à l'écran. Pas de gros
  script à copier d'un bloc.
- **Un chantier = une branche = une PR.** Branches `cursor/<sujet>`.
- **Fusion** : accord général donné pour ces chantiers ; on fusionne quand la CI est verte (et les tests
  locaux verts pour ce que la CI ne couvre pas, voir §6).
- **Secrets** : n'en écrire aucun dans le repo, dans un fichier ou dans un message (mot de passe SMTP, clés API,
  clé Context.dev, contenu du `.env`). Samir les saisit lui-même sur le VPS ou dans le portail.
- **VPS partagé** : ne jamais arrêter ni toucher les applications de `global-it-ss.com`.

## 3. Deux sessions en parallèle

Le travail est découpé en deux sessions qui ne touchent pas les mêmes fichiers.

### Session A — Plateforme et CRM (cette session)

| Étape CRM | État | PR |
|---|---|---|
| 1. Métier GSMS (étapes d'affaire, champs, euro, données de démo) | fusionnée | #15 |
| 2. Pont CRM ↔ Core (affaire gagnée → prestation GSMS) | fusionnée | #16 |
| 3. Tout le CRM en français | fusionnée | #19 |
| 4. Agents métier | **à faire** | — |

**Note** : la CI GitHub ne couvre que `apps/core/**` et `apps/web/**`. Pour le CRM, lancer les tests à la main avant de fusionner (§6).

**Étape 4 — agents métier du CRM (prochain travail de la session A)**. Agents Eve dans `apps/crm/apps/agent` :
- **qualification d'un prospect** : type d'établissement, catégorie ERP, besoin probable (audit, commission
  de sécurité, accompagnement, AO) ;
- **préparation d'un rendez-vous** : fiche société, historique, points à aborder ;
- **veille AO** : suivi des échéances et du champ « Statut dossier AO » ;
- **relance de devis** : affaires en « Devis envoyé » sans activité depuis N jours ;
- **outils Eve de suivi AO** : ils consomment les événements `tender.*` (`tender.go_no_go.decided`,
  `tender.submitted`) et mettent à jour « Statut dossier AO ». Cette partie est coordonnée avec la session B
  (étape 11 de l'audit AO).

Avant d'écrire du code eve, lire `apps/crm/docs/agent.md` et la doc eve dans `apps/crm/apps/agent/node_modules/eve/docs`.

### Session B — Chantier Appel d'offres (session « GSMS — Chantier MCP Appel d'offres »)

Plan : `docs/chantiers/AO-MCP-AUDIT.md` §8, une PR par étape, branches `cursor/ao-mcp-<étape>`.

| Étape AO | État | PR |
|---|---|---|
| 0. Audit | fusionnée | #14 |
| 1. Dossier AO `WS-AO-AAAA-NNNN` et dépôt du DCE | fusionnée | #17 |
| 2. Digest AO et matrice d'exigences | fusionnée | #18 |
| 3. GO / NO-GO documenté (profil GSMS, matrice de faisabilité, migration `0012`) | fusionnée | #20 |
| 4. MCP AO remis à niveau | livrée, PR en cours (branche `cursor/ao-mcp-serveur`) | — |
| 5 à 10. Chiffrage, BPU/DPGF/DQE, mémoire, GRACE et plan de prévention, QAtrial et checklist, dossier final | à faire | — |
| 11. CRM / Eve | à faire, avec la session A | — |

**Étape 4 — MCP Appel d'offres remis à niveau (prochain travail de la session B, en local)**

Branche `cursor/ao-mcp-serveur`, une PR. Référence : `docs/chantiers/AO-MCP-AUDIT.md`, §1.1 (inventaire des 18 outils
et défauts relevés), §3 (regroupement `ao_*`) et §8.

*But :* le Core appelle réellement le MCP, sur le dossier WS-AO, de façon sécurisée et testée. Pas encore de chiffrage :
il arrive à l'étape 5, avec `ao_engine`.

**1. Serveur MCP (`apps/tenderai-mcp-server-max`)**
- **Accès protégé en HTTP.** Refuser de démarrer en `TRANSPORT=http` sans `MCP_API_KEY` ni OAuth (aujourd'hui : simple
  warning, `app/server.py` ~l.176). Comparer le jeton à temps constant avec `hmac.compare_digest` (`app/middleware/auth.py:47`).
- **`workspace_id`.** Ajouter `workspace_id` et la référence `WS-AO-…` aux outils utilisés par le Core, et une colonne
  `workspace_id` sur la table `rfp`. Aucun mélange entre dossiers.
- **Échange de fichiers en base64**, plafond 20 Mo par fichier, à la place des chemins locaux au serveur. Le MCP ne garde
  rien pour les nouveaux outils : le Core reste le stockage de référence.
- **Nouvel outil `ao_workspace_load(workspace_id, reference, documents[])`.** Il renvoie l'identifiant de l'espace côté
  MCP et la liste des capacités disponibles. C'est le premier outil vraiment appelé par le Core.
- **Modèle LLM.** Lu dans `LLM_MODEL`. Supprimer l'identifiant par défaut invalide (`app/config.py:30`) et vérifier un
  identifiant valide au moment du travail.
- **Prompts en français, orientés sûreté et sécurité incendie** (`app/services/llm.py`, `PROMPT_TEMPLATES`) au lieu de
  l'intégrateur IT d'Oman.
- **Défauts de l'audit à corriger :**
  - `ingest_vendor_quote` ne garde pas les lignes du devis ;
  - « TenderAI » est écrit en dur comme nom de société dans `generate_financial_proposal` (lire `COMPANY_NAME`, valeur
    par défaut GSMS) ;
  - `generate_compliance_matrix` met « Compliant » partout : renvoyer « À vérifier ».
- **Tests et CI.**
  - Premiers tests pytest dans `tests/` : authentification, base64, `ao_workspace_load`, cloisonnement par `workspace_id`.
  - Nouveau workflow `.github/workflows/mcp-ao.yml` (ruff + pytest), filtré sur `apps/tenderai-mcp-server-max/**`.

**2. Core (`apps/core`)**
- **Liste blanche** : mettre à jour `mcp_gateway/registry.py` avec `ao_workspace_load`. `generate_financial_proposal` est
  inutilisable sans `build_bom` : le retirer ou le justifier.
- **URL** : corriger la valeur par défaut de `settings.tenderai_mcp_url`. Elle vaut `localhost:8765`, alors que le serveur
  écoute sur 8000 (8090 sur le VPS). Prendre l'URL interne du service Docker. Le jeton va dans le `.env` du VPS ; Samir
  le saisit lui-même.
- **Nouveau `tenders/engine.py`** : appel de `ao_workspace_load` via le client `mcp_gateway`, avec `workspace_id`,
  référence et pièces du coffre-fort, puis passage de la liaison d'application `tender` de `pending:…` à ACTIVE
  (`WorkspaceManager.attach_application`).
- **Route** `GET|POST /workspaces/{ws}/tenders/{mission}/engine` : état « connecté / indisponible » et dernier appel. Un
  MCP indisponible ne doit jamais casser les écrans.
- **Tests** : `httpx.MockTransport`, comme `test_tenders_opportunities_via_lexsocket_mcp` dans `tests/test_tenders.py`.

**3. Portail (`apps/web`)** — afficher l'état du moteur AO (onglet « Agents » ou synthèse), en français, sans le nom
technique de l'outil.

**4. Déploiement**
- Ajouter le service MCP AO à `deploy/deploy-all.sh`. Il n'y est pas aujourd'hui ; il a son propre
  `deploy/vps/docker-compose.vps.yml`, port 8090, `mcp.gsms-security.com`.
- Documenter dans `deploy/README.md` les variables `MCP_API_KEY` / jeton Core et `LLM_MODEL`, sans valeur.

**5. Vérifier en vrai avant de fusionner**
- Lancer le MCP en HTTP et le Core sur PostgreSQL 16, puis faire un appel réel de `ao_workspace_load` depuis un dossier WS-AO.
- Si une migration est ajoutée, la jouer dans les deux sens (upgrade, downgrade, upgrade).

**6. Fin d'étape**
- Ajouter une entrée en tête de `docs/HANDOFF-CURSOR.md`.
- Mettre à jour l'« Avancement » dans `AO-MCP-AUDIT.md` §8 et la ligne de l'étape 4 dans ce tableau.

**Repères techniques, valables pour toutes les étapes AO**
- **Migrations déjà présentes** : 0010, 0011, 0012 (étapes 1 à 3, PR #14, #17, #18, #20).
- **Fixtures de test** : la fixture `staff` (compte de l'équipe GSMS) est dans `apps/core/tests/conftest.py`. Les fausses
  pièces de DCE (RC_AO, CCTP_AO) sont dans `tests/test_tender_requirements.py`.
- **Essais de bout en bout** : Docling n'est pas installé en local. Lancer le Core avec
  `DoclingAdapter(converter_factory=…)` et le `FakeConverter` de `tests/fake_docling.py`.
- **Dossiers AO** :
  - un dossier AO = un workspace TEMPORARY de l'organisation GSMS, URL `/app/tenders/{workspaceId}` ;
  - création réservée à l'équipe GSMS (`POST /api/v1/tenders`) ;
  - la matrice d'exigences se resynchronise seule sur `digest.updated` ;
  - statut du dossier DRAFT → SUBMITTED, toujours décidé par une personne.
- **Piège shell** : ne pas faire `pkill -f <motif>` quand le motif figure dans la commande elle-même, car cela tue le
  shell. Utiliser `ps -eo pid,args | grep '[n]ext-server' | awk '{print $1}' | xargs -r kill`.

### Points de coordination entre A et B

- **Lien dossier AO ↔ affaire CRM** :
  - liaison proposée : `ao:deal:<id>`, plus `metadata.tender_workspace_id` sur la prestation ;
  - la prestation d'une affaire gagnée a déjà la liaison `deal:<id>` (`crm_sync`, étape 2 du CRM).
- **Champ CRM « Statut dossier AO »** (clé `statut_dossier_ao`, type SELECT) :
  - il existe déjà ;
  - il sera mis à jour par les événements `tender.*` (étape 11 de l'AO et étape 4 du CRM).
- **Fichiers partagés** : la session B ne touche pas `apps/crm` ; la session A ne touche pas `apps/core/gsms_core/tenders*`
  ni `apps/web/app/(platform)/app/tenders`. En cas de doute, regarder les PR ouvertes de l'autre session avant de modifier.

## 4. Règles propres au CRM (`apps/crm/AGENTS.md`)

- **Code** :
  - aucun commentaire dans le code ;
  - parse Zod aux frontières ;
  - un composant client n'importe jamais `@crm/db` ni `@crm/auth`.
- **Agent et configuration** :
  - l'intelligence et les appels HTTP sortants vivent dans `apps/agent`, jamais dans l'API Nest ;
  - un seul `.env` à la racine de `apps/crm`, documenté dans `.env.example`.
- **Commits** : pas de ligne `Co-Authored-By` dans les commits qui touchent le CRM.
- **Traductions** :
  - tous les textes passent par next-intl, dans `apps/crm/apps/app/messages/{fr,en}/*.json` (mêmes clés des deux côtés) ;
  - français par défaut.
- **Rapports** : liste « Issues » en anglais simplifié (ASD-STE100) à la fin de chaque compte rendu technique.

## 5. Cartographie rapide

| Dossier | Rôle | Pile |
|---|---|---|
| `apps/core` | Core GSMS : identité, équipe, OIDC, coffre-fort, messagerie, workspaces, `crm_sync`, AO | FastAPI, SQLAlchemy, Alembic, Python 3.12 |
| `apps/web` | Portail `gsms-security.com` : relais OIDC, paramètres, coffre-fort, AO | Next.js 16 |
| `apps/crm` | CRM Camp AI (app, api, agent eve) | Bun 1.3, Turborepo, Next, NestJS + tRPC, Prisma |
| `apps/doculens` | Ingestion documentaire, connexion « accès GSMS » (OIDC public + PKCE) | — |
| `apps/grace`, `apps/qatrial` | Audit sécurité / contrôle qualité, connexion GSMS (OIDC) | — |
| `apps/tenderai-mcp-server-max` | MCP Appel d'offres (18 outils, voir audit AO) | Python |
| `deploy/deploy-all.sh` | Déploiement de toute la plateforme sur le VPS | bash |

**Rôles** : un rôle Core est traduit pour chaque application. Le tableau est dans `docs/architecture/IDENTITE-SSO.md`.

## 6. Lancer les tests en local

**Core** (comme la CI) :
```bash
cd apps/core && pip install -e '.[dev]' && ruff check . && ruff format --check . && pytest -q
```

**Portail** :
```bash
cd apps/web && npm ci && npm run lint && npx tsc --noEmit && npm run build
```

**CRM** : pas de CI GitHub, donc il faut tout lancer à la main avant de fusionner. Prérequis : Bun 1.3 et PostgreSQL 16.
- Préparer une base jetable :
  ```bash
  cd apps/crm && bun install
  bun run db:test
  ```
  `bun run db:test` crée une base jetable. Ne jamais pointer les tests sur une vraie base : ils effacent les membres.
- Vérifier les types dans chaque paquet (`apps/app`, `apps/api`, `apps/agent`, `packages/ui`, `packages/db`, `packages/validation`) :
  ```bash
  bunx tsc --noEmit -p .
  ```
- Lancer les tests :
  ```bash
  export TEST_DATABASE_URL=postgresql://…/crm_test
  (cd apps/api && bun run test)
  (cd apps/app && bun test)
  (cd apps/agent && bun test)
  ```
  Échec attendu, déjà présent sur `main` : agent « capability briefing ».
- Lint : `bunx biome check <fichiers modifiés>`. Erreurs déjà présentes sur `main`, à ne pas confondre avec les nôtres : `tracking.service.ts`, `packages/db/src/fields.ts`, `auth-shell.tsx`.

## 7. VPS (187.77.166.124, `/opt/gsms-platform`, domaine `gsms-security.com`)

**Mise à jour complète**, une seule ligne :
```bash
cd /opt/gsms-platform && git pull && ./deploy/deploy-all.sh gsms-security.com
```
Ce que fait `deploy-all.sh` :
- il trouve les stacks des applications grâce aux labels Compose ;
- il copie le code avec une sauvegarde ;
- il écrit les variables SSO et celles du pont CRM ;
- il reconstruit, relance, puis lance `gsms:sync` dans l'agent CRM.

**Pièges déjà rencontrés** :
- **`git pull` refusé** par des modifications locales sur le VPS. Lancer `git stash`, puis recommencer.
- **Ancien DocuLens** (`gsms-doculens-frontend`, `gsms-doculens-api`) : il est arrêté et ne doit pas redémarrer (`--restart=no`).
- **Mail refusé** (SMTP 553) : l'expéditeur doit être `admin@gsms-security.com`, tant que l'alias `no-reply@` n'existe pas.
- **Build CRM** : il faut l'image `oven/bun:1.3-debian`, car bun 1.2 casse le build.

**Dernier état connu** :
- la connexion GSMS marche dans GRACE et QAtrial ;
- Samir doit relancer la ligne de mise à jour pour le CRM. Le conteneur avait encore la version du 2026-10-02 ;
- #19 (CRM en français) est fusionnée : la même ligne la déploie ;
- on attend une capture de l'écran « Résumé » du portail après déploiement.

## 8. À faire côté Samir

- Lancer la mise à jour du VPS (§7) après chaque fusion.
- **Sécurité** : un `.env` a été montré en capture d'écran.
  - Supprimer la capture.
  - Prévoir de régénérer `GSMS_JWT_SECRET` (cela déconnecte tout le monde).
  - Régénérer la clé Context.dev, puis la saisir dans CRM → Paramètres → Général.
- **Mail** : créer l'alias `no-reply@gsms-security.com` chez l'hébergeur mail si on veut cet expéditeur.
