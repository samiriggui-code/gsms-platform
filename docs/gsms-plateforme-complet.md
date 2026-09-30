# Architecture plateforme GSMS — spec consolidée

Usage : outillage interne exclusif (audits, prestations). Aucune licence revendue au client, aucun produit SaaS multi-tenant. **Comp AI GRC** (`apps/comp`) : **cible = retiré** après salvage ; **encore présent** dans le monorepo laptop tant que le GO delete n'est pas exécuté (voir `STACK-GSMS-FINALE.md` / `COMP-AI-DECOMPOSITION.md`). Le CRM (`apps/crm` + Eve) n'est **pas** Comp GRC — il reste.

> **Portée de ce document — à lire avant toute comparaison avec le code local.**
> Les diagnostics de code (§10, §12, §13, et tout renvoi à un fichier/dossier précis) ont été faits par clone direct des **repos originaux publics en amont** (`grace-pse/grace`, `MeyerThorsten/QAtrial`, `dbugom/tenderai-mcp-server-max`, `lexsocket/mcp-tenders`, `trycompai/crm`) — pas des forks locaux déjà modifiés par l'utilisateur (remplacement better-auth → NextAuth sur Comp AI, retrait du mode démo QAtrial au profit du vrai serveur, etc.).
> Ce fichier est une **direction cible**, pas un état des lieux du code local actuel. Le travail attendu de l'agent local : comparer ce qui existe réellement dans chaque fork local à ce que ce document décrit, section par section, et signaler les écarts — dans les deux sens : ce qui est déjà fait et va dans le bon sens, ce qui est fait mais diverge de cette direction, et ce qui manque encore. Ne pas présumer que l'état décrit ici (ex. "aucune trace de MCP", "PWA absent") est encore vrai après les adaptations locales déjà en cours.

---

## 1. Vue d'ensemble du circuit

```
Collecte (GRACE physique + module cyber)
        ↓
Finding commun (schéma unique)
        ↓
QAtrial + extensions (score, CAPA, policy gen, calendrier)
        ↓                              ↓
CRM/Eve — Trust Center          TenderAI — réponse AO
(livrable interne par dossier)  (réutilisation sans ressaisie)
```

Chaque flèche est un point de découplage : un module en panne ne doit jamais bloquer les autres (voir §5 Fiabilité).

---

## 2. Bloc Collecte

### 2.1 GRACE (existant, inchangé)
- Repo : `grace-pse/grace`
- Méthodologie CSMP, audit physique terrain
- Stack : React/Vite + Fastify/Prisma
- API réelle : `csmp-v2-api` sur `127.0.0.1:3011` (à exposer avant branchement Eve)

### 2.2 Module cyber (nouveau, à construire)
- Rôle : collecte de preuve contre un catalogue de contrôles ISO27001/SOC2, pour les rares clients qui le demandent (ex. datacenter)
- Source du catalogue : donnée publique (ex. OSCAL/NIST, ou export ponctuel du catalogue de contrôles ISO27001 Annexe A / SOC2 Trust Service Criteria), jamais de code Comp AI ni Xacta
- Fonctionnement minimal : formulaire de checklist + upload de preuve documentaire par contrôle, pas de connecteurs cloud automatiques au départ
- Sortie : produit des `Finding` avec `category: cyber`, au même format que GRACE

---

## 3. Finding commun (schéma pivot)

