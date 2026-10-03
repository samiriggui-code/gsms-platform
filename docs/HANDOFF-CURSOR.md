# Handoff Cursor → Claude

> Pour reprendre en local à deux sessions : [`HANDOFF-REPRISE-LOCALE.md`](./HANDOFF-REPRISE-LOCALE.md).

## 2026-10-03 — CRM, étape 3 : tout le CRM en français

**Fait**
- Interface (`apps/crm/apps/app`) : tous les textes passent par next-intl, le français est la langue par défaut. Les messages sont rangés par zone dans `messages/{fr,en}/` : `base`, `shell` (connexion, accueil, menus), `crm` (fiches, listes, tableau de bord, chronologie), `settings` (paramètres), `agents` (agents IA et chat). `messages/{fr,en}/index.ts` les assemble.
- Composants partagés (`packages/ui`) : textes par défaut en français, dates et montants au format `fr-FR`.
- API : messages d'erreur et de validation en français ; erreurs de champs personnalisés (`packages/db/src/fields.ts`) en français.
- `packages/validation` : messages en français ; les suggestions de nouveaux champs sont adaptées à GSMS (statut du compte, taille, région, origine dont « Appel d'offres », commercial référent).
- Sous-titres des pages Sociétés, Contacts, Affaires et Conformité réécrits pour les utilisateurs.

**Vérifié** : écrans connexion, accueil, sociétés, contacts, affaires, fiche société, agents et paramètres affichés en français dans Chromium, sans erreur JavaScript.

**Tests** : CRM app 169 ; api 386 ; agent 370 (1 échec qui existait déjà) ; check-types sans erreur.

**Reste en anglais** : des messages d'erreur renvoyés tels quels par Google, Microsoft ou Slack ; les noms de marque.

---

## 2026-10-03 — Chantier AO-MCP, étape 3 : GO / NO-GO documenté

Branche `cursor/ao-mcp-go-no-go`. Plan : `docs/chantiers/AO-MCP-AUDIT.md` (§8).

- **Profil GSMS** (`tenders/profile.py`) : réglage plateforme `tender_profile`, saisi dans Paramètres → « Profil GSMS — appels d'offres » (`GET|PUT /api/v1/tenders/profile`, équipe GSMS ; écriture réservée aux rôles de gestion). Il contient :
  - l'autorisation CNAPS et sa validité ;
  - les certifications ;
  - les agents mobilisables par qualification ;
  - le chiffre d'affaires et le délai de mobilisation ;
  - la reprise du personnel et la sous-traitance.

  Un champ vide est affiché « à renseigner » : aucune valeur n'est supposée.
- **Matrice de faisabilité** (`tenders/feasibility.py`, déterministe), servie par `GET …/go-no-go` (champ `feasibility`).
  - 11 dimensions du §3, chacune READY / WARNING / BLOCKED avec une justification en clair et ses sources (pièce et page, ou exigence REQ-xxx) :
    - capacité humaine : effectifs du DCE comparés au profil ; un service 24 h/24 compte pour 5,5 agents par poste, estimation affichée comme telle ;
    - capacité réglementaire : CNAPS, reprise du personnel ;
    - capacité technique : statuts de la matrice ;
    - capacité financière : montant du marché rapporté au chiffre d'affaires, avertissement au-delà de 50 %, blocage au-delà de 100 % ;
    - capacité documentaire : pièces manquantes, contradictions ;
    - délai : blocage à moins de 3 jours, avertissement à moins de 10 ;
    - certifications ;
    - moyens matériels ;
    - risques ;
    - dépendances : visite, sous-traitance ;
    - informations manquantes.
  - Statut global = le pire des statuts.
- **Décision** : reste humaine. L'audit et l'événement `tender.go_no_go.decided` gardent un instantané de la matrice au moment de décider.
- **Grille de notation**
  - Saisie par l'équipe via `PUT …/go-no-go/criteria`, avec les libellés conservés.
  - Score calculé par le Core avec le moteur existant. Grille figée après la décision.
- **Dossier** : montant annuel estimé, nouvelle colonne `estimated_amount` (migration `0012`). Modifiable avec la date de remise via `PATCH /workspaces/{ws}/tenders/{mission}`, formulaire dans la Synthèse.
- **Portail**
  - Onglet Go / No-Go : bandeau du statut global, dimensions avec liens vers la pièce à la bonne page, grille modifiable, décision.
  - Paramètres : formulaire du profil.
- **Vérifié en vrai** (PostgreSQL 16, migration 0012 dans les deux sens, Chromium sur ordinateur et mobile 390 px) :
  - profil saisi, montant 400 000 € et date renseignés ;
  - matrice « à surveiller », dont capacité humaine SSIAP 2 avec un besoin d'environ 5,5 agents pour 3 mobilisables ;
  - grille 60/100, décision GO enregistrée ;
  - aucun débordement sur mobile.
- **Tests** : `tests/test_tender_go_no_go.py` (5 tests ; 187 au total).

---

## 2026-10-03 — Chantier AO-MCP, étape 2 : Digest AO et matrice d'exigences

Branche `cursor/ao-mcp-exigences`. Plan : `docs/chantiers/AO-MCP-AUDIT.md` (§8).

- **Digest (règles déterministes, sans LLM)**, uniquement pour une mission APPEL_OFFRES :
  - `digest/clauses.py` : chaque phrase du DCE est rattachée à un thème. Thèmes : reprise du personnel, convention collective, clause sociale, clause environnementale, sous-traitance, plan de prévention, mobilisation, qualifications (SSIAP, CNAPS…), horaires, moyens humains, moyens matériels, sécurité / sûreté, prix et bordereaux, mémoire technique, pièces administratives, variantes, visite, durée du marché, pénalités, confidentialité. Chaque clause est marquée obligatoire ou non et garde sa source.
  - `digest/criteria.py` : critères d'attribution et pondérations (« Prix : 40 % », « 60 % pour la valeur technique », tableau « Critère | Pondération »).
  - Corrections :
    - un titre « Pièces à fournir » n'est plus pris pour une pièce ;
    - « d'un chef d'équipe SSIAP 2 » est maintenant compté. `test_digest` attendait l'ancien oubli et a été mis à jour.
- **Matrice** (`tenders/requirements.py`, table `tender_requirement`, migration `0011`)
  - Colonnes du §11 : code `REQ-001…`, source (pièce, page, section, cellule), exigence, type, obligatoire, réponse prévue, preuve, document cible (administratif / technique / financier / annexes), responsable, statut (TODO, IN_PROGRESS, COVERED, PARTIAL, BLOCKED, NOT_APPLICABLE).
  - Construction : pièce à produire > effectif > critère éliminatoire > clause > obligation, sans doublon pour un même passage. Les pénalités vont dans l'onglet Risques.
  - Synchronisation automatique : abonné EventBus `digest.updated`, plus `POST …/requirements/sync`.
    - Les réponses humaines ne sont jamais écrasées.
    - Une exigence disparue du DCE (rectificatif) est marquée `stale`, jamais supprimée ni renumérotée.
  - Chaque modification est auditée, avec l'événement `tender.requirement.updated`.
- **API**
  - `GET …/analysis` : thèmes et critères, avec alerte si la somme des pondérations n'est pas 100 %.
  - `GET …/risks`.
  - `GET|POST …/requirements`, `PATCH …/requirements/{id}`, `GET …/compliance` (couverture des obligatoires).
  - La matrice est réservée à l'équipe GSMS.
- **Portail**
  - Onglets Analyse, Exigences (filtres, lien vers la pièce à la bonne page, ajout manuel, « Relire le DCE »), Conformité (indicateurs, statut, responsable, document cible, réponse et preuve modifiables) et Risques.
  - L'historique affiche en clair les changements de la matrice et les statuts.
- **Vérifié en vrai** (PostgreSQL 16, migration 0011 dans les deux sens, Core, portail compilé, Chromium sur ordinateur et mobile 390 px) :
  - ZIP RC + CCTP → 12 exigences sourcées, critères 40 / 60, risques classés ;
  - exigence CNAPS passée à « Couverte » avec responsable, réponse et preuve ; couverture 1 / 9 ;
  - historique lisible.
  - Limite : la conversion Docling était simulée ; les extracteurs sont réels.
- **Tests** : `tests/test_tender_requirements.py` (4 tests ; 182 au total). La fixture `staff` (équipe GSMS) est passée dans `conftest.py`.

---

## 2026-10-03 — Chantier AO-MCP, étape 1 : dossier AO et DCE

Branche `cursor/ao-mcp-dossier`. Plan complet : `docs/chantiers/AO-MCP-AUDIT.md` (§8).

- **Un workspace par dossier AO**
  - `POST /api/v1/tenders` crée un workspace TEMPORARY rattaché à l'organisation GSMS, jamais à l'acheteur : l'offre, prix compris, n'est visible que de l'équipe.
  - La création passe par `WorkspaceManager`, qui accepte désormais un workspace sans site. Elle crée aussi la mission APPEL_OFFRES, le dossier, les dossiers du coffre-fort et les bindings d'apps.
  - Référence lisible `WS-AO-AAAA-NNNN` dans `identity_workspace.reference`, unique, numérotée par année. Elle figure dans l'événement `workspace.created`.
  - Création réservée aux rôles d'équipe GSMS (owner, admin, manager, consultant).
  - `GET /api/v1/tenders` liste les dossiers de tous les workspaces accessibles. `GET /workspaces/{ws}/tenders/current` renvoie le dossier d'un workspace AO.
- **DCE** : `POST …/tenders/{mission}/dce` accepte des fichiers et/ou un ZIP.
  - Les pièces sont rangées dans « Dossier de consultation », puis Docling et le Digest tournent en tâche de fond. Le rangement par type existait déjà.
  - Les noms Windows (CP437/UTF-8 sans drapeau) sont décodés.
  - Sont ignorés et signalés : `__MACOSX`, fichiers cachés, archives imbriquées, fichiers chiffrés ou trop gros. Plafonds : 500 fichiers, 2 Go décompressés.
  - Une pièce redéposée sous le même nom devient une **nouvelle version** du même document (rectificatif) ; si elle est identique, aucun doublon n'est créé.
- **Onglets branchés** (`tenders/views.py`, aucune donnée recalculée) :
  - pièces : reçues avec leur type, attendues, manquantes ;
  - documents : version, SHA-256, dossier, analyse ;
  - échéances : saisie + Digest, avec la page source ;
  - historique : journal d'audit du workspace, noms des personnes.
- **Validation humaine** (`tenders/lifecycle.py`, table `tender_status_change`)
  - Cycle : DRAFT → REVIEW → READY → APPROVED → SUBMITTED, avec retours arrière motivés.
  - Seul un utilisateur peut changer le statut. Les agents et les comptes client sont refusés.
  - READY, APPROVED et SUBMITTED exigent une décision GO.
  - APPROVED et SUBMITTED exigent un commentaire (pour SUBMITTED : plateforme et accusé de dépôt).
  - Événements `tender.status.changed` et, au dépôt, `tender.submitted`, envoyés au CRM par l'outbox. L'envoi réel arrivera à l'étape 10.
- **Portail**
  - `/app/tenders/{workspaceId}` remplace `/app/tenders/{missionId}`.
  - Bouton « Nouveau dossier AO » ; zone de dépôt du DCE.
  - Boutons de validation dans l'en-tête ; formulaire de décision Go / No-Go (motivée, définitive) ; carte « Validations » dans la synthèse.
  - Statuts affichés en français ; montant absent affiché « — » au lieu de « 0 € ».
- **Migration `0010`** : validée sur PostgreSQL 16 dans les deux sens. Tests : `tests/test_tender_dossier.py` (8 tests, 174 au total).
- **Vérifié en vrai** (PostgreSQL 16, Core, portail en production locale, Chromium, ordinateur et mobile 390 px) :
  - création de WS-AO-2026-0001 ;
  - ZIP du DCE → RC, CCTP et BPU reconnus et analysés, CCAP et AE signalés manquants ;
  - date de remise lue dans le RC p. 3 ;
  - GO, puis relecture → prêt → approuvé → déposé ; événements en outbox vers le CRM ;
  - le compte client ne voit aucun dossier AO.
  - Limite de la vérification : Docling n'est pas installé dans l'environnement de test, la conversion était simulée (le reste est réel).

---

## 2026-10-03 — CRM, étape 2 : pont CRM ↔ Core

**Fait**
- **Core** (`gsms_core/crm_sync/`, `POST /api/v1/integrations/crm/events`, signé HMAC avec le secret `crm`) :
  - une société devient un client (avec un site par défaut, ERP et catégorie repris) ;
  - un contact devient un contact Core ;
  - une affaire passée à « Gagné » ouvre la prestation : `WorkspaceManager` crée l'espace et la mission du bon type selon le champ « Type de mission » (appel d'offres, audit, commission, accompagnement, conformité) ;
  - les événements suivants d'une affaire liée vont dans la chronologie de sa prestation ;
  - tout est idempotent, grâce aux liaisons `camp_ai`.
- **Portail** :
  - `/api/integrations/crm/events` relaie les événements au Core, qui n'est pas exposé publiquement ;
  - `/app/espace/{workspace}` ouvre directement l'espace d'une prestation.
- **CRM** :
  - l'agent (`apps/agent/agent/lib/gsms-core.ts`) envoie chaque tâche `agent-event` au Core ; c'est la file durable de l'agent, pas un appel HTTP depuis Nest ;
  - le lien de la prestation est écrit dans le champ « Prestation GSMS », avec une note « Prestation ouverte dans GSMS » ;
  - nouveaux champs « Prestation GSMS » et « Statut dossier AO » (migration) ;
  - filtre `sourceSystem` / `externalId` sur la recherche des affaires ;
  - script `bun run gsms:sync` pour la première synchronisation.
- **Déploiement** : `deploy-all.sh` écrit `GSMS_CORE_URL` et `GSMS_CORE_WEBHOOK_SECRET` dans le `.env` du CRM, reconstruit l'app et l'agent, puis lance la synchronisation.

**Vérifié en vrai** (seed CRM → portail → Core, PostgreSQL) :
- 77 enregistrements synchronisés ;
- 16 clients et 39 contacts créés ;
- les 4 affaires gagnées ont ouvert leur prestation, et le lien et la note sont présents dans le CRM.