Champs clés (extension de l'existant `finding.schema.json`) :
- `category` : `physique` | `cyber` | `icpe` | `erp` | ...
- `referentiel` : ex. `arrete-25-06-1980`, `ICPE`, `ISO27001`, `SOC2`
- `control_ref` : identifiant du contrôle, réutilisable entre GRACE/AO/commission
- `source` : `grace` | `module-cyber` | autre
- `site_id`, `agent_id`, `tender_id` : selon contexte
- `date_collecte`, `date_expiration` (pour le calendrier d'échéances)
- `statut` : `brouillon` | `validé` | `signé` (jamais écrasé, voir §5)

Règle : un Finding incomplet reste `brouillon`, jamais rejeté ni bloquant en aval.

---

## 4. QAtrial + extensions

### 4.1 Existant
- Repo : `MeyerThorsten/QAtrial`
- Score de risque, CAPA, audit-trail, signature électronique légale
- Ne collecte rien — traite tout Finding entrant, quelle que soit sa `category`

### 4.2 Extensions à construire
1. **Policy generation** : génère consignes de sécurité, plan d'évacuation, sections DUERP à partir des Findings clos d'un site. IA locale via Ollama (déjà expérimentée côté Xacta). Sortie marquée "brouillon, à valider" — jamais publiée automatiquement.
2. **Calendrier d'échéances** : alerte avant expiration d'un contrôle (`date_expiration` sur le Finding). Une seule source de vérité, pas de recalcul manuel. S'applique aussi bien à un extincteur (annuel) qu'à un contrôle ISO27001.

---

## 5. Contraintes de fiabilité (transversales, à appliquer sur tous les blocs)

1. **Tolérance offline** : GRACE et le module cyber stockent en local avant synchronisation — aucune perte de donnée sur coupure réseau terrain.
2. **Idempotence** : identifiant unique généré côté client/agent (pas côté serveur) — une resoumission après crash ne crée jamais de doublon.
3. **Versionnement immuable** : un Finding validé n'est jamais réécrit. Une correction crée un nouveau Finding qui référence l'ancien.
4. **Dégradation isolée** : la panne d'un module (ex. module cyber, TenderAI) ne doit jamais remonter et bloquer les autres (ex. GRACE continue de collecter, met en file d'attente).
5. **Validation à l'entrée** : rejet propre des données malformées dès la collecte, jamais laissé polluer QAtrial/TenderAI/CRM en aval.
6. **Supervision infra** : monitoring de la disponibilité de GRACE/QAtrial/Tencent DB elle-même — distinct de la conformité des clients, c'est la fiabilité du système.

---

## 6. Sorties

### 6.1 CRM/Eve — Trust Center (nouveau module)
- Portail interne consultable par dossier/site client
- Alimenté uniquement par les Findings `statut: validé` ou `signé` — jamais un Finding en cours de collecte
- Livrable de fin de prestation, pas un abonnement facturé au client

### 6.2 TenderAI (existant, inchangé)
- Réutilise les Findings validés (via `control_ref`) pour rédiger une réponse à appel d'offre sans ressaisie
- Repo : `dbugom/tenderai-mcp-server-max`, MCP natif, port 8090

---

## 7. Ce qui est explicitement retiré

- **Comp AI GRC** (`trycompai/comp`, local `apps/comp`) : **cible** = hors stack, aucun fork long terme. **État laptop 2026-09-07** : dossier encore présent (restauré après delete prématuré) — salvage catalogues/cyber/policy en cours ; **suppression interdite sans GO** après smoke Grace+QAtrial. Ne pas confondre avec **`apps/crm`** (CRM + Eve), qui reste.
- **Xacta** (`xactasolutionsai/grc`, fork `ciso-assistant-community`) : écarté (stack Django/SvelteKit/Skeleton UI jugée trop lourde à adapter UX/UI). Seule sa fonction (catalogue ISO27001/SOC2) est reprise en donnée brute dans le module cyber — jamais son code ni son UI.

---

## 8. Ordre de build recommandé

1. Fiabilité GRACE (offline + idempotence) — tout le reste en dépend
2. Extension QAtrial : calendrier d'échéances, puis policy generation
3. Trust Center CRM/Eve
4. Module cyber (collecte ISO27001/SOC2) — en dernier, car optionnel et rarement déclenché
5. Canal terrain WhatsApp/Telegram sur GRACE
6. Intégration Matterport (scan 3D) pour les gros sites

---

## 9. Intégrations issues de la veille marché

### 9.1 Canal terrain WhatsApp/Telegram → GRACE
- Objectif : un agent terrain envoie une photo + un message vocal/texte, ça devient un `Finding` brouillon dans GRACE — sans passer par le formulaire complet sur site
- WhatsApp Business Platform (Cloud API, hébergée par Meta) :
  - Vue d'ensemble : https://developers.facebook.com/docs/whatsapp
  - Démarrage rapide Cloud API : https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/
  - Webhooks (réception des messages entrants) : https://developers.facebook.com/docs/whatsapp/webhooks/
  - Gestion du compte business (WABA, templates) : https://developers.facebook.com/docs/whatsapp/business-management-api
- Telegram Bot API (alternative plus simple à mettre en place, pas de vérification business) :
  - Doc officielle : https://core.telegram.org/bots/api
- Le Terrain (référence marché ayant déjà ce pattern) : https://leterrain.co/securite-incendie — pas d'API publique connue, à considérer comme source d'inspiration UX seulement

### 9.2 Scan 3D → Matterport
- Objectif : lier un scan 3D du bâtiment au `site_id` du Finding, pour localiser une non-conformité sur un plan — utile sur les gros sites (industriel, datacenter, aéroport)
- Documentation développeur (API + SDK) : https://matterport.github.io/developer-docs/
- Repo GitHub officiel de la doc : https://github.com/matterport/developer-docs
- Showcase SDK (JS, intégration web) : https://github.com/matterport/showcase-sdk
- Deux options d'intégration :
  - Embed SDK (`@matterport/sdk` sur NPM) — contrôle du visualisateur, overlays 2D custom, cas d'usage le plus proche du besoin (pointer un Finding sur le plan)
  - GraphQL API — requêtes sur les métadonnées du modèle et les données spatiales, utile pour synchroniser `site_id` ↔ modèle Matterport côté backend
- My 360 Room (référence marché) : https://my360room.com/audit-conformite-plans-securite-erp/ — usage similaire (scan + GMAO), pas d'API publique documentée

### 9.3 Catalogue de contrôles cyber (module ISO27001/SOC2, §2.2)
- OSCAL (Open Security Controls Assessment Language, NIST) — catalogues de contrôles en JSON/YAML librement réutilisables, inclut des mappings ISO27001/SOC2/NIST :
  - Repo officiel : https://github.com/usnistgov/OSCAL
  - Contenu des catalogues (mappings prêts à l'emploi) : https://github.com/usnistgov/oscal-content
- ciso-assistant-community (upstream du fork Xacta, écarté comme app mais catalogue de contrôles réutilisable en donnée brute uniquement, jamais son code/UI) :
  - Repo : https://github.com/intuitem/ciso-assistant-community

### 9.4 Principe à retenir (pas d'intégration directe)
- Bureau Veritas a lancé en avril 2026 un audit de conformité multiagent (partenariat AWS) automatisant l'analyse documentaire et les tests techniques — produit propriétaire, pas d'API publique. Sert de validation externe que l'axe "policy generation IA" du §4.2 est la bonne priorité, pas de code à en tirer.
- Les vérifications réglementaires agréées État (Q18/D18 Apave/Socotec/Qualiconsult, ICPE Dekra) ne sont pas intégrables ni remplaçables — prévoir seulement un champ `source_externe` sur le Finding pour y référencer leurs rapports PDF.

---

## 10. Diagnostic réel du code GRACE (`grace-pse/grace`, repo public)

Vérifié par clone direct du repo, pas par supposition.

### 10.1 Espace terrain / mobile — absent
- Aucune page `Field*`, `Mobile*` ou `Agent*` dédiée dans `client/src/pages/` (23 pages, toutes desktop : `AssessmentWizardPage`, `SurveyRunPage`, etc.)
- `client/src/components/shell/MobileNotSupportedOverlay.tsx` bloque explicitement l'usage sous 767px de large avec le message *"GRACE Engine is desktop-first (...) We're working on a proper mobile pass"*
- Une tablette (≥768px, iPad et la plupart des Android) passe au-dessus du seuil et n'est pas bloquée — usage minimum viable possible dès aujourd'hui, mais sur des écrans non pensés pour le tactile
- Seulement 3 pages sur 23 utilisent des classes responsive Tailwind (`sm:`/`md:`/`lg:`) — le reste est en layout fixe desktop

### 10.2 PWA — déjà en place, mais lecture seule hors-ligne
- `vite-plugin-pwa` + Workbox configurés (manifest complet, mode `standalone`, icônes, précaching de l'app shell)
- `InstallAppToast.tsx` : install prompt non intrusif (attend 2 visites, suppression 30 jours si refusé)
- `OfflineBanner.tsx` : bannière visible hors-ligne
- **Limite actuelle (commentaire explicite dans le code)** : *"Reads from the service-worker cache keep working; writes are blocked by the API layer"* — le offline ne couvre que la lecture des données déjà chargées, pas la saisie d'un nouveau Finding sur le terrain sans réseau

### 10.3 Plan de responsive design ciblé (pas un rewrite)
1. Reprendre en priorité les pages réellement utilisées sur le terrain (`SurveyRunPage`, `AssessmentWizardPage`) avec des classes Tailwind responsive — stack déjà compatible, pas de changement de techno nécessaire
2. Laisser les pages d'admin (`AdminSurveyConfigPage`, `AdminTemplatesPage`, etc.) en desktop-only, pas de valeur à les rendre mobile
3. Abaisser ou retirer le seuil de blocage dans `MobileNotSupportedOverlay` une fois les pages clés rendues responsive
4. Combler le vrai manquant : écriture offline. Étendre la logique déjà présente (service worker Workbox) pour mettre en file d'attente les écritures (nouveaux Findings) pendant une coupure réseau, et les synchroniser au retour — c'est l'implémentation concrète de la contrainte d'idempotence et de tolérance offline du §5

---

## 11. Compensation croisée GRACE ↔ QAtrial (mobile/PWA)

Diagnostic vérifié par clone des deux repos (`grace-pse/grace` et `MeyerThorsten/QAtrial`) : chacun a la moitié du problème que l'autre a résolue.

| | GRACE | QAtrial |
|---|---|---|
| PWA (manifest, Workbox, install prompt) | ✅ configuré (`vite-plugin-pwa`) | ❌ absent |
| Écrans de saisie mobile | ❌ bloqués sous 767px | ✅ déjà écrits (`MobileBatchEntry.tsx`, `MobileComplaintForm.tsx`, `MobileReadingEntry.tsx`, dossier `components/mobile/`) |
| Écriture offline (file d'attente + sync) | ❌ absent (offline = lecture seule) | ❌ absent |

Les deux repos sont séparés (pas de workspace pnpm commun), donc pas de partage de code automatique — mais transfert manuel direct possible, même stack Vite + React des deux côtés :

- **GRACE → QAtrial** : copier le bloc `VitePWA({...})` du `vite.config.ts` de GRACE, `OfflineBanner.tsx`, `InstallAppToast.tsx`, le hook `useOnlineStatus` — quasi copiables en l'état (juste adapter nom/icônes du manifest)
- **QAtrial → GRACE** : pas de code brut réutilisable (modèles de données différents — QAtrial = complaint/reading/batch pharma, GRACE = site/control/finding sécurité), mais `MobileBatchEntry.tsx`/`MobileReadingEntry.tsx` servent de référence de mise en page pour construire la page terrain manquante de GRACE (formulaire compact, tactile)
- **Écriture offline** : à construire une seule fois (peu importe sur quel repo en premier), puis dupliquer le même hook/pattern sur l'autre plutôt que de le réécrire deux fois — c'est la seule brique qui manque réellement aux deux

---

## 12. Diagnostic réel du code TenderAI et mcp-tenders

Vérifié par clone des deux repos (`dbugom/tenderai-mcp-server-max` et `lexsocket/mcp-tenders`).

### 12.1 TenderAI MCP Max — logique locale réelle, mais hors-sujet sectoriellement
- Stack : Python, FastMCP, SQLite + `sqlite-vec` (recherche vectorielle via VoyageAI), LLM Anthropic, parsing PDF/docx (`pdfplumber`, `python-docx`), génération Excel (`openpyxl`)
- ~24 outils répartis en `document` / `financial` / `indexing` / `partners` / `technical` (`app/tools/`)
- **Origine du code confirmée dans le schéma SQL** (`app/db/schema.sql`) : `sector DEFAULT 'telecom'`, `country DEFAULT 'OM'` — outil construit à l'origine pour un usage télécom au Moyen-Orient, pas pour la sécurité privée française
- Tables existantes : `rfp` (appel d'offre), `proposal` (réponse), `vendor` (fournisseur), `bom` (bill of materials, avec calcul de marge automatique) — mécanique financière/logistique directement transposable
- Aucune trace de `finding` ni `control_ref` dans le code — zéro lien actuel avec le schéma pivot de la plateforme

### 12.2 mcp-tenders — proxy quasi vide, toute la logique est distante
- ~80 lignes de code (`index.js`) : un simple client passthrough vers un serveur hébergé à `mcp.lexsocket.ai/ted`
- Toute la logique de recherche AO (TED, et selon la doc BOAMP + 10 pays européens) tourne côté serveur lexsocket, invisible depuis ce repo
- Dépendance totale à la disponibilité et à la feuille de route d'un tiers — pas de fallback local si le service tombe ou change de scope

### 12.3 Ajustements à prévoir pour se raccorder à la logique de la stack
1. Remplacer les tables `rfp`/`proposal`/`vendor`/`bom` de TenderAI par un schéma adapté sécurité privée (référentiel CNAPS, type de prestation gardiennage/télésurveillance/incendie), en gardant la mécanique BOM/financier telle quelle — elle est générique et transposable
2. Ajouter des champs `control_ref` / `referentiel` dans les tables `rfp`/`proposal` de TenderAI pour qu'il puisse consommer directement les Findings validés de QAtrial sans ressaisie — c'est le vrai point de raccordement à la logique de la stack
3. `mcp-tenders` ne nécessite aucune adaptation de code (c'est un point d'entrée externe, pas un module interne) — le traiter comme une dépendance tierce à risque à surveiller, pas comme une brique à modifier
4. Vigilance : la brique `sqlite-vec`/VoyageAI de TenderAI (recherche vectorielle) est un service payant externe supplémentaire à budgétiser si utilisée, distinct de l'IA locale Ollama déjà utilisée ailleurs dans la stack (Xacta)

---

## 13. Diagnostic réel du code CRM/Eve (`trycompai/crm`)

Vérifié par clone direct du repo.

### 13.1 Structure confirmée
- Monorepo : `apps/app` (front CRM), `apps/agent` (Eve), `apps/api`, packages partagés `db`/`auth`/`validation`/`env`
- Eve = package npm `eve` (v0.29.4), lancé via `eve dev`/`eve build`, écoute sur `AGENT_URL` défaut `http://127.0.0.1:2000` — cohérent avec le CRM en prod du NUC (port interne 2000 déjà documenté)

### 13.2 Tools Eve existants — 100% orientés vente, zéro audit
`apps/agent/agent/tools/` contient ~20 tools : `search_crm`, `enrich_company`, `research_company`, `resolve_linkedin_profile`, `get_contact_work_history`, `list_deals`, etc. — tous pour l'enrichissement de fiches prospects/entreprises, aucun lien avec audit ou sécurité. À conserver tels quels pour l'usage commercial classique du CRM.

### 13.3 Client MCP — absent, à construire de zéro
`grep -r "mcp" apps/agent/` ne retourne aucun résultat. La connexion d'Eve vers GRACE/QAtrial/TenderAI en MCP n'existe pas dans le code — ce n'est pas une fonctionnalité désactivée à réactiver, c'est un développement complet à faire, sur le modèle des tools déjà présents dans `apps/agent/agent/tools/`.

Détail notable : `tools/agent.ts` importe `disableTool()` — un tool de délégation à un sous-agent, présent dans le repo upstream mais désactivé par défaut. Signal que l'architecture prévoit ce type d'extension sans l'avoir implémentée pour ton usage.

### 13.4 Ajustements à prévoir
1. Écrire un nouveau tool Eve (ex. `query_findings`, `trigger_audit`) qui appelle GRACE/QAtrial/TenderAI en client MCP — pattern à copier depuis les tools existants (`apps/agent/agent/tools/*.ts`)
2. Le Trust Center (§6.1) se branche dans `apps/app` (le front), pas dans `apps/agent` — deux zones distinctes du même monorepo, pas à mélanger
3. Garder les tools de vente/prospection existants intacts — aucune raison de les toucher, ils ne se recoupent pas avec la logique Finding

---

## 14. InvoicePilot — porte unique publique, jamais d'accès direct aux outils internes

Contexte : InvoicePilot a été détourné de son usage d'origine (facturation) pour devenir le site vitrine + espace client de GSMS ; sa partie CRM/facturation interne a été retirée au profit d'une jonction directe avec le CRM Comp AI (fork `trycompai/crm`).

### 14.1 Principe d'architecture
InvoicePilot ne parle **jamais** directement à GRACE, QAtrial ou TenderAI. Il ne parle qu'au CRM, qui reste l'unique orchestrateur vers les outils internes (décision déjà actée dans la stack). Avantage sécurité : même en cas de faille côté site public, aucun accès possible aux outils d'audit internes, puisque InvoicePilot n'en a physiquement pas la route.

### 14.2 Trois briques à construire
1. **Formulaires publics (devis/contact)** : déjà câblés côté code vers `GSMS_PUBLIC_API_*`, non configurés — à activer et pointer vers le CRM, pas à réécrire
2. **Espace client authentifié** : pas de code à reprendre de Comp AI, mais son `apps/portal` (app Next.js séparée, auth publique dédiée, scoping par organisation `[orgId]`, routes `api/portal/...`) sert de patron d'architecture. Deux options : (a) route protégée dans InvoicePilot qui appelle l'API CRM en lecture, ou (b) redirection vers `apps/app` du CRM avec un rôle d'accès "client externe" distinct de l'auth staff interne — option la plus rapide, aucune reconstruction de la donnée déjà présente côté CRM
3. **Upload/téléchargement de pièces** : les fichiers passent par l'API du CRM vers MinIO — InvoicePilot ne fait que relayer la requête, jamais de stockage propre, pour éviter deux systèmes de fichiers à synchroniser

---

## 15. Diagnostic réel du code InvoicePilot-AI (`samiriggui-code/InvoicePilot-AI`)

Vérifié par clone direct du repo (rendu public par l'utilisateur).

### 15.1 Nature réelle du "CRM" existant
- `docs/ARCHITECTURE_PONT.md` documente le vrai métier du repo : un pont de facturation électronique (sources CMS/ERP → normalisation `CanonicalInvoice` → Factur-X/UBL/CII → Plateforme Agréée DGFiP), pas un CRM de suivi de prestations
- Modèle Prisma `Counterparty` (`clients.tsx`/`clients.new.tsx`) = fiche tiers de facturation (SIREN/SIRET, adresse de facturation), pas un dossier de prestation GSMS avec statut d'audit/findings/pièces jointes — à ne pas confondre avec l'espace client GSMS à construire
- Rôles existants (`OWNER`, `ADMIN`, `ACCOUNTANT`, `COLLABORATOR`) : 100% internes, aucun rôle client externe — même limite structurelle que le CRM Comp AI

### 15.2 Ce qui est réellement récupérable
- Séparation `_marketing/` (vitrine) / `_app/` (dashboard connecté) déjà propre structurellement
- `Organization` / `OrganizationMember` / `OrganizationInvite` (Prisma) : vraie brique multi-tenant, saine, jamais pensée pour un accès externe — à réutiliser comme brique d'isolation pour l'espace client plutôt que d'emprunter à Comp AI
- `ContactMessage` + templates email (`contact-confirmation.tsx`, `contact-inquiry.tsx`) : formulaire de contact public déjà fonctionnel
- Un agent IA déjà branché (`ai-agent.ts`, route `/agent`), séparé d'Eve — à clarifier s'il fait doublon ou sert un rôle distinct
- UI construite sur le patron Metronic (confirmé par un commentaire dans `team.roles.tsx`) — cohérent avec le chantier responsive prévu ailleurs dans la stack (§10)

### 15.3 Bug de persistance — réinitialisation à chaque redémarrage
- Le volume Postgres est correctement déclaré en volume nommé persistant (`postgres_data:/var/lib/postgresql/data`) dans `docker-compose.yml` — un redémarrage normal ne devrait pas effacer les données
- Suspect identifié : `deploy/cleanup-vps.sh` exécute `docker compose down --remove-orphans --volumes` puis supprime explicitement les volumes nommés `invoicepilot*` — c'est un script de nettoyage total volontaire, pas un hook de redémarrage automatique
- Signal de contexte : le dossier `deploy/` contient une vingtaine de scripts `hotpatch-*`, `fix-*`, `restore-*` (ex. autour du 2FA) — pattern de déploiement en patch live répété
- **À vérifier avec l'agent local** : quelle commande est réellement utilisée pour "redémarrer" en pratique — si `cleanup-vps.sh` sert de bouton restart de facto au lieu d'un simple `docker compose restart`/`up -d`, c'est la cause directe et la correction est immédiate (réserver ce script à un vrai reset volontaire uniquement)

---

## 16. Synthèse consolidée — tout par catégorie d'action

Vue transversale des sections 1-15, réorganisée par nature d'action plutôt que par app. À utiliser comme checklist de suivi.

### 16.1 À supprimer / retirer
- **Comp AI GRC** (`apps/comp`) : hors stack **après** salvage + smoke + GO delete — encore sur disque laptop au 2026-09-07 (§7). **CRM `apps/crm` : ne pas toucher.**
- **Xacta** (`xactasolutionsai/grc`) : écarté pour stack UI trop lourde — seul son catalogue de contrôles (donnée brute) est repris, jamais le code (§7, §9.3)
- **`deploy/cleanup-vps.sh` utilisé comme "restart"** : à cesser immédiatement si c'est le cas — réserver ce script à un vrai reset volontaire, jamais à un redémarrage courant (§15.3)
- Confusion `Counterparty` (InvoicePilot) = espace client GSMS : à ne jamais mélanger, ce sont deux objets métier différents (§15.1)

### 16.2 À développer de zéro (rien d'existant à modifier)
- Module cyber de collecte ISO27001/SOC2 (checklist + upload preuve) (§2.2)
- Écriture offline (file d'attente + sync au retour réseau) — manque à la fois à GRACE et QAtrial, à construire une seule fois puis dupliquer (§10.2, §11)
- Client MCP dans Eve (`query_findings`, `trigger_audit`) — zéro trace dans le code actuel, pas une activation, un vrai développement (§13.3)
- Trust Center CRM (`apps/app`) (§6.1, §13.4)
- Espace client authentifié InvoicePilot (§14.2)
- Canal terrain WhatsApp/Telegram → GRACE (§9.1)

### 16.3 À compléter / étendre (base existante à enrichir)
- QAtrial : ajouter policy generation + calendrier d'échéances (§4.2)
- GRACE : responsive design ciblé sur `SurveyRunPage`/`AssessmentWizardPage` (§10.3)
- TenderAI : ajouter champs `control_ref`/`referentiel` aux tables `rfp`/`proposal` (§12.3)
- Finding schema : champ `source_externe` pour référencer les rapports PDF des organismes agréés (Q18/D18/ICPE) (§9.4)
- Matterport : lier `site_id` du Finding au scan 3D pour les gros sites (§9.2)

### 16.4 À adapter / remplacer (le hors-sujet sectoriel à recadrer)
- TenderAI : remplacer les tables `rfp`/`proposal`/`vendor`/`bom` (héritées d'un usage télécom Oman) par un schéma sécurité privée (CNAPS, gardiennage/télésurveillance/incendie), en gardant la mécanique financière telle quelle (§12.1, §12.3)
- InvoicePilot `clients.tsx`/`Counterparty` : reste un outil de facturation, ne pas le détourner en suivi de prestation — construire l'espace client à côté, pas dedans (§15.1)

### 16.5 À relier / connecter (jonctions entre briques existantes)
- GRACE ↔ QAtrial : transfert PWA (GRACE→QAtrial) et transfert pattern UI mobile (QAtrial→GRACE) (§11)
- QAtrial → TenderAI : Findings validés consommés sans ressaisie via `control_ref` (§12.3)
- QAtrial → CRM : alimentation du Trust Center, uniquement Findings `validé`/`signé` (§6.1)
- InvoicePilot → CRM : formulaires publics via `GSMS_PUBLIC_API_*` (déjà câblé, non configuré) (§14.2)
- InvoicePilot → CRM → MinIO : upload de pièces relayé, jamais stocké côté InvoicePilot (§14.2)
- Eve → GRACE/QAtrial/TenderAI : nouveau tool MCP à écrire, seul point d'entrée autorisé vers les outils internes (§13.3, §14.1)

### 16.6 À référencer (documentation/specs externes à consulter, pas de code à copier)
- OSCAL / oscal-content (NIST) — catalogues ISO27001/SOC2 (§9.3)
- ciso-assistant-community — catalogue de contrôles uniquement (§9.3)
- WhatsApp Cloud API / Telegram Bot API — doc d'intégration canal terrain (§9.1)
- Matterport developer-docs / showcase-sdk — intégration scan 3D (§9.2)
- Comp AI `apps/portal` — patron d'architecture multi-org pour l'espace client, jamais son code (§14.2)
- Bureau Veritas (audit multiagent AWS) — validation stratégique de l'axe policy generation, aucune intégration technique possible (§9.4)

### 16.7 À vérifier avec l'agent local (état réel du fork vs direction cible)
- **Auth NextAuth :** migration **terminée sur `apps/crm`** (next-auth seul). Sur **`apps/comp`** (GRC) : better-auth encore dominant + next-auth partiel — **travail perdu** car cette app part après GO delete. Ne pas confondre les deux.
- **Ports lab :** Grace API = **`:3011`** ; CRM Nest = **`:3001`** ; QAtrial API = aussi **`:3001`** par défaut (collision si les deux tournent). InvoicePilot `GSMS_CRM_API_URL` doit viser le **CRM `:3001`**, jamais Grace.
- QAtrial local : mode démo déjà retiré au profit du "vrai serveur" — comparer à §4
- Avancement du "finding machin" déjà entamé localement — comparer au schéma pivot §3
- InvoicePilot : quelle commande sert réellement de "redémarrage" en production — confirmer ou infirmer l'hypothèse `cleanup-vps.sh` (§15.3)
- CRM : présence ou non d'un rôle "client externe" déjà ajouté localement, vu la mise en garde §13 sur `WORKSPACE_ROLES` ; `node_modules` CRM souvent corrompu → réinstall `rm -rf node_modules && bun install` avant smoke

### 16.8 Dépendances tierces à surveiller (pas de code, juste du risque)
- `mcp-tenders` : proxy vide, dépendance totale à `mcp.lexsocket.ai`, pas de fallback (§12.2)
- `sqlite-vec`/VoyageAI (TenderAI) : service payant externe à budgétiser si utilisé (§12.3)
- Organismes agréés État (Apave, Socotec, Qualiconsult, Dekra) : jamais remplaçables, juste référencés via `source_externe` (§9.4)


---


# Visual Frontend Profile — Nixtio → gsms-plateforme

> Note méthodologique : je n'ai pas de navigateur avec capture d'écran, ni d'accès pixel aux images (le moteur d'image search affiche les visuels à l'utilisateur mais ne me transmet pas leur contenu pixel). L'analyse ci-dessous combine : (a) l'exploration textuelle des case studies Nixtio (nixtio.com/cases, Crextio en particulier — HR dashboard, 2025, web+mobile+branding), (b) les propos de fond de Nixtio sur leur propre style ("pas de style signature, mais une hiérarchie spatiale intuitive, un usage réfléchi de la lumière/ombre, des transitions douces qui rendent l'interface plus 'humaine'"), (c) la reconnaissance du registre visuel "premium SaaS dashboard" auquel Crextio/LinkMatch/InputNinja appartiennent clairement (même famille que Linear, Vercel, Cron, Raycast, Untitled UI).
>
> **Ce document est donc un point de départ solide mais pas une extraction pixel-perfect.** Pour aller plus loin avec précision (mesures exactes de padding/radius/ombres), il faudrait soit que tu me donnes des captures d'écran en pièce jointe (je peux alors les analyser visuellement), soit que j'ouvre les sites dans un navigateur — capacité que je n'ai pas dans cet environnement.

---

## 1. Ce qui ressort des projets Nixtio étudiés

Projets explorés : **Crextio** (2025, HR dashboard — web + mobile + branding + motion), portefeuille général (Dribbble/Behance : SaaS, CRM, fintech, healthcare), positionnement studio (nixtio.com/about, nixtio.com/cases).

Constantes revendiquées par le studio lui-même (donc fiables, pas des suppositions) :
- Pas de "signature style" figé → adaptabilité au produit, mais un haut niveau de finition constant.
- Hiérarchie spatiale intuitive (spatial hierarchy) comme fil conducteur.
- Usage réfléchi de lumière/ombre pour donner de la profondeur sans excès.
- Transitions douces ("softness in transitions") plutôt que des animations spectaculaires.
- Approche "atmosphère du projet" : chaque produit a sa propre tonalité (Crextio = confiance/RH, calme professionnel).

Structure de case study Crextio (révélatrice de leur process) : research & UX → design plateforme web → design mobile → identité de marque → motion. Le dashboard est présenté comme "unifiant les données clés pour que les équipes RH se concentrent sur les gens" — donc **densité maîtrisée**, pas un dashboard-sapin-de-Noël.

## 2. Grammaire visuelle "premium SaaS" (registre auquel Nixtio appartient)

C'est le registre partagé par la quasi-totalité des dashboards premium actuels (Linear, Vercel, Cron, Untitled UI, Crextio inclus) :

- **Densité maîtrisée** : beaucoup d'espace négatif autour de blocs d'information denses, jamais dense partout.
- **Cards comme unité de base** : chaque carte = un fond légèrement distinct du fond de page (surface +1), un radius cohérent, un padding généreux (24–32px desktop), une ombre très subtile ou juste une bordure 1px.
- **Hiérarchie typographique courte** : 5–6 niveaux max (display / titre de page / titre de section / titre de carte / métrique / corps / caption), pas plus.
- **Une seule couleur d'accent** + une palette de gris neutres (souvent un gris légèrement teinté, pas un gris pur) + 2-3 couleurs sémantiques (succès/alerte/erreur) réservées aux données, jamais décoratives.
- **Contraste calme** : fond très clair ou très sombre, texte quasi-noir/quasi-blanc mais pas #000/#FFF pur (fatigue visuelle).
- **Border-radius cohérent par catégorie** (pas la même valeur pour un bouton et pour un panneau) mais une seule échelle pour tout le produit.
- **Motion fonctionnel** : apparition en fondu + léger décalage vertical (8–12px), jamais de bounce/spring exagéré sauf sur un état de succès ponctuel.

## 3. Design tokens

> **Mise à jour 2026-09-07 — étape 5 du §6 exécutée (relevé navigateur réel).**
> Pages ouvertes dans Chromium : `nixtio.com/`, `nixtio.com/cases`, `nixtio.com/cases/crextio`,
> `nixtio.com/cases/linkmatch`. Valeurs lues via `getComputedStyle` sur le DOM, pas estimées.

### 3.0 Le constat qui change la lecture du document

**Les écrans de case study ne sont pas mesurables.** Crextio, LinkMatch et InputNinja sont
présentés sous forme d'**images et de vidéos** posées dans la page — il n'y a pas de DOM de
dashboard à inspecter. Le seul CSS réellement lisible est celui du **site de l'agence lui-même**.

Conséquence directe : le §2 (« grammaire premium SaaS dashboard, même famille que Linear /
Vercel / Untitled UI ») était une **hypothèse de registre**, et le relevé la contredit. Le site
de Nixtio n'est pas un dashboard SaaS : c'est un **site éditorial sombre**, typographie très
grande, aucune bordure, aucune ombre sur les cartes, rythme vertical énorme.

Il faut donc **deux jeux de tokens distincts**, et ne pas les mélanger :

| Registre | Statut | Usage |
|---|---|---|
| **§3.1 — éditorial / vitrine** | **MESURÉ** sur nixtio.com | Site vitrine GSMS |
| **§3.2 — dashboard / portail** | **ESTIMÉ**, non mesurable | Portail `_app`, cockpit |

### 3.1 Registre éditorial — valeurs mesurées sur nixtio.com

```yaml
# Toutes ces valeurs sont relevées, aucune n'est déduite.
font:
  family: Inter                      # confirmé (le doc disait "Inter ou Geist")
  weights: [500, 600]                # UNIQUEMENT — jamais 400, jamais 700
  letter-spacing: -0.04em à -0.05em  # appliqué à TOUTES les tailles, corps inclus
                                     # = la signature la plus reconnaissable du système

type-scale:                          # taille / graisse / line-height / letter-spacing
  display:  144px / 600 / 1.00 / -0.05em
  title:     52px / 600 / 1.10 / -0.05em
  lead:      30px / 500 / 1.25 / -0.05em
  sub:       22px / 500 / 1.20 / -0.04em
  card:      18px / 600 / 1.05 / -0.05em
  body:      16px / 500 / 1.50 / -0.04em
  action:    14px / 600 / 1.15 / -0.023em
  meta:      12px / 600 / 1.30 / -0.04em

colors:
  page:            "#F5F5F5"
  surface:         "#FFFFFF"
  dark:            "#0A0A0A"
  dark-elevated:   "#313131"
  ink:             "#0A0A0A"
  ink-secondary:   "rgba(10,10,10,0.6)"    # PAS un gris : l'encre à 60% d'opacité
  hairline:        "rgba(10,10,10,0.1)"
  on-dark:         "#FFFFFF"
  on-dark-second:  "rgba(255,255,255,0.6)"
  on-dark-line:    "rgba(255,255,255,0.16)"
  # aucune couleur d'accent : tout le contraste est porté par le noir et le blanc

radius:
  card:  18px     # cartes de réalisation (mesurées 566x480)
  block: 25px     # blocs de contenu, médias, sections sombres
  pill:  100px    # boutons, badges
  # 3 valeurs seulement — pas 5

elevation:
  cards: none                                  # ni bordure ni ombre : la couleur seule sépare
  float: "0 8px 24px rgba(0,0,0,0.12)"         # nav flottante uniquement
  hairline-inset: "inset 0 0 1px rgba(0,0,0,0.15)"      # filet interne au lieu d'un border
  hairline-inset-dark: "inset 0 0 2px rgba(255,255,255,0.5)"

layout:
  container: 1136px
  columns:   "2 × 566px, gouttière 4px"        # gouttière très serrée
  gaps:      [4, 8, 16, 32, 40, 80, 160]
  section-padding-y: 190px                     # rythme vertical volontairement énorme

controls:
  button-height: 40px
  button-padding: "0 20px"
  button-radius: 100px
  button-type: "14px / 600"
  transition: "0.3s ease-in-out"

card-padding: [30px, 40px, 60px]

motion:
  controls: "0.3s ease-in-out"
  media:    "0.2s / 0.6s ease"
```

### 3.2 Registre dashboard — ESTIMÉ, à ne pas présenter comme mesuré

Les valeurs ci-dessous sont l'estimation d'origine de ce document. **Elles restent une
proposition** : le §6 demandait de les remplacer par des mesures, or les dashboards Nixtio ne
sont pas inspectables (§3.0). Elles ne doivent pas être « validées par Nixtio » dans une
discussion — aucune ne l'est.

```yaml
spacing:   { xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px, 3xl: 64px }
radius:    { control: 8px, card: 12px, panel: 16px, modal: 20px, pill: 999px }
typography:
  display: 40px / 600 / -0.02em
  page-title: 28px / 600 / -0.01em
  section-title: 18px / 600
  card-title: 15px / 600
  metric: 32px / 700 / -0.02em
  body: 14px / 400
  caption: 12px / 500 / uppercase
surfaces:  page → panel → card → elevated → overlay
motion:    { fast: 120ms ease-out, normal: 200ms ease-out, slow: 320ms ease-in-out }
```

### 3.3 Écarts entre l'estimation et le relevé

| Propriété | Estimé (§3.2) | Mesuré (§3.1) | Écart |
|---|---|---|---|
| Police | « Inter ou Geist » | **Inter** | confirmé |
| Graisses | 400 / 500 / 600 / 700 | **500 et 600 seulement** | le corps est en 500, jamais 400 |
| Letter-spacing | sur les gros titres | **partout, corps inclus (-0.04em)** | manqué — c'est la signature |
| Corps de texte | 14px / 400 | **16px / 500** | plus grand et plus gras |
| Titre de section | 18px | **52px** | ×3 |
| Display | 40px | **144px** | ×3,6 |
| Radius | 5 valeurs (8→20px) | **3 valeurs (18 / 25 / 100px)** | bien plus arrondi, moins d'échelons |
| Bordure de carte | « bordure 1px subtile » | **aucune** | séparation par la couleur seule |
| Ombre de carte | « très subtile » | **aucune** | ombre réservée au flottant |
| Texte secondaire | gris neutre teinté | **encre à 60% d'opacité** | pas un gris |
| Accent | « une seule couleur d'accent » | **aucune** | contraste noir/blanc pur |
| Rythme de section | 48–64px | **190px** | ×3 à ×4 |
| Gouttière de grille | 24px | **4px** | ×6 plus serré |

**À retenir :** l'estimation décrivait un dashboard sobre. Le relevé décrit un site éditorial
à typographie monumentale. Les deux sont légitimes — mais pas au même endroit, et le §2 de ce
document présentait le second comme le premier.

## 4. Architecture de composants proposée

```
/ui
  /layout       AppShell, PageHeader, ContentGrid, Sidebar
  /surfaces     Card, MetricCard, DataCard, Panel, FloatingPanel
  /data         ChartCard, Metric, Progress, DataTable, StatGroup
  /controls     Button, IconButton, Input, Select, Tabs, SegmentedControl
  /overlay      Modal, Drawer, Popover, Tooltip
  /feedback     Skeleton, EmptyState, LoadingState, Toast
  /motion       Reveal, Stagger, Collapse, Transition
```

Règle non négociable : tous ces composants consomment les tokens ci-dessus — aucune valeur en dur (`px`, couleur hex) dans une page.

## 5. Principes directeurs (garde-fous "pas de faux premium")

- Pas de glassmorphism/blur systématique, pas de gradients gratuits.
- Radius cohérent par catégorie, jamais un radius arbitraire différent par page.
- Animation = feedback fonctionnel, pas décoration.
- Densité forte acceptée seulement là où c'est nécessaire (tableaux de données), jamais par défaut.

## 6. Consigne pour l'agent Claude qui reprendra ce fichier (avec accès navigateur)

> **État d'exécution au 2026-09-07 :**
> - Étape 1 ✅ pages ouvertes (`/`, `/cases`, `/cases/crextio`, `/cases/linkmatch`)
> - Étape 2 ⚠️ captures prises, mais **les écrans de dashboard sont des images/vidéos** — il n'y a pas d'écran applicatif navigable à capturer
> - Étape 3 ✅ pour le site de l'agence · ❌ **impossible** pour les dashboards (pas de DOM, cf. §3.0)
> - Étape 4 ✅ recoupé sur 4 pages
> - Étape 5 ✅ §3 remplacé par les valeurs mesurées + tableau d'écarts (§3.3)
> - Étape 6 ⚠️ micro-interactions : seules celles du site agence sont observables (durées relevées en §3.1) ; celles des dashboards ne le sont pas
> - Étape 7 ❌ non faite — comparaison avec le frontend existant et plan de migration restent à faire

> Si tu es une instance de Claude avec un accès navigateur réel (Claude Code, Claude en Chrome, ou tout agent capable d'ouvrir des pages et de prendre des captures d'écran), **ne te contente pas des tokens estimés ci-dessus**. Cette première version a été produite sans accès pixel aux visuels — c'est un point de départ à vérifier, pas une vérité établie. Complète la méthode ainsi :

1. Ouvre dans le navigateur chacune des études de cas listées : `nixtio.com/cases/crextio`, `nixtio.com/cases/linkmatch`, `nixtio.com/cases/inputninja`, ainsi que `nixtio.com/cases` pour repérer d'autres réalisations pertinentes (dashboards, SaaS, plateformes métier).
2. Pour chaque écran clé (dashboard desktop, dashboard mobile, tableau de données, formulaire, modale, état vide, navigation), prends une capture d'écran réelle plutôt que de te fier à la description textuelle.
3. Inspecte le DOM/CSS quand c'est possible (devtools) pour lire les vraies valeurs : padding, gap, border-radius, box-shadow, line-height, tailles de police, couleurs exactes (hex/HSL). Ne les invente pas — si une valeur n'est pas mesurable, indique-le clairement plutôt que de l'estimer silencieusement.
4. Recoupe plusieurs écrans/projets avant de figer une valeur comme "règle" (cf. section 3 du brief original : une propriété vue une seule fois n'est pas un pattern).
5. Remplace les tokens de la section 3 de ce document par les valeurs réellement mesurées, en gardant la même structure (spacing / radius / typography / surfaces / motion), et documente les écarts avec la première estimation.
6. Observe les micro-interactions en conditions réelles (hover, focus, chargement, expansion/collapse) plutôt que de les déduire de screenshots statiques — note explicitement quand une animation n'est pas observable et reste alors une proposition cohérente, pas un fait constaté.
7. Une fois les tokens vérifiés, enchaîne sur les étapes 7 à 10 du brief original (comparaison avec le frontend gsms-plateforme existant, plan de migration, puis boucle implémentation → capture → revue visuelle → correction).

## 7. Prochaines étapes (non faites dans ce document)

1. **Comparer avec le frontend actuel de gsms-plateforme** — je n'ai pas pu cloner `samiriggui-code/gsms-school-aps` dans cet environnement (accès refusé / repo probablement redevenu privé). Il faudrait soit rendre le repo accessible temporairement, soit me coller directement le contenu du `tailwind.config` / des composants UI existants pour que je fasse un vrai diff "garder / modifier / remplacer".
2. **Screenshots réels** : si tu peux joindre 5–10 captures Crextio/LinkMatch/InputNinja (desktop + mobile + dashboard + formulaire), je peux affiner les valeurs de tokens avec une vraie mesure visuelle plutôt qu'une estimation de registre.
3. Une fois ces deux éléments réunis → plan de migration composant par composant, puis boucle implémentation → screenshot → revue visuelle → correction, comme demandé dans le brief.