**Tests** : Core 170 ; CRM api 386 ; agent 370 (1 échec qui existait déjà).

---

## 2026-10-03 — CRM, étape 1 : le métier GSMS

**Fait (apps/crm)**
- **Étapes d'affaire GSMS**, migration Prisma `20261003170000_gsms_deal_stages` (les affaires existantes gardent leur étape, renommée) :
  - Prospect ;
  - Qualification ;
  - Visite / analyse du besoin ;
  - Devis envoyé ;
  - **Négociation** (nouvelle) ;
  - Gagné / Perdu / Sans suite.
- **Euros par défaut** : affaires et devise de reporting. Montants, pourcentages et dates au format français (fr-FR), y compris côté serveur, ce qui supprime un écart d'affichage entre serveur et navigateur.
- **Champs métier créés en production**, migration `20261003171000_gsms_fields`, idempotente :
  - **sociétés** : statut commercial, type d'établissement (ERP, IGH, ICPE…), catégorie ERP, types d'activité ERP, effectif, prochaine commission, SIRET, nombre de sites ;
  - **affaires** : type de mission (audit, appel d'offres, commission, accompagnement, conformité), établissement, échéance commission, référence AO, date limite de remise.
  - Auparavant, ces champs n'existaient que dans le seed local.
- **Seed de démonstration réécrit en français** : 15 établissements fictifs, contacts, affaires en euros, activités.

**Vérifié**
- check-types de l'app, de l'API, de l'agent, de db et d'ui.
- Tests : api 386/386 ; db, auth et seed sur PostgreSQL.
- Écran des affaires et des sociétés dans Chromium.
- Deux échecs existaient déjà avant ce chantier : la liste `TOOL_VERBS` de l'app et le briefing GRACE/QAtrial de l'agent.

**Suite**
- Étape 2 : pont CRM ↔ Core.
- Étape 3 : interface 100 % français (en-têtes de colonnes, fiches, paramètres, onboarding).
- Étape 4 : agents métier.

---

## 2026-10-03 — Identité unique : équipe gérée dans le Core, connexion GSMS dans GRACE, QAtrial et le CRM

**But :** les mêmes comptes partout, chaque app gardant sa base. Contrat : `docs/architecture/IDENTITE-SSO.md`.

- **Core**
  - Équipe : `/api/v1/admin/team` (inviter, rôle, désactiver, nouveau lien) et `/admin/team/{id}/apps/{app}` (dérogation par app).
  - Rôles : `/admin/roles`, tableau rôle Core → rôle par app (`identity/apps.py`).
  - Liens d'activation hachés, à usage unique. Les e-mails d'invitation passent par la messagerie, avec le lien masqué dans le journal.
  - Fournisseur OIDC (`gsms_core/oidc/`) :
    - code + PKCE S256 ;
    - jetons RS256, clé chiffrée par la clé maître ;
    - claim `gsms_role` déjà traduit pour l'app ;
    - clients déclarés par `cli sso-client` ou dans le portail.
  - Migration `0009`, validée sur PG16 dans les deux sens. Tests : `test_team_sso.py`.
- **Portail**
  - `/.well-known/openid-configuration`, `/oidc/{authorize,token,jwks,userinfo,logout}` relaient le Core.
  - Page `/activation` (le jeton est dans le fragment #).
  - Paramètres : Équipe GSMS, Rôles et droits par application, Applications connectées.
- **Apps**
  - GRACE : module `server/src/modules/sso`, bouton sur la page de connexion.
  - QAtrial : `server/routes/sso.ts` adapté (PKCE, rôle synchronisé, org `GSMS`, `REGISTRATION_ENABLED`).
  - CRM : fournisseur NextAuth `gsms` (`packages/auth/src/gsms-sso*.ts`).
- **Vérifié en vrai** (PG16, Chromium, serveur SMTP local) :
  - invitation reçue, mot de passe choisi ;
  - QAtrial → portail → retour connecté (`qa_engineer`, org GSMS) ;
  - accès QAtrial coupé : « Accès refusé par GSMS » ;
  - GRACE en un clic (`ASSESSOR`) ;
  - CRM (`member`).
- **Limite :** une session déjà ouverte dans une app vit jusqu'à son expiration (GRACE et CRM 7 j, QAtrial 24 h) ; la désactivation empêche la connexion suivante.

**Ops VPS :** voir `deploy/README.md` § « Équipe et connexion unique ».

---

## 2026-10-03 — Coffre-fort documentaire (Core + portail)

Branche `cursor/core-vault`. Demande : un stockage unique, sécurisé, partagé par toutes les applications,
consultable dans le Core avec un menu dédié, classé en arborescence, isolé par prestation et trié par site.

- **Constat :**
  - DocuLens ne prévoit rien : simple dossier `data/ingestion`, sans hash, sans chiffrement, sans séparation par client.
  - Le CRM n'a un stockage S3 que pour les images.
  - Le Core avait déjà des empreintes SHA-256, des versions et le cloisonnement par workspace.
- **Core (`gsms_core/vault/`) :**
  - chiffrement AES-256-GCM par blocs ; une clé par workspace, enveloppée par `GSMS_STORAGE_MASTER_KEY` (obligatoire en production) ;
  - blobs par workspace (`ws/<id>/…`) ; lecture déchiffrée en flux ; Docling analyse une copie temporaire.
- **Dossiers :**
  - quatre dossiers système : Pièces client, Dossier de consultation, Travail GSMS (masqué aux clients), Livrables ;
  - sous-dossiers ; classement automatique par type après le Digest ;
  - un compte client ne voit et n'écrit que dans ses dossiers.
- **API :**
  - `GET /api/v1/vault/tree` (client → site → prestation) ;
  - `…/vault/folders[/{id}]` (arbre, contenu, création, renommage, suppression) ;
  - `…/vault/documents/{id}/move|verify|access-log` ;
  - dépôt : `POST …/documents` avec `folder_id` et `analyze`.
- **Journal :** dépôt, téléchargement, déplacement et vérification sont inscrits au journal d'audit chaîné.
- **Migration :** `0005_vault` ; commande `python -m gsms_core.cli vault-migrate`, lancée par `deploy.sh`.
- **Portail :** menu « Coffre-fort » (`/app/coffre-fort`) avec :
  - l'arbre et le fil d'Ariane ;
  - le dépôt par glisser-déposer ;
  - les badges Chiffré / Analysé ;
  - les versions, le téléchargement, la vérification d'intégrité et le journal des accès (équipe).
  - Les fichiers transitent par les routes `/api/vault/…`.
- **MinIO écarté :** plus d'images Docker maintenues depuis octobre 2025. Les fichiers chiffrés restent sur le volume Docker ; une bascule vers un stockage S3 est possible par configuration.
- **Vérifié :**
  - 136 tests Core ;
  - migration 0004 → 0005 + `vault-migrate` sur PostgreSQL 16 (idempotente, aller-retour) ;
  - web : lint, typecheck et build ;
  - parcours réel dans Chromium (équipe + client) : dépôt DOCX/XLSX, analyse Docling, classement CCTP/BPU, vérification d'intégrité, « Travail GSMS » invisible côté client.
- **DEFERRED :**
  - rotation de la clé maître (ré-enveloppement des clés) ;
  - aperçu intégré dans la page ;
  - déplacement par glisser-déposer ;
  - suppression et corbeille ;
  - DocuLens branché sur les dossiers du coffre.

## 2026-10-03 — Mise en ligne de DocuLens sur `doculens.gsms-security.com`

Branche `cursor/doculens-deploy` (après PR #3 et #4, fusionnées).

- **Stack :** service `doculens` dans `docker-compose.yml` (image `apps/doculens/docker/Dockerfile.gsms`).
  - nginx sert l'interface et relaie `/api/v1/auth/*` + `/api/v1/workspaces/*` au Core, sur le même domaine : pas de CORS.
  - Le reste de `/api/` répond 404.
  - Les Dockerfile upstream de DocuLens sont inchangés.
- **Traefik :** routeur `gsms-platform-doculens` sur `Host(doculens.${DOMAIN})`, en mode host et en mode réseau, avec la redirection HTTP.
- **`deploy.sh` :**
  - avertissement si le DNS de `doculens.<domaine>` est absent ;
  - arrêt si un autre conteneur sert déjà ce nom ;
  - nouveau port local `DOCULENS_PORT=3110`.
- **Core :** l'image installe désormais Docling (PyTorch CPU) et télécharge ses modèles au build. Sans cela, l'analyse échouait en production (`docling_unavailable`).
  - `DOCLING_ARTIFACTS_PATH` est fixé par l'entrypoint si les modèles sont présents.
- **Vérifié en local :**
  - image DocuLens + vrai Core (Docling 2.132) derrière nginx : connexion, liste, dépôt, analyse, fichier d'origine identique à l'octet ;
  - recherche ⌘K avec provenance (`BPU!B4`), dans Chromium ;
  - aucune erreur d'API.

## 2026-10-03 — Chantier DocuLens branché sur le Core

Branche `cursor/doculens-core-bridge`, empilée sur la PR #3 (fusionnée). Chaîne visée :
DocuLens → Core → Docling → Digest.

**Core :**
- `GET /api/v1/workspaces/{ws}/documents` renvoie `parse_status` (dernier parsing de la version courante).
- `GET …/documents/{id}/content` : fichier d'origine (version courante ou `?version_id=`), nom de fichier UTF-8 sûr.
- `GET …/documents/{id}/normalized` : `NormalizedDocument` du dernier parsing réussi (404 tant que non parsé).
- `GET …/workspaces/{ws}/search?q=` : recherche plein texte déterministe (casse et accents ignorés, tous
  les termes requis) dans les documents parsés ; chaque résultat porte son `SourceRef`. Module `documents/search.py`.
- `GSMS_CORS_ORIGINS` : origines navigateur autorisées (vide par défaut).
- Tests : `tests/test_doculens_bridge.py` (7). Suite Core : 107 verts, ruff propre.
- Essai réel avec Docling 2.132 (DOCX + XLSX) : parsing, recherche (`BPU!B4`, section « Article 4 »),
  fichier d'origine identique à l'octet, Digest (1 conflit), CORS.

**DocuLens (`apps/doculens/frontend`) :** mode Core activé par `VITE_GSMS_CORE_URL` ; détail dans
`apps/doculens/GSMS-PROVENANCE.md` § Adaptations GSMS. Typecheck, lint et build verts.

**DEFERRED / CHANTIER SUIVANT :**
- Recherche sémantique (chunks + embeddings) et questions-réponses citées servies par le Core, derrière `/search`.
- Écran de provenance dédié (aller à la page / cellule dans le fichier d'origine).
- Choix du workspace dans DocuLens (aujourd'hui : celui du jeton ou `VITE_GSMS_WORKSPACE_ID`).
- Retrait du backend et du worker Celery de DocuLens une fois le mode Core validé.
- Toujours en attente : MCP, GRACE, QAtrial, Eve.

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
- **Validation sur le vrai Docling 2.132 (hors CI) :**
  - **XLSX :** feuille + cellules A1 exactes (`BPU!D4`), après correction du format de groupe réel (label `sheet`).
  - **DOCX :** titres, sections et paragraphes corrects.
  - **Digest réel XLSX + DOCX :** conflit SSIAP1 détecté avec sa provenance.
  - **PDF :** non validable dans le sandbox. Les modèles (layout HuggingFace, OCR RapidOCR sur modelscope.cn) sont bloqués par le réseau. L'échec remonte proprement en `ParseError` / statut FAILED.

**DEFERRED / CHANTIER SUIVANT (non fait volontairement) :**
- **Modèles Docling en production :** pré-télécharger les modèles (`docling-tools models download`) dans l'image du worker, avec un accès sortant HuggingFace / modelscope ou un miroir. Prévoir un réglage OCR (désactivé pour les PDF natifs, activé pour les scans), injecté via `converter_factory` de l'adapter.
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

## 2026-10-02 — Spine AO Core (tenders + LexSocket)

Router HTTP `GET/POST /api/v1/workspaces/{ws}/tenders` :
- liste dossiers, ouverture case, summary, go-no-go GET + POST decision
- `GET …/tenders/opportunities` → LexSocket MCP (`get_open_opportunities` / `search_tenders`), best-effort (vide sans token)
- UI `/app/tenders` déjà branchée sur ces endpoints

Tests `test_tenders.py` étendus (HTTP + MCP mock). **Poussé** `60f47f5`.

**Ops :** `GSMS_LEXSOCKET_MCP_TOKEN` (+ URL) sur Core pour la veille live.

**Prochain :** connecteurs lecture Grace → findings / actions, ou onglets AO restants (pièces, analyse).

---

## 2026-10-02 — Vertical semaine 1 : dashboard + intake Core

**Dashboard** (`GET /api/v1/workspaces/{ws}/dashboard`) — agrégat attention / deadlines / missions / activity. Tests `test_dashboard.py` verts. UI `/app` déjà branchée.

**Intake** (`POST /api/v1/intake`, anonyme, `Idempotency-Key`) — crée org CLIENT + workspace TEMPORARY (ou inbox GSMS pour contact), mission `DRAFT` `origin=intake`, event `intake.request.received`, receipt idempotente. Relay CRM best-effort si `GSMS_CRM_URL` + `GSMS_CRM_PUBLIC_KEY`. Migration `0002_intake_receipt`. Tests `test_intake.py` (7) verts.

**Ops à faire sur VPS Core :** `alembic upgrade head` + redeploy Core ; poser `GSMS_CRM_PUBLIC_KEY` (= clé publique CRM) pour que `/demande` relaie jusqu’au CRM.

**Prochain vertical (sem. 2–3) :** spine AO — router Core `/tenders` + 1 outil MCP via `mcp_gateway` + `/app/tenders`.

---

## 2026-10-02 — Auth split pattern Grace / QAtrial / CRM

Pages auth alignées sur le pattern `apps/web` (`AuthBrandedLayout` #111721) :

- **Grace** — `AuthBrandedLayout` + Login/Register (bouclier GSMS, Retour au site, panneau italic, form FR)
- **QAtrial** — idem + ThemeToggle
- **CRM** — `auth-shell` + sign-in FR (Connexion / Se connecter / Contactez-nous)

Rebuild VPS fait (2026-10-02) : sync fichiers + `docker compose up -d --build --no-deps` sur grace `web`, qatrial `app`, crm `app`. Smoke : grace/qatrial 200, crm `/sign-in` 200 — fingerprints `111721` / `Retour au site` présents.

✅ traité — auth UI déployé sur VPS
