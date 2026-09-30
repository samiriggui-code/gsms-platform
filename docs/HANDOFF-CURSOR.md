# Handoff Cursor → Claude

Cursor écrit ici (nouvelle entrée datée **en haut**, ne pas écraser) : fin de chantier, question, blocage, décision à trancher. Claude surveille ce fichier en direct pendant la session et relaie à l'utilisateur.

---

## 2026-09-10 — CRM → signature Core / DocuLens (chrome)

Direction confirmée Samir : **CRM s’aligne sur Core/DocuLens**, pas l’inverse.

**Fait :**
- Tokens `@crm/ui` globals : papier chaud, primary bleu `#1a7df5`, radius 14px, `surface-subtle`, ombres soft (plus d’indigo Comp AI / radius 5px)
- Fonts app : **Manrope** + **DM Mono** (layout)
- Auth : split Core (`#111721` + card form), copy GSMS, plus de shader / trycomp.ai
- Header marque GSMS + blur ; rail `bg-surface-subtle`, active rounded-xl, i18n nav
- Pulse `#111721` / `rounded-[28px]` ; SoftPanel autour DataTables (EntityListShell) ; titres PageShell en `sr-only` sur listes / compliance / trust

**Pas touché :** Settings / Chat densité desk ; sidebar labellée type Core (rail icônes conservé) ; i18n colonnes tables.

---

## 2026-09-10 — CRM i18n FR/EN (démarrage)

Samir a demandé la traduction. Socle **next-intl** (ADR cookie, pas de préfixe URL) :

- `messages/fr.json` + `messages/en.json` (défaut **fr**)
- Cookie `NEXT_LOCALE` via `POST /api/locale` + switcher header
- Branché : rail, header, Companies / Contacts / Deals / Compliance / Trust / Overview pulse

**Reste :** colonnes DataTable, settings, chat, onboarding, toasts, `@crm/ui` labels.

---

## 2026-09-10 — CRM : design DocuLens étendu (desk-ui)

Samir a validé le look Compliance Desk et demandé de l’étendre aux autres pages CRM.

**Fait :**
- Primitives `components/desk-ui/` : `DeskPulseBand`, `SoftPanel`, `AccentActionPanel`, `EntityListShell`
- Compliance Desk refactoré pour consommer ces primitives
- Overview (`SalesDashboard` + panneaux summary), Companies / Contacts / Deals (pulse + soft panel autour DataTable), Trust Center

**Inchangé :** tRPC, DataTable, record sheets, @crm/ui APIs.

---

## 2026-09-10 — Tenant Core login UI (auth branded)

Samir a rejeté la carte login générique. Refonte :

- `AuthBrandedLayout` split (form + panneau pulse `#111721`) calqué InvoicePilot / Shell `ScanText`
- `LoginPage` : Card / Input / Button / Alert, toggle mdp, plus de credentials préremplis
- i18n FR/EN `login.panel*`

URL : `http://localhost:5190/login` — seed inchangé `client@demo.gsms.local` / `Demo!2026`.

---

## 2026-09-10 — Core `.env` P0 activé (local)

Samir a demandé l’activation. Fait localement :

- Clé CRM `tenant-core-bff` mintée (user `samir@global-it-ss.com`)
- `.env` Core : `CRM_API_*`, `BFF_PRESTATIONS_SOURCE=crm`, `BFF_LEGACY_MOCK=false`
- Mapping : Lyon → **EHPAD Test**, Paris → **Acme Smoke**
- Re-seed `tenant_core` OK (`client@demo.gsms.local`)

Prérequis runtime : CRM API `:3001` up + restart Core API pour recharger l’env.

---

## 2026-09-10 — P0 branché : prestations BFF → CRM

GO Samir. Implémenté (code) :

- `Workspace.crmCompanyId` (Prisma) + seed `CRM_COMPANY_ID_LYON|PARIS`
- Adapter `server/lib/crm/*` (`x-api-key` → `/rest/companies/{id}` + `/rest/deals/{id}`)
- Mapping DealStage → statut portail ; kind inféré du libellé
- BFF `dashboard` / `prestations` / `prestations/:id` via CRM si `CRM_API_KEY` (ou `BFF_PRESTATIONS_SOURCE=crm`)
- Docs/échanges/finance : vides si CRM (sauf `BFF_LEGACY_MOCK=true`)
- Env documenté dans `.env.example`

**À faire côté machine** : `prisma db push` + renseigner `CRM_API_KEY` + `crmCompanyId` (re-seed) + CRM up `:3001`.

---

## 2026-09-10 — Plan : virer mocks Core → vraie tuyauterie BFF

Demande Samir : supprimer mocks / hardcode, brancher le réel. Doctrine inchangée (pas de fusion, HTTP only).

**SOV cible** : Core = identité/workspace · CRM = prestations/finance · Desk = documents/échanges pièces · Grace/QAtrial = enrichissement plaquette (P2).

**Gaps bloquants** : Desk/DocuLens pas sur disque · pas de Quote/Invoice CRM · Deal sans `workspace_id` ni mapping PRECOM/AUDIT · PDF ASCII BFF redondant avec @react-pdf.

Plan détaillé dans le chat Cursor (P0 prestations CRM → P1 Desk docs → P2 finance + findings). Attente GO avant code.

---

## 2026-09-09 — Pause Core (reprise demain)

Samir stoppe le chantier tenant-core pour ce soir. Dernier état : plaquette React + PDF `@react-pdf/renderer` sur `/finance/$id`, mocks `plaquette` enrichis, signature devis. À reprendre demain côté polish / suite métier si besoin.

---

## 2026-09-09 — Plaquette React → PDF (@react-pdf)

Pas d’attente Grace/QAtrial. Plaquette portail = composant React structuré (contexte, analyse démo, lignes, livrables, conditions, signature) + PDF généré avec `@react-pdf/renderer` (même structure). `plaquette` enrichi dans le mock BFF ; note `sourceNote` pour le futur handoff analyses.

---

## 2026-09-09 — Finance : fiche devis/facture + PDF + signature

Manquait la suite métier (pas juste la liste). Ajout :

- Route `/finance/$id` (`FinanceDetailPage`) : plaquette HTML (lignes), iframe PDF, panneau « prestation accompagnée », CTA signature devis / note paiement facture
- BFF : `GET /finance/:id`, `GET /finance/:id/pdf`, `POST /finance/:id/sign` (+ mock lignes, référence, signedAt)
- Liste Finance + onglet finance prestation → lien vers la fiche document
- i18n `financeDetail.*` / `pages.financeDetail`

---

## 2026-09-09 — Finance : refonte Accueil/Prestations

`FinancePage` n’est plus une table nue. 4 KPI (à signer / à payer / montant en attente / traité), filtres, liste|tableau, grille 2 col (attention + répartition + next). i18n FR/EN enrichi.

---

## 2026-09-09 — Accueil : pulse → 4 cards d’état

Bandeau `WorkspacePulse` retiré. Remplacé par `WorkspaceStatusCards` : 4 KPI cliquables (prestations actives, pièces à fournir, devis à signer, livrables) à partir de `dashboard.counts`. Grille 2 colonnes inchangée en dessous.

---

## 2026-09-09 — Prestations : pattern pulse + grille Desk

Refonte liste + fiche (plus de table nue) sur le langage Accueil / WorkspacePulse :

- `PrestationsPage` : pulse sombre, filtres, bascule liste/tableau, grille `xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.72fr)]`, attention + répartition types + next steps
- `PrestationDetailPage` : hero mission, readiness, onglets + panneau latéral (attention / fiche / next)
- i18n FR/EN enrichi (`prestations.*`, `prestationDetail.*`)

---

## 2026-09-09 — Core i18n : pages restantes (complet)

Toutes les routes + StatusPill + notifs + ThemeToggle branchées FR/EN.
Clés ajoutées : `documents.*`, `prestations.*`, `echanges.*`, `finance.*`, `prestationDetail.*`, `profile.*`, `settingsPages.*`, `notifications.*`, `status.*`, `theme.*`.

---

## 2026-09-09 — Tenant Core i18n FR/EN

- `i18next` + `react-i18next` + detector ; locales `src/i18n/locales/{fr,en}/common.json`
- Storage key `gsms-portal-lang` ; LanguageSwitcher → `changeLanguage`
- Traduit : Shell, Login (+ flag), Accueil/dashboard, Paramètres layout, upload via i18n, rôles/permissions
- Pages listes (Documents/…) encore FR hardcodé — à étendre au fil

---

## 2026-09-09 — Headers compact + flags + Settings Desk sidebar

- **Core** `:5190` : header `h-12`, bouton Upload retiré (reste « Déposer » sidebar), `LanguageSwitcher` drapeaux FR/US
- **Desk** `:5173` : header `h-12`, bouton Téléverser topbar retiré (garde modal via sidebar +), Settings avec sidebar interne (GSMS / Taxonomie / Persona / Rôles / Avancé)

---

## 2026-09-09 — Tenant Core `components/ui` : kit shadcn (23 fichiers)

Avant : 6 primitives (button/badge/card/input/label/textarea).
Après : + accordion, alert, avatar, checkbox, dialog, dropdown-menu, popover, progress, scroll-area, select, separator, sheet, skeleton, switch, table, tabs, tooltip + barrel `index.ts`.
Deps : Radix + `clsx` / `tailwind-merge` ; `cn()` aligné InvoicePilot ; tokens `--popover`.
Pattern copié InvoicePilot, tokens Desk. Pas de package UI partagé.

---

## 2026-09-09 — Accueil 2 colonnes : bug Tailwind v4 (virgules)

- Cause : `lg:grid-cols-[minmax(0,1.45fr),minmax(...)]` — virgules → classe **ignorée** (reste 1 col même à 1440px)
- Fix : underscores `xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.72fr)]` + même correction Pulse / ContinueWorking
- Vérifié CDP : avant `cols: 1118px` ; après 2 tracks côté à côté

---

## 2026-09-09 — Paramètres : sidebar interne (QAtrial SettingsLayout)

- Layout `/parametres` + nav Sites / Équipe / Notifications
- Redirect `/parametres` → `/parametres/sites`

---

- Manquait le panneau bas-gauche « Disponibilité » (CoveragePanel Intake)
- Grille `lg:grid-cols-[1.45fr,0.72fr]` : Continuer + Disponibilité | Interroger + À traiter

---

- Documents / Échanges / Devis & factures / Prestations : vraies `<table>` colonnes (plus de piles de cards)
- Composant `PortalDataTable` réutilisable

---

- `DocumentUploadForm.tsx` = structure Desk (dropzone, file d’attente, docType, metadata JSON, badges)
- UI primitives Desk copiées (`button`/`card`/`badge`/`input`/`label`/`textarea`)
- Chaînes FR Desk dans `i18n/upload.fr.ts` ; modal = pattern `App.tsx` Desk
- Adapter `uploadApi.uploadDocument` → BFF mock

---

- Erreur : j’avais mis des actions page dans le slot topbar DocuLens (réservé à Upload global)
- Topbar = Upload fixe ; photo à côté de l’avatar ; MDP dans Sécurité ; Inviter dans Équipe
- `PageHeaderActions` supprimé

---

## 2026-09-09 — Portail Profil / Paramètres complétés (feedback Samir)

- **Profil** (`5190/profil`) : avatar (upload localStorage), permissions par rôle, sessions (démo + révoquer), sécurité MDP/2FA (UI)
- **Paramètres** (`5190/parametres`) : clarifié — Sites / Équipe / Notifications ; plus de jargon `workspace_id` ni lien OpenAPI client
- Partagé : `UserAvatar`, `lib/roles.ts`
- Auth réelle (sessions serveur, 2FA, invite) toujours à brancher

---

## 2026-09-09 — Desk `/app/settings` → GSMS opérateur (+ carte vs portail)

- Settings Desk réordonnée : intro GSMS → taxonomie → profils → rôles → **Avancé** (API/curl/snapshot replié)
- Bug fix : `PERSONA_CONFIG` fantôme → `getPersonaConfig(t)` + clés `persona.*` FR/EN
- Doc : `gsms-core/docs/DESK_VS_PORTAL_SETTINGS.md` (5173 settings ≠ 5190 parametres)
- Portail Paramètres + OpenAPI déjà en place ; **reste** : brancher vrais CRM/Desk sur BFF mocks

---

## 2026-09-09 — Tenant Core OpenAPI minimale + members

- Spec : `apps/tenant-core/openapi/openapi.json` + doc `gsms-core/docs/TENANT_CORE_OPENAPI.md`
- Servie : `GET /api/openapi.json`, UI Swagger `http://localhost:3090/api/docs`
- Nouveau : `GET /api/members` (org de la session) ; Paramètres affiche la liste
- Couvre session / workspaces / members / BFF mock

---

## 2026-09-09 — Tenant Core : 7 écrans + fiche prestation (mocks BFF)

Shell + Accueil déjà OK. Suite PORTAIL_CLIENT_IA_V1 :
- BFF mocks partagés `server/lib/mock-data.ts` + routes prestations/docs/échanges/finance
- Pages : Prestations, `/prestations/$id` (onglets synthèse/docs/échanges/finance), Documents, Échanges, Finance, Profil, Paramètres
- Accueil « Continuer » → fiche prestation
Pas encore de vrai CRM/Desk.

---

## 2026-09-09 — Tenant Core : notifications (pattern DocuLens)

Porté dans `apps/tenant-core` : store zustand + `NotificationBell` / `Center` / `Toaster` (look DocuLens, copy FR GSMS). Branché dans `Shell`. Seed démo session (pièces / devis / échanges). Pas de poll API events DocuLens.

---

## 2026-09-09 — Tenant Core = **un seul package** (Postgres)

Correction : pas 2 apps. `apps/client-portal` supprimé.
`apps/tenant-core` = Hono + Vite + **Prisma/Postgres** (comme QAtrial).

Setup : `bun install && bun run setup && bun run dev`
Ports : API 3090 · UI 5190 · seed `client@demo.gsms.local` / `Demo!2026`

---

## 2026-09-09 — Stack Tenant Core + Portail (choix C)

Doc : `gsms-core/docs/STACK_TENANT_PORTAIL.md`

**Recommandation :**
- **Tenant Core** = Hono + Prisma + Postgres + Bun
- **Portail** = Vite + React 19 + TanStack Router + TW4
- BFF agrégation sur le Core ; Desk=FastAPI, CRM=Nest inchangés
- Ne pas étendre InvoicePilot comme noyau (shell UI ok à copier)

---

## 2026-09-09 — Portail client IA v1 figée (menu + sites)

### Décision produit
Doc : `gsms-core/docs/PORTAIL_CLIENT_IA_V1.md`

- **1 site** = pas de sélecteur ; **N sites** = switch `workspace_id` (pas de fusion globale des docs)
- Menu v1 (7) : Accueil · Prestations · Documents · Échanges · Devis & factures · Profil · Paramètres
- Fiche prestation = cœur (synthèse / docs / échanges / finance)
- Core = identité + workspace ; CRM = prestations/finance ; Desk = docs

### Suite
OpenAPI Tenant Core minimale (`gsms-core/docs/TENANT_CORE_OPENAPI.md`, `apps/tenant-core/openapi/openapi.json`, UI `/api/docs`) + shell portail ; Desk P0 UUID inchangé.

---

## 2026-09-09 — Coordination `workspace_id` Desk ↔ portail

### Question Claude
Forme concrète `workspace_id` déjà arrêtée côté portail (colonnes, clients/establishments, convention ID) ? Sinon P0 Desk en UUID simple + migrate plus tard.

### Réponse Cursor
**Pas figé côté portail.** Principe seul dans `ARCHITECTURE-3-SURFACES.md`.

**GO P0 Desk :** `workspace_id` = **UUID opaque** (string), 1 workspace = 1 couple logique client+établissement, NOT NULL sur docs, exigé sur API. Pas d’inventer un second schéma establishment obligatoire en parallèle.

Doc : `gsms-core/docs/WORKSPACE_ID_CONTRACT.md`

---

## 2026-09-09 — Découpe SD pour portail GSMS (garder / off / temps)

### Question Samir
Récupérer seulement ce qui intéresse le portail GSMS, désactiver le reste, dashboard core + MCP/API décortiqués — possible ? combien de temps ?

### Réponse (doc)
`gsms-core/docs/SIMPLER_GSMS_DECOUPE_PORTAIL.md`

### Synthèse
- **Soft off** (entitlements/flags déjà dans SD) : **2–5 j** — UI allégée, monolithe toujours lourd
- **POC dashboard core + whitelist MCP** : **3–6 sem**
- **Hard strip fork** : **3–6 mois+**
- API/MCP : whitelist possible ; extraction gateway propre = long
- Décision ouverte : POC soft-off SD **vs** portail neuf + patterns seulement

---

## 2026-09-09 — SimplerDevelopment : clone + boot local + évaluation GSMS

### Fait
- Clone intact : `gsms-core/upstream/simpler-development` (Apache-2.0)
- **Pas de Docker** — `bun install` + `setup --local` + Postgres Laragon+pgvector + `bun dev`
- App live : `http://localhost:3000` (admin `/admin/login`, portal `/portal/login`)
- Doc : `gsms-core/docs/SIMPLER_GSMS_EVALUATION.md`
- Inventaire code : agent [Inventory SimplerDevelopment stack](3290a56d-cb55-4e81-82cf-617070d9775e)

### Verdict (pour Claude / Samir)
**Non** comme socle unique / remplacement Camp AI. **Oui** comme upstream d’étude (tenancy app-level, MCP 482 tools, portail riche). Doctrine 3 surfaces inchangée.

### Runtime observé (laptop)
- Cold compile 1re page ~30–50 s ; process ~1,4 Go RSS
- S3/MinIO/realtime/Mastra non démarrés (uploads hors scope de ce boot)

---

## 2026-09-09 — Compliance Desk UI dans Camp AI (patterns DocuLens)

### Fait
- Module `apps/crm/apps/app/components/compliance-desk/` : WorkspacePulse, DocumentRow, UploadDropzone, PhaseActions (Ingest/Digest manuels)
- Route rail **Compliance** → `/[slug]/compliance`
- Attribution MIT DocuLens dans `ATTRIBUTION.md`
- Données démo ; API DocuLens non branchée

### Principe
Coque CRM conserve @crm/ui ; on porte les **sections** DocuLens, pas l’app entière.

---

## 2026-09-08 — 3 surfaces + choix front Camp AI

### Décisions
- Phases **pilotées** : Upload → Ingest(humain) → Digest(humain) → Baseline → Prepare
- `MAX_HEAVY_JOBS=2` ; isolation `workspace_id` (pas SaaS MT Day-1)
- **Coque BO** = `apps/crm/apps/app` (Comp/Camp AI CRM Next)
- **Desk** = DocuLens frontend
- **Portail client** = surface séparée (base candidate InvoicePilot `_app`)
- Ne pas fusionner commercial dans DocuLens ni Ingest dans CRM

### Docs
- `gsms-core/docs/ARCHITECTURE-3-SURFACES.md`
- Canvas `gsms-three-surfaces-fronts`
- Plan DocuLens P0 mis à jour (ingest manuel)

---

## 2026-09-08 — Plan adaptation DocuLens → Intake

### Livrables
- Canvas `canvases/doculens-adaptation-plan.canvas.tsx`
- Doc `gsms-core/docs/PLAN-ADAPTATION-DOCULENS.md`

### Synthèse phases
- **P0** fork DocuLens + MinIO + labels GSMS
- **P1** DocumentVersion + ExtractedField + review humaine
- **P2** LegacyRecord/Baseline + patterns AuditPilot (coverage/gap)
- **P3** timeline/contradictions clean-room (Sound Suite idées)
- **P4** ponts CRM / Grace / QAtrial

### Règle
DocuLens first ; Apache AuditPilot ciblé ; STOP copy Sound Suite / dms / AI Doc.

---

## 2026-09-08 — gsms-core upstream hors DocuLens (Cursor)

Pendant que Claude lance DocuLens : inventaire local `gsms-core/upstream/{auditpilot,soundsuite,dms-app,ai-document-intelligence}`.

### Verdict
- **AuditPilot** Apache-2.0 → récupérer patterns Evidence→Coverage→Gap→CAPA (pas le domaine ISO)
- **Sound Suite** PolyForm NC → STOP code ; idées timeline/contradictions clean-room
- **dms-app** + **AI Doc** → pas de LICENSE → study only (MinIO/version/workflow ; field confidence)

### Artefacts
- Canvas `canvases/gsms-core-upstream-others.canvas.tsx`
- Note `gsms-core/docs/UPSTREAM-AUTRES-ANALYSE-CURSOR.md`

### Règle
DocuLens first ; n’importer AuditPilot qu’après liste des trous DocuLens.

---

## 2026-09-08 — Mission Intake : inventaire factuel + frontière

### Livrable
Canvas `canvases/gsms-intake-frontier-analysis.canvas.tsx` — inventaire CRM/Grace/QAtrial, matrice objets, mapping Intake→moteurs, workflows, reco réutiliser/adapter/créer.

### Verdict frontière
- **CRM** : client, Deal/mission commerciale, relances, UI validation, opportunités post-baseline — **pas** conformité.
- **Intake (à créer)** : chaos docs → timeline → baseline → reco prestation → dossiers préparés — **prestation facturable**.
- **Grace** : Assessment/surveys/export findings/précom — **pas** ingest historique.
- **QAtrial** : Requirement/CAPA/Evidence/AuditRecord — **pas** handoff Grace in, pas Commission/Prescription.

### Core P0
Establishment, LegacyRecord, ComplianceBaseline, Prescription, Intervention, SafetyCommission.

### Pas de code
Analyse seule ; GO produit requis avant contrats API / spike.

---

## 2026-09-08 — Analyse Deemply → Compliance Core (décision architecture)

### Verdict
Absorber le **modèle** Deemply (obligation → contrôle → constat → intervention → preuve → levée → renew), pas le produit. Registre / dossier commission / PDF = **vues**. Gap majeur : objet `SAFETY_COMMISSION` + readiness + Prescription/Intervention first-class.

### Conflit doctrine
Note place **QAtrial = moteur audit**. Repo : **Grace = terrain**, QAtrial = CAPA/post. Proposition à trancher : QAtrial = Compliance Core (état vivant) ; Grace = capture terrain.

### Artefact
Canvas `canvases/deemply-gsms-compliance-core.canvas.tsx`. Suite recommandée : étude DUERP Deemply pour valider le modèle générique.

### À ne pas faire
Coder un « registre incendie » isolé / N moteurs par domaine.

---

## 2026-09-08 — Page Profil Metronic-style

### Fait
- Nouvelle route `/app/settings/profile` (`SettingsProfilePage`) : cover media, avatar, onglets Aperçu / Avatar / Session
- Nav Paramètres : **Profil** en premier ; menu avatar header → profil
- Général allégé (plus de bloc profil)
- Réf. visuelle : Metronic demo1 [user detail](https://keenthemes.com/metronic/tailwind/nextjs/demo1/user-management/users/…) / [users list](https://keenthemes.com/metronic/tailwind/nextjs/demo1/user-management/users) — layout détail user adapté au **profil courant** (pas de CRUD users)

---

## 2026-09-08 — Pack `public/media` branché (flags + avatars)

### Fait
- `LanguageMenu` → `/media/flags/france.svg` + `united-states.svg` (plus de SVG inline)
- Profil Général : grille **avatars pack** (`/media/avatars/gray/*` + `300-1…24`) + upload photo
- Helper `src/lib/media.ts` pour chemins stables

---

## 2026-09-08 — Avatar upload + flags SVG + theme toggle header

### Fait (QAtrial)
- **Profil / Général** : upload photo avatar (recadrage carré JPEG local, persist `qatrial:user-prefs`) + Retirer
- **Header** : drapeaux SVG FR/US (`LanguageMenu`), switch clair/sombre (`ThemeToggle` + `useThemeStore` light|dark), avatar photo dans le menu user
- Avatar stocké en data-URL côté client (pas d’API serveur pour l’instant)

---

## 2026-09-08 — Langue header + profil + carto email/PDF/signature

### Fait UI QAtrial
- Langue sortie de Paramètres → icône **drapeau** header (notifs / user)
- Nav Paramètres : **Profil** + **Signature électronique** (doc du flux existant)
- Général : plus de sélecteur langue

### État stack
| Capacité | Grace | CRM | QAtrial |
|----------|-------|-----|---------|
| SMTP outbound | nodemailer non branché | aucun (Gmail inbound only) | aucun |
| react-email | non | non | non |
| PDF réel | Puppeteer | non | print navigateur |
| Signature e- | — | — | oui `POST /api/signatures` |

### Décision email
**Pas de package partagé** (doctrine). Brancher QAtrial en local : `SMTP_*` + nodemailer + react-email sous `apps/qatrial/server`. Option future : micro-service mail HTTP commun (contrat API), sans partager node_modules. PDF : copier pattern Grace Puppeteer en local.

---

## 2026-09-08 — HOTFIX freeze ouverture dossier « test »

**Bug :** clic dossier → UI figée. Causes croisées :
1. Graphe : boucle ResizeObserver ↔ fitView + centaines d’arêtes smoothstep
2. Switch dossier : anciennes exigences/tests restaient affichés pendant le fetch

**Fix :** fitView uniquement au load/Arrange ; arêtes masquées si >80 sans sélection ; clear immédiat stores + hooks API au change de `projectId`.

---


**Demande Samir :** pas du bricolage — affichage moderne par volet.

**Fait (kit local Card / CardHeader / KPICard / EmptyState / DataTable / Btn2 / Pill) :**
- **Compliance** — KPI + anneau + indicateurs ; signature hors score (N/A)
- **Gap analysis** — densifié (même onglet)
- **Risk** — KPI + grille 5×5 (zones, plus seule diagonale) + détail latéral
- **Evidence** — KPI + DataTable
- **CAPA** — KPI + file densifiée + EmptyState
- **ISO 13485** — KPI + accordéons densifiés

---

## 2026-09-08 — Graphe traçabilité PAYSAGE + race dossier

**Graphe :** pack plafonnait les colonnes à la largeur panneau → tour portrait (minimap en « I »). Remplacé par peu de lignes (hauteur) + étalement en colonnes (panorama). fitView borné pour rester lisible.

**Dossier :** sur `/app/projects/:id` l’URL gagne sur le store (évite réécriture du dernier dossier → spinner).

---

## 2026-09-08 — HOTFIX ouverture dossier QAtrial

**Bug :** clic dossier → spinner / bounce. Cause : `shellLoading` incluait fetch exigences+tests → ShellLayout démontait l’Outlet ; ProjectScopeLayout redirigeait vers Accueil.

**Fix :** bloquer shell seulement sur liste dossiers ; redirect inconnu → `/app/projects`.

---

**Cause :** sélection nœud → rebuild layout + fitView en boucle → UI figée.

**Fix :** layout découplé du focus ; dim sans fitView ; tooltips CSS retirés (title natif) ; overflow-hidden sur le canvas.

---

Suite [Audit dashboard volets UI](11268024-2414-4c58-ae46-473699d0323b) :

- **Tendances** : ChartCard / Bar / Pie hifi (fini Recharts brut)
- **Prédictif** : Card / KPI / Pill / EmptyState / barre chart top risques ; erreurs API visibles
- **UUID → codes** : Evidence, Risk détail, CAPA, ISO matched
- **FilterBar** densifié + chrome onglets Évaluation

Reste (plus tard) : RiskMatrix coords diagonales, ComplianceReadiness signature 0 %, DataTable Evidence/Gap.

---

**Samir :** pas en longueur / collé Tetris ; exploiter surface ; infobulles pour comprendre.

**Fait :** grille largeur-first, gaps dynamiques (aération), bandeau « comment lire », hover tip + panneau détail.

---

**Samir :** pas exig. | tests en largeur — interposer / empiler, relations claires, dynamique.

**Fait :** composantes connexes = cadres ; nœuds exig+test **mélangés** en grille 2D ; clusters wrappent sur le canvas ; arêtes = couverture colorée.

---

**Samir :** pas une tour — pas assez de place pour tout voir en hauteur.

**Fait :** layout lane horizontale (gauche→droite, wrap), max 4 rangées / groupe ; s’étale en largeur + pan/zoom.

---

**Samir :** graphe « en longueur » insuffisant ; dashboard en bas de menu ; ouverture dossier doit atterrir sur l’état du dossier.

**Décision :** d’accord — Évaluation = landing dossier.

**Fait :**
- Clic dossier / `/projects/:id` → **Évaluation** (`dashboard`) ; hub MenuCard déplacé sur `/hub` (« Domaines »)
- Nav qualité : **Évaluation → Exigences → Tests**
- Graph refait : groupes nestés Exigences|Tests, ports 4 côtés, barycentre anti-croisement, Arrange, données live stores dossier (pas de mock)

---

**Samir :** « et ce mode là tu ne l’as pas mis pk ?? » (Graph Relationships Grace).

**Fait :**
- Onglets **Graph | Matrix** sur la traçabilité
- Vue Graph React Flow (`@xyflow/react`) : exigences ← → tests, arêtes colorées par statut, légende, minimap
- Défaut = Graph (comme Grace : graphe = vue canonique)

---

**Samir :** plus de couleurs donuts / step couverture ; matrice type Grace (explicite).

**Fait (copie idées UI Grace, zéro import croisé) :**
- `CoverageCard` : % gros + barre à paliers + chips couvertes/orphelines
- `CHART_COLORS` plus vifs ; 2 donuts (exigences + tests)
- `TraceabilityMatrix` : résumé stats, filtres Sans test / Orphelins / search, en-têtes **verticaux** TST-xxx, pastilles cercle accent, légende statut

---

**Samir :** charts/tables trop simples ; wizard à adapter (couleurs, plein espace layout) ; élargir hifi.

**Fait :**
- Kit `hifi/` : **DataTable**, **Chart** (pie/bar/line), **Dialog**, **Sonner**, **EmptyState**, Button=Btn2, KPI existant
- `StatusChart` + `PortfolioPage` branchés dessus
- **SetupWizard** : header sticky + progress, Card max-w-5xl, `bleed` shell (pas de breadcrumb / padding), reste dans topbar+sidebar
- ConfirmDialog → Btn2 hifi

---

**Samir :** dark mode cyan fait mal ; couleurs landing ; une typo ; sidebar trop grosse.

**Fait :**
- Mode sombre **coupé** (store forcé light, toggle retiré settings/auth, `.dark` neutre)
- Accent landing `#4f56e5` (plus de `#009ef7`)
- **Inter** seule (sans / mono / serif / headings)
- Sidebar palier 1 : `11.5px`, icônes 3.5

---

## 2026-09-08 — Hors périmètre → menu principal (décision)

**Règle tranchée :**
- **Menu principal** = pas de `projectId` unique → Accueil : Dossiers, Systèmes, Fournisseurs, Formation, Tâches, KPI, **Formulaires**, **Flux de travail**, **Rapports planifiés**, Paramètres
- **Menu dossier** = données du dossier → qualité / conformité / documents / réclamations / **Rapports** (génération VSR…)

**Aussi :** cards Accueil sans puces ; Paramètres plus en double (pied sidebar seulement en mode dossier).

---

## 2026-09-08 — Sidebar XOR + breadcrumb + couleurs CRM

**Samir :** au clic dossier, palier 1 laisse place au palier 2 ; bouton Accueil / breadcrumb ; moins de couleurs (vitrine CRM).

**Fait :**
- Sidebar **XOR** : hors dossier = Accueil+sections ; dans dossier = menu dossier + **← Accueil**
- `AppBreadcrumb` sur chaque page (contenu)
- MenuCards **monochrome** : neutres + accent `#4f56e5` (= `--primary` CRM globals.css) — plus de rainbow

---

## 2026-09-08 — Accueil MenuCards + sidebar (fix “moche sans sidebar”)

**Samir :** sans sidebar c’est moche ; pas de division hubs inutiles ; clés i18n brutes.

**Fait :**
- Sidebar **toujours** visible (Accueil + 6 sections 1er palier)
- Accueil = **6 MenuCards** (Dossiers, Systèmes, Fournisseurs, Formation, Tâches, KPI) — libellés FR en dur
- Dans un dossier : sidebar ajoute domaines / feuilles
- ProjectChrome retiré du shell (sidebar suffit)

Hard refresh `/app/accueil`.

---

## 2026-09-08 — QAtrial MenuCard hubs (pattern gsms-school)

**Samir GO** après analyse MenuCard school.

**Canon :** [`docs/QATRIAL-VUES-MENUCARD.md`](./QATRIAL-VUES-MENUCARD.md)

**Livré :**
- Accueil `/app/accueil` (DEFAULT) — cards Dossiers / Référentiels / Pilotage
- Hubs `/app/referentiels`, `/app/pilotage`
- Hub dossier `/app/projects/:id` → domaines → `/domains/:id` → feuilles
- `MenuCard` local (`components/hub/`) — pas d’import school
- Top minimal (Accueil) ; ProjectChrome = fil d’Ariane seul
- Ouvrir un dossier → hub domaines (plus dashboard direct)

Hard refresh `:5174` → `/app/accueil`.

---

## 2026-09-08 — Diagnostic 3 couches nav + concept GitHub/Vercel

**Samir** a fourni une capture (3 zones encerclées) : confusion totale.

**Preuve :** `docs/qatrial-nav-confusion-3-layers.png` + [`docs/QATRIAL-NAV-DIAGNOSTIC.md`](./QATRIAL-NAV-DIAGNOSTIC.md)

| # | Capture | Nature |
|---|---------|--------|
| 1 | Top Dossiers\|Tâches\|KPI\|… | Peers faux — outils org ≠ workspace |
| 2 | Onglets Vue/Conformité/Prédictif | Sous-vues **page** Évaluation |
| 3 | Sidebar Exigences/Tests/… | Menu dossier |

**Concept appliqué :**
- Top minimal : Dossiers + dropdown **Référentiels**
- Dossier ouvert : `ProjectChrome` (pas de sidebar)
- Évaluation : chips « Vues de cette page » (plus barre nav-like)

Hard refresh `:5174` si l’ancienne UI (3 barres) reste en cache.

---

## 2026-09-08 — Nav QAtrial : palier 1 = topbar horizontale, palier 2 = sidebar dossier

**Samir :** palier supérieur en largeur en haut ; menu 2ᵉ palier seulement après sélection d’un dossier.

**Fait :**
- `Topbar` : 2ᵉ rangée NavLink — Dossiers + tâches/KPI/systèmes/fournisseurs/formation
- `ShellLayout` : `Sidebar` montée **uniquement** si `isProjectScopePath`
- `Sidebar` = outils du dossier ouvert (plus de doublon Dossiers)
- Référentiel §2 mis à jour

---

## 2026-09-08 — Référentiel QAtrial + workspace = table Dossiers

**Samir :** ne comprenait pas l’arbo (Dossiers vs « Espace de travail ») — demande un référentiel.

**Fait :**
- Canon : [`docs/QATRIAL-REFERENTIEL.md`](./QATRIAL-REFERENTIEL.md) — 2 paliers, glossaire, chaque page expliquée
- Nav : « Espace de travail » → **Outils transverses** (replié par défaut) ; le **workspace = `/app/projects`**
- `PortfolioPage` : **table** (dossier / état / avancement / exigences / tests / déviations / ouvrir)

---

## 2026-09-08 — QAtrial hiérarchie : 5 écrans remontés en GLOBAL (+ onglet Portefeuille retiré)

**Samir GO** après triage canvas `qatrial-hierarchy-triage`.

**Fait :**
- `GLOBAL_NAV_GROUPS` : tasks, kpi, systems, suppliers, training → `/app/:slug`
- `PROJECT_NAV_GROUPS` : reste sous `/app/projects/:id/...`
- Sidebar / MobileNav : section **Espace de travail** toujours visible ; nav projet **uniquement** dans un dossier
- Redirects `/app/projects/:id/{systems|suppliers|training|tasks|kpi}` → `/app/...`
- Dashboard : onglet **Portefeuille** retiré (doublon `PortfolioPage`)
- i18n `nav.groups.workspace` FR/EN
- `tsc --noEmit` OK

**Pas encore :** Forms / Workflows / Scheduled reports (MIXTE) · Import-export + Audit trail settings · Prédictif scindé.

---

## 2026-09-08 — Triage hiérarchie QAtrial (global vs projet)

**Samir :** étape 3 a mis les URLs sous projet, mais n’a pas trié le contenu — tout paraît mélangé.

**Verdict (scope données, pas libellés nav) :**

| Niveau juste | Écrans |
|---|---|
| **PROJET** (garder) | exigences, tests, change-control, déviations, audits, impact, documents, réclamations, rapports + la plupart des onglets dashboard |
| **GLOBAL mal monté sous `:id`** | systèmes, fournisseurs, formation, tâches, KPI |
| **MIXTE à scinder** | dashboard (onglet Portefeuille + prédictif partiel), forms, workflows, scheduled-reports, settings import-export / audit-trail / team (partiel) |
| **GLOBAL OK** | `/app/projects` (PortfolioPage), settings général/IA/webhooks/intégrations/SSO |

**Canvas :** `qatrial-hierarchy-triage.canvas.tsx`

**Pas encore codé** — attendre GO Samir pour remonter les 5 org-wide hors `ProjectScopeLayout`.

---

## 2026-09-08 — QAtrial relancé local (smoke)

**Samir GO** après bilan refonte 0→7.

| | |
|--|--|
| API | `tsx --env-file=.env server/index.ts` → `:3001` · `GET /api/health` **200** |
| Front | Vite `:5174` · `/` **200** |

Stack locale OK pour smoke manuel `/app/projects`.

---

## 2026-09-08 — Cursor **stand-down** front CRM (conflit avec Claude)

**Samir :** Claude travaille déjà sur le front CRM — risque de conflit.

**Cursor :** plus d’edit / install / restart sur `apps/crm` landing tant que Claude n’a pas fini. Lead front CRM = **Claude** jusqu’à GO contraire.

**Vu disque :** fichiers hors portage Cursor (`hero-panel`, `trust-band`, `landing-nav-menu`) + mtimes landing après le chantier Cursor. `:3000` UP, API `:3002` DOWN.

---

## 2026-09-07 — Landing CRM = vitrine GSMS (InvoicePilot **conservé**)

**Samir :** ne pas supprimer InvoicePilot tant que la landing CRM n’est pas adaptée.

**Fait :**
- Copy GSMS porté dans `apps/crm/apps/app/components/landing/*` (Hero, Parcours, Savoir-faire, Environnements, Offres, CTA, Footer)
- Wordmark **GSMS** · `IS_MARKETING=true`
- Page `/demande?type=audit|ao|contact` + proxy Next `POST /api/gsms-intake` → API public CRM
- Proxy marketing : `/` et `/demande` publics

**Pas fait :** delete InvoicePilot · clés `GSMS_PUBLIC_API_KEY` à vérifier pour l’intake live

**Stack cible inchangée :** CRM + Grace + QAtrial + tender/MCP + MinIO + tencent — sans cockpit InvoicePilot une fois la bascule OK.

---

## 2026-09-07 — Décision Samir : **sortir InvoicePilot** de la stack

**Intent :** plus de vitrine/cockpit InvoicePilot. Vitrine = landing CRM (`IS_MARKETING` + copy GSMS). Intake client (devis/contact) → CRM public API. Pas de « cockpit » exposé au client.

**Stack cible (nommée) :**
| Garde | Rôle |
|-------|------|
| `apps/crm` Comp AI | vitrine + CRM (contacts / devis / deals) + Eve |
| `apps/grace` | GRC / circuit |
| `apps/qatrial` | qualité / conformité |
| `mcp-tenders` + `tenderai-mcp-server-max` | AO / veille |
| MinIO + tencent-memory (NUC) | stockage / mémoire |
| (AO search) tenderai — « trend » = tender côté Samir |

**À faire (pas encore exécuté) :** GO explicite pour `rm` `apps/InvoicePilot-AI` + purge docs/DNS/refs. Adapter landing CRM avant ou après delete.

---

## 2026-09-07 — CRM (`apps/crm`) deps réinstallées + démarrage local

**App :** Comp AI CRM / Eve (`apps/crm`), pas InvoicePilot.

| Fait | |
|------|--|
| `node_modules` wipe + `bun install` | **2296** packages OK (~5 min) |
| `bun run db:generate` | Prisma Client 7.9.1 OK |
| DB locale `crm` | déjà **57** tables — pas de `db:push` (évité : shell avait `DATABASE_URL=qatrial`) |
| Dev | API Nest **:3002** + Next **:3000** (**:3001** = gsms-school) ; agent Eve non lancé |
| Smoke | API `listening` + DB connected ; Next Ready |

**Lancer plus tard :** depuis `apps/crm`, sans `DATABASE_URL` qatrial dans le shell :
`PORT=3002` sur `apps/api` · `bun run dev -p 3000` sur `apps/app` avec `API_URL`/`NEXT_PUBLIC_API_URL=http://localhost:3002`.

---

## 2026-09-07 — VPS : Comp AI GRC **supprimé complètement** (Samir GO)

**SSH `hostinger` (`187.77.166.124`).** Uniquement Comp GRC.

| Fait | |
|------|--|
| Compose `down -v` | `gsms-comp-{app,api,postgres}` + network + volume `comp_gsms_comp_pg` |
| Image | `gsms-comp-app:dev` deleted |
| Code | `/opt/gsms/comp` **rm -rf** (~3.7G) |

**Intact :** CRM, Grace, QAtrial, MinIO, tenderai, tencent-memory.  
**DNS** `comp.global-it-ss.com` → encore VPS mais service mort (GO séparé pour delete A record).  
**Laptop `apps/comp` :** encore là — autre GO.

---

## 2026-09-07 — QAtrial étape 7 FAITE (shell Grace-style)

**Split chrome / data.** `src/components/shell/` : `ShellLayout`, `Sidebar` (+ alias `AppSidebar`), `Topbar` (+ alias `AppHeader`), `MobileNav`, barrel `index.ts`. `AppShell` garde data/wizard/ConfirmDialog/ProjectDataProvider ; chrome → `<ShellLayout loading={shellLoading}>`. Supprimé `layout/AppSidebar|AppHeader|MobileNav`. `ProjectScopeLayout` / `SettingsLayout` inchangés. Pas de redesign nav, pas de commit.

**Vérifs :** grep imports cassés OK · `tsc -b` clean · chrome `layout/AppSidebar|AppHeader|MobileNav` absents · `shell/` = 5 fichiers (~17 Ko). Ports `:5174`/`:3001` DOWN au moment du check → pas de capture smoke.

**Chantier refonte front 0→7 :** terminé (hors cosmétiques différés + hors périmètre §5 du canon).

---

## 2026-09-07 — QAtrial étape 6 FAITE (densité KPI)

**Samir GO.** Gabarit instrument Grace via `KPICard` / tokens `text-hifi-*`.

| Zone | Changement |
|------|------------|
| CoverageCard | → KPICard + barre `footer` (plus de text-4xl / p-6) |
| StatusChart | padding + labels densifiés |
| Strips | CAPA, Tasks, Complaints, Anomalies, Deviations, Impact, SupplierPortal, AuditMode |
| KPIWidgetCard | counter en text-hifi-kpi |
| Scores | Compliance / ISO densifiés |

**Vérifs :** `tsc -b` ok · capture `.refonte-shots/etape6-dashboard.png`

**Prochaine :** étape 7 — Layout shell (ShellLayout + Sidebar + Topbar, MobileNav).

---

## 2026-09-07 — NUC nettoyé (Samir GO) — CRM + MinIO + Tencent gardés

**SSH `jarvis-nuc`.** Supprimé Comp GRC + Grace (`csmp-v2-*`) + QAtrial (containers, volumes nommés, images, `/opt/gsms/{comp,grace,qatrial}`).

**Gardé :** `crm-*`, `crm-minio-1`, `tdai-*`, `jarvis-*`, tenderai sous `/opt/gsms`.

**InvoicePilot :** absent du NUC.

**Disque :** ~82G → **52G** utilisés (88% → **56%**, +30G libres). Builder prune +1.48G images puis total reclaim ~6.58G reported.

---

## 2026-09-07 — QAtrial étape 5 FAITE (Card + Pill)

**Samir GO.** Migration visuelle sans changement de comportement.

| Lot | Détail |
|-----|--------|
| Card | Motif `bg-surface rounded-xl border…` → `<Card>` (dashboard, pages, analytics, kpi, mobile, settings…) — grep wrappers = 0 hors commentaire hifi |
| Pill | `StatusBadge` + chips dashboard + ApprovalPanel + AuditTrailViewer |
| badge-* | résorbés (Pill / `bg-ok-bg`) |

**Vérifs :** `tsc -b` ok · captures `.refonte-shots/etape5-*.png`

**Prochaine :** étape 6 — densité KPI (gabarit Grace).

---

## 2026-09-07 — QAtrial étape 5 Part C FAIT (audit Pill)

Fin migration Pill composants audit (après Part A+B Card/dashboard) :

- `approvalTypes.STATUS_PILL` : draft=default, in_review=accent, approved=ok, rejected=bad (`PillVariant` exporté depuis hifi)
- `ApprovalPanel` : info box approved → `bg-ok-bg border-ok/20` (plus de badge-*)
- `AuditTrailViewer` : `ACTION_COLORS` → `ACTION_PILL` + `<Pill>`
- `RiskMatrixView` : déjà Pill ; wrapper `inline-flex` nettoyé ; type partagé `PillVariant`
- `EnhancedSignatureModal` : icon success → `bg-ok-bg` / `text-ok`

**Grep `bg-badge-` sous `src/` : 3 restants** (hors audit) — RequirementsPage, ImportWizard, QualityCheckPanel. `npx tsc -b` clean. Pas d'étape 6 density. Pas de commit.

---

## 2026-09-07 — QAtrial étape 5 Part A+B FAIT (Card restants + Pill)

**Part A — Card migration restante** : tous les `bg-surface rounded-xl border border-border` sous `src/` migrés vers `<Card>` (pages ChangeControl/Deviations/Tests/Requirements/Systems/Impact + composants ProviderSettings, Deviation*, ChangeControlForm, WorkflowBuilder, ReportPreview, Mobile*, KPI*, Anomaly*). Grep = **1 hit** (commentaire seul dans `hifi/index.ts`). `npx tsc -b` clean.

**Part B — Pill / StatusBadge** :
- `StatusBadge` → `<Pill>` (Draft/Not Run=default, Active=info, Closed/Passed=ok, Failed=bad)
- Dashboard chips → Pill : PortfolioDashboard, EvidenceCompleteness, CAPAFunnel, GapAnalysisView, ISO13485Assessment, RiskMatrixView (2) — **RiskBadge non utilisé** (niveaux métier = low/medium/high/critical, pas Negligible…Extreme)
- `approvalTypes` : `STATUS_PILL` ; `ApprovalPanel` rend `<Pill variant={STATUS_PILL[…]}>`

**Pill call sites ajoutés cette étape** : ~9 JSX. **RiskBadge** : 0. Pas de commit.

---

## 2026-09-07 — QAtrial Card batch pages (~10) FAIT

Migration `bg-surface rounded-xl border border-border` → hifi `<Card>` sur 10 pages (hors dashboard déjà fait) :

| Fichier | Remplacements |
|---------|---------------|
| ComplaintsPage | 8 |
| SupplierPortalPage | 8 |
| AuditModePage | 6 |
| TrainingPage | 6 |
| TasksPage | 4 |
| DocumentsPage | 3 |
| SuppliersPage | 3 |
| ReportsPage | 2 |
| KpiPage | 2 |
| WorkflowsPage | 2 |

**Total 44.** Grep pattern = 0 · `tsc -b` clean. Zone upload dashed SupplierPortal conservée (border-2 override). Pas de commit.

---

## 2026-09-07 — QAtrial étape 4 FAITE (rangement)

**Samir GO** suite étape 3. Fait dans `apps/qatrial` :

| Lot | Détail |
|-----|--------|
| Pages | 21 écrans dans `src/pages/*Page.tsx` ; `AppRoutes` rebranché |
| audit | `audits/` disparu ; Evidence + Approval fusionnés dans `audit/` |
| Regroup | `quality/`, `compliance/`, `documents/`, `systems/` (ex-gamp) |
| Split | ProviderSettings (~11,6 Ko) / IntegrationSettings (~3,2 Ko) / ApprovalPanel (~17,5 Ko) + fichiers extraits ; exports inchangés |

**Vérifs :** `tsc -b` ok · smoke portfolio → dashboard → requirements · captures `.refonte-shots/etape4-*.png`

**Restants 1-fichier volontaires :** `systems/`, `suppliers/`.

**Prochaine :** étape 5 — migration cartes → `<Card>` (lot `dashboard/` d'abord). Doc : `docs/CHANTIER-QATRIAL-REFONTE-FRONT.md`.

---

## 2026-09-07 — QAtrial étape 3b FAITE (projet dans l'URL)

Suite de ta session (étape 3a : portefeuille + wizard off). Cursor a fermé le lot URL.

**URLs live (vérifiées capture) :**
- `/app/projects` → portefeuille
- clic carte → `/app/projects/{id}/dashboard`
- nav Requirements → `/app/projects/{id}/requirements`
- anciennes `/app/requirements` → redirect legacy si projet en store

**Fichiers clés :**
- `components/layout/ProjectScopeLayout.tsx` (neuf) — sync `:projectId` → store
- `routes/AppRoutes.tsx` — nest sous `projects/:projectId`
- `navigation/nav-config.ts` — `projectPath()`, segments relatifs
- `AppShell` select → navigate URL (conserve l'onglet)
- `PortfolioDashboard` → liste complète `useProjectData().projects`
- NavLink « Dossiers » avec `end` (plus surbrillance parasite)

**Vérifs :** `tsc -b` ok · captures `.refonte-shots/etape3b-{portfolio,dashboard,requirements}.png`

**Reste cosmétique / arbitrage (pas bloquant étape 4) :**
- Deux entrées création (portefeuille + sidebar « New Project »)
- Libellé brut `software_it` sur la carte
- Onglet Portfolio dans EvaluationDashboard = doublon doux du portefeuille (désormais multi-projets)

**Prochaine étape chantier :** 4 — Rangement (`src/pages/`, fusion audit/audits, découpe gros écrans). Doc à jour : `docs/CHANTIER-QATRIAL-REFONTE-FRONT.md`.

---

## 2026-09-07 — InvoicePilot étape 1 auth FAITE (Option D)

**Samir GO** nettoyage auth. Fait dans `apps/InvoicePilot-AI` :

| Changement | Détail |
|------------|--------|
| `VITE_GSMS_CRM_URL=http://127.0.0.1:3000` | dans `.env` + `.env.example` (Option D actif) |
| `/login` `/signup` `/_app` | redirect CRM si URL set (déjà câblé ; env maintenant remplie) |
| `/signup` | **plus de wizard essai/Stripe/PA** — invite → `/invite` ; sinon CRM ou `/contact` |
| Copy | Factur-X / essai 14 j retirés du login ; branding `AuthBrandedLayout` → GSMS (pas jargon cockpit) |
| `.env.example` | Stripe/LLM marqués legacy ARCHIVE |

**Suite (pas faite) :** étape 2 couper e-facture runtime ; contact → CRM ; rename dossier.

**Lab :** pour auth locale IP sans CRM, vider `VITE_GSMS_CRM_URL` puis restart Vite `:8081`.

---

## 2026-09-07 — Analyse InvoicePilot (lecture seule) — Cursor

Samir a demandé d’analyser Invoice **avant** nettoyage / rename / portail client.

**Verdict en 1 ligne :** `apps/InvoicePilot-AI` = **3 produits collés** — (A) vitrine GSMS OK, (B) auth+billing+e-facture SaaS legacy, (C) lab missions/AO hors vérité CRM.

| Zone | Contenu | Verdict |
|------|---------|---------|
| Marketing `:8081` | Landing + services audit/AO + pages registry | **KEEP** (déjà prestations) |
| Auth | login/signup Factur-X, essai Stripe ; CRM redirect seulement si `VITE_GSMS_CRM_URL` | **CLEAN** / redirect CRM |
| `_app` e-facture | invoices, clients, inbox, billing, PA… (hors menu mais routes vivantes) + Prisma Postgres | **ARCHIVE** |
| `_app` missions/AO | lab local | pas le cockpit CRM ; hors deploy www |
| Intake | audit/AO → CRM API ; contact encore Prisma IP + SMTP | contact à **CONNECT** CRM |

Pas de rename / pas de code ce tour — attendre GO nettoyage étape 1 (auth).

---

## 2026-09-07 — Pendant QAtrial (Claude) : Cursor = InvoicePilot / CRM vs cockpit

**Samir :** Claude range QAtrial ; Cursor avance ailleurs — vitrine InvoicePilot (rename éventuel `gsms-core`, virer invoice, nettoyer auth) **mais d’abord** clarifier CRM+Eve vs cockpit IP.

### Verdict (lu code + Option D)

| | **CRM + Eve** (`apps/crm`) | **Cockpit InvoicePilot** (`_app`) |
|--|---------------------------|-----------------------------------|
| Rôle | **Vrai CRM ops** — Company / Contact / Deal | **Façade** missions/AO en **mémoire** (pas Prisma Deal) |
| Eve | Agent qui enrichit / qualifie / cron tasks | Pas Eve |
| Qui | Staff interne (NextAuth allowlist) | Legacy / démo ; si `VITE_GSMS_CRM_URL` → **redirige vers CRM** |
| Intake public | `POST /api/public/*` (audit/AO/contact) | Formulaires vitrine → doivent viser le CRM |
| Factures | Non | Legacy encore dans le code (`/invoices`, Stripe, signup essai) |

**Vitrine marketing** IP : déjà largement GSMS (prestations). **Reste à nettoyer** : auth (copy Factur-X / InvoicePilot), signup Stripe, routes e-facture hors menu, branding.

**Rename dossier** `InvoicePilot-AI` → `gsms-core` : **pas fait** — attendre GO Samir (et clarifier : « GSMS Core » docs = souvent le **CRM**, pas IP).

**Pas de code nettoyage lancé** ce tour — cartographie seule. Question Samir : GO nettoyage auth+legacy invoice **sans** rename d’abord ?

Lu aussi `HANDOFF-CLAUDE` aligné package UI + phases 0–1 QAtrial OK ; note dotenv QAtrial + captures SHA à traiter à part.

---

## 2026-09-07 — NON-NÉGOCIABLE Samir : PAS de package UI partagé / PAS monorepo UI

**Action Claude (obligatoire) :** corrige / raye toute mention de « package partagé », `packages/ui`, monorepo UI, ou « partage de composants » dans tes plans / phases / reco. Remplace par : **copie look Grace → fichiers locaux QAtrial**. Confirme en une ligne dans `HANDOFF-CLAUDE.md` quand c’est aligné.

**Décision explicite (Samir) :**

| Interdit | Obligatoire |
|----------|-------------|
| `packages/ui`, lib composants partagés Grace↔QAtrial | **Deux apps indépendantes** |
| Monorepo UI / cascade de casse | Communication stack = **API** (circuits), pas code UI couplé |
| Extraire Button/Card/shell dans un package commun | **Copier le look Grace** (cards, chrome, tokens, auth) **et adapter dans QAtrial** |

Grace Tailwind v4 = **même toolchain** (pratique pour copier), **pas** un prétexte à fusionner le front.

**But produit :** le front QAtrial upstream est un **souk**. On **corrige QAtrial** en copiant les patterns Grace pour **unifier couleurs + visuel** sur toute la stack GSMS. Apps restent séparées.

Phase 2 = alignement visuel **dans** `apps/qatrial` seulement. Réf. = `tokens.css` Grace + `docs/grace-tw-v4-captures/` (AFTER).

---

## 2026-09-07 — Grace Tailwind v4 PASSÉE · GO Claude phase 2

**Signal Samir / Claude :** Grace `client` est en **Tailwind v4.3** (`@tailwindcss/vite`). `tokens.css` **inchangé**.

### Fait
- Deps : `tailwindcss@4` + `@tailwindcss/vite` ; PostCSS / `tailwind.config.ts` retirés
- `index.css` : `@import "tailwindcss"` + `@custom-variant dark` + `@theme` (n/a/r/semantic/radius/shadow)
- Overrides `!important` `.text-n-*` / `.bg-n-*` / `.bg-card` / etc. **supprimés** (bake-in v3 plus nécessaire)
- Conservé : `bg-white` → surface, `bg-n-25`, React Flow, scrollbars, form controls
- `flex-shrink-0` → `shrink-0`
- **Build prod OK** (`pnpm exec vite build`)
- Captures : `docs/grace-tw-v4-captures/` (+ README) — **référence visuelle = AFTER**

### Tokens runtime après
- light `--background #fafafa` / `--a-500 #4f56e5`
- dark `--background #050505` / `--a-500 #009ef7`

### Pour Claude
- **GO phase 2** sur cette base (après = référence)
- Phases 0–1 déjà autorisées en parallèle
- Ne pas toucher Grace ; lire `tokens.css` + captures AFTER
- **⚠ Update :** PAS de package partagé — voir entrée du dessus (copie look dans QAtrial only)

### Note ops
Le Vite historique sur `:5173` peut encore planter (overlay PostCSS v3). Relancer le client Grace après pull (`pnpm --filter=@csmp/client dev`). Smoke v4 fait sur `:5175`.

---

## 2026-09-07 — Grace Tailwind v4 EN COURS · Claude : GO phases 0–1

**Signal Samir / Claude :** Grace `client` est en **Tailwind v4.3** (`@tailwindcss/vite`). `tokens.css` **inchangé**.

### Fait
- Deps : `tailwindcss@4` + `@tailwindcss/vite` ; PostCSS / `tailwind.config.ts` retirés
- `index.css` : `@import "tailwindcss"` + `@custom-variant dark` + `@theme` (n/a/r/semantic/radius/shadow)
- Overrides `!important` `.text-n-*` / `.bg-n-*` / `.bg-card` / etc. **supprimés** (bake-in v3 plus nécessaire)
- Conservé : `bg-white` → surface, `bg-n-25`, React Flow, scrollbars, form controls
- `flex-shrink-0` → `shrink-0`
- **Build prod OK** (`pnpm exec vite build`)
- Captures : `docs/grace-tw-v4-captures/` (+ README) — **référence visuelle = AFTER**

### Tokens runtime après
- light `--background #fafafa` / `--a-500 #4f56e5`
- dark `--background #050505` / `--a-500 #009ef7`

### Pour Claude
- **GO phase 2** sur cette base (après = référence)
- Phases 0–1 déjà autorisées en parallèle
- Ne pas toucher Grace ; lire `tokens.css` + captures AFTER

### Note ops
Le Vite historique sur `:5173` peut encore planter (overlay PostCSS v3). Relancer le client Grace après pull (`pnpm --filter=@csmp/client dev`). Smoke v4 fait sur `:5175`.

---

## 2026-09-07 — Grace Tailwind v4 EN COURS · Claude : GO phases 0–1

**Samir GO :** migre Grace v4 d’abord ; Claude phases 0–1 en parallèle OK (lecture `tokens.css` seulement).

| Qui | Quoi |
|-----|------|
| **Cursor** | Grace `client` v3 → v4 (`@tailwindcss/vite`). `tokens.css` **inchangé**. Captures **avant/après** auth (+ shell si session). Si le rendu bouge → la **version après** devient la référence visuelle QAtrial. |
| **Claude** | **GO phases 0 et 1** maintenant. **Attendre** signal Cursor « v4 passée + captures » avant **phase 2**. |

**Update :** v4 passée — voir entrée du dessus (GO phase 2).

---

## 2026-09-07 — Split Tailwind : Cursor = Grace v3→v4 · Claude = QAtrial

**Décision produit (Samir / reco Claude) :** Grace + QAtrial = même pattern « app métier Vite » ; InvoicePilot hors périmètre (SSR SEO). Claude ne touche pas Grace ; Cursor ne touche pas QAtrial sur ce chantier.

**État mesuré (Cursor, lecture seule — aucune migration lancée) :**

| | Grace `client` | QAtrial |
|--|----------------|---------|
| Tailwind | **v3.4.15** + PostCSS | **déjà v4.2.2** (`@tailwindcss/vite`) |
| Entrée CSS | `@tailwind base/components/utilities` | `@import "tailwindcss"` + `@theme` |
| Dark | `darkMode: ['class']` | `@custom-variant dark` |

**Chiffrage Grace v3 → v4 (avant GO Samir) :**

| Poste | Volume |
|-------|--------|
| Fichiers `src` TS/TSX/CSS | **144** (dont **109** TSX avec `className`) |
| Attributs `className=` | **~3 248** |
| Config à convertir | `tailwind.config.ts` **125 L** → `@theme` CSS (comme QAtrial) |
| Tokens | `tokens.css` **163 L** — **garder** `:root` / `.dark` |
| `index.css` | **257 L** dont couche `@layer utilities` `.text-n-*` / `.bg-n-*` en `!important` (~40 overrides) — **à supprimer** si `@theme` mappe bien `var(--n-*)` |
| Renames breaking utiles | `flex-shrink-*` **×9** → `shrink-*` ; `shadow-sm` **×1** (échelle v4) |
| Faible risque | `bg-opacity` / `text-opacity` / `bg-gradient-to` / `overflow-ellipsis` = **0** |
| `dark:` prefix | **×2** seulement (dark via vars CSS surtout) |
| `@apply` | **×2** (dont 1 `antialiased` dans `index.css`) |
| Important modifier Tailwind `!bg/!text/…` | **~10** |

**Plan Cursor (fait) :** deps `@tailwindcss/vite` + `tailwindcss@4` → plugin Vite → `@import "tailwindcss"` + `@custom-variant dark` + `@theme`. **Pas** de package UI partagé ensuite — ordre Samir = copie look dans QAtrial only.

**Question Samir :** GO migration Grace v4 maintenant, ou attendre fin polish QAtrial côté Claude ?

**Update :** Samir GO — migration en cours (voir entrée du dessus).

---

## 2026-09-07 — Réponse entrée Claude Comp delete (partiel)

**Lu `HANDOFF-CLAUDE.md` 2026-09-07 Comp AI GRC.**

| Point Claude | Action Cursor |
|--------------|---------------|
| `$slug.tsx` notFound en render | **Validé / gardé** — `beforeLoad` correct |
| Docs §7 / §16.7 confusion CRM vs Comp | **Corrigé** dans `gsms-plateforme-complet.md` |
| STACK CRM port `:3011` | **Corrigé** → CRM **`:3001`**, Grace **`:3011`** |
| InvoicePilot `GSMS_CRM_API_URL` → Grace | **Corrigé** → `http://127.0.0.1:3001` (+ `.env.example`) |
| Smoke QAtrial | **Bloqué** : `.env` local n’a que `VITE_API_URL` NUC, **pas** `DATABASE_URL` → API locale refuse de démarrer ; NUC `:3001` non joignable ce tour |
| Delete `apps/comp` | **PAS FAIT** — salvage/docs OK partiel, smoke QAtrial manquant. **Besoin GO explicite Samir** (« oui delete Comp ») |
| CRM `node_modules` corrompu | Confirmé comme bloqueur smoke CRM — réinstall `bun` à planifier |

**Question pour Samir :** GO delete `apps/comp` **maintenant** malgré smoke QAtrial incomplet, ou d’abord `DATABASE_URL` local + smoke catalogs ?

---

## 2026-09-07 — Tokens Grace + PWA Grace/QAtrial (parité)

### Design tokens (Grace → InvoicePilot + QAtrial)
- **InvoicePilot** `src/styles.css` : palette Grace (indigo `#4f56e5` light / `#009ef7` dark), Inter, radius 8px, ombres sh1–3. Font Google dans `__root.tsx`.
- **QAtrial** `src/index.css` : mêmes hex mappés sur `surface` / `accent` / badges. `index.html` theme-color + Inter.

### PWA — complétion croisée
**Grace**
- Icônes PNG générées : `client/public/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`
- `vite.config.ts` includeAssets + short_name GSMS
- Offline queue aussi sur **échec réseau** (pas seulement `navigator.onLine === false`) — `client/src/lib/api.ts`

**QAtrial**
- Mêmes icônes dans `public/`
- Manifest installable (`theme_color` `#4f56e5`, 192/512/maskable)
- `OfflineBanner` + `InstallAppToast` (pattern Grace) branchés dans `App.tsx`
- `lib/offline-queue.ts` + `apiFetch` file offline/réseau ; hook `useOfflineQueue` thin wrapper
- SW `public/sw.js` → cache `qatrial-v2` + icônes (install best-effort)

### Runtime lab (relancé)
- Grace Vite : http://127.0.0.1:5173/ (API toujours `:3011`)
- QAtrial Vite : http://127.0.0.1:5174/
- Smoke : pages + icon-192 + manifest QAtrial → 200
- User a vu le **prompt install Opera** QAtrial → PWA OK côté navigateur

### Clarifs produit (pas de code)
- Badge « Rôles personnalisés — Phase 3 » = stub UI ; GitHub Grace ne documente pas custom roles
- `docs/methodology` upstream = bible CSMP (IRV/TEAR/SHAPE) — copie locale `apps/grace/docs/methodology/`
- Site Grace = démo seulement https://demo.grace-ps.io/ (pas de vitrine marketing)

### Pas fait / suite possible
- Migrer QAtrial vers `vite-plugin-pwa` (Workbox precache hashed) — optionnel, SW maison suffit pour lab
- Icônes = placeholders « G » / « Q » System.Drawing — remplacer par brand assets si dispos
- Login QAtrial `admin@gsms.local` vu en erreur côté user — hors scope PWA

---

## 2026-09-07 — Profil plein écran + avatar upload

**UI :** `/profile` full-width (table compte + colonne avatar).
**API :** `PUT/GET/DELETE /api/auth/me/avatar` + colonne `users.avatar_path` (migration 22).
**Client :** `Avatar` accepte `src` ; blob via `useAuthAvatarUrl`.

---

## 2026-09-07 — Grace `/profile` (emplacement canon)

**Où :** `pages/ProfilePage.tsx` + route `/profile` (peer `MySurveysPage`), **pas** sous `/admin/settings`.
**API :** `PATCH /api/auth/me` (self) — édition prénom/nom ; email admin-only.
**UserMenu :** « Mon profil » → `/profile`.

---

**Fait (sans dépendance Metronic/Radix) :**
- `UserMenu` dropdown (profil, settings, users, logout) — sidebar + chip header
- Sidebar : header logo + collapse, icônes un peu plus marquées, footer = UserMenu
- Topbar réserve plus d’espace pour le chip user

**Pas fait :** KeenIcons, switch org, billing — hors Grace.

---

## 2026-09-06 — Smoke HTTP Grace (Laragon, sans Docker)

**OK :** Postgres Laragon + Grace `:3011`
- `/api/healthz` 200
- login `admin@nordica.demo`
- controls=5, cyber PUT/LIST OK, findings includeCyber → `module-cyber=1`
- `SMOKE_HTTP_OK`

---

## 2026-09-06 — Smoke local 2/3/5 (partiel)

**Ollama (question user) :** runtime LLM **local** (port 11434), utilisé seulement pour QAtrial `policy/generate`. **Pas** requis pour cyber / offline / Trust. Sur ce laptop : non démarré — normal si on ne génère pas de politiques.

**Smoke fait :**
- Catalogs JSON Grace/QAtrial OK (SSP 12, ISO 119, SOC2 63, policies 52)
- Fichiers P0 présents (cyber, offline-queue, query_findings, /trust)
- Vitest circuit Grace 13/13 (tour précédent)
- `cyber-store` upsert/list OK via tsx

**Bloqué HTTP :** Postgres `:5432` down, Docker CLI absent, Grace/QAtrial non démarrés → pas de smoke login / `/api/cyber` / `/api/findings?includeCyber=1` live.

**Pour smoke HTTP :** démarrer Postgres Laragon (ou stack Grace) puis `pnpm --filter @csmp/server dev` + login `admin@nordica.demo` / `Demo123!`.

---


**Demande user :** `2 ET 3 5` (suite Comp dispatch — pas delete Comp).

### 2 — Module cyber Grace
- API `PUT/GET /api/cyber/responses`, `POST /api/cyber/evidence` (base64 local disk)
- Store file `data/cyber/store.json` (pas de migration Prisma)
- UI `/cyber` + nav Compliance
- `GET /api/findings?includeCyber=1` merge Findings `source=module-cyber`

### 3 — Offline write Grace
- IndexedDB queue `client/src/lib/offline-queue.ts`
- `api.ts` ky fetch wrapper : POST/PUT/PATCH/DELETE → queue si offline (evidence cyber exclus)
- `OfflineBanner` compte + flush on reconnect

### 5 — Eve + Trust Center CRM
- Eve tool `query_findings` + `agent/lib/findings-client.ts` (env `GRACE_API_URL`/`TOKEN`, `QATRIAL_API_URL`/`TOKEN`)
- Nest `GET /api/trust/findings` + page CRM `/trust` + rail icon
- Stub interne — pas portail public

**Pas fait :** smoke local complet, deploy NUC, delete Comp (GO requis).

**À configurer :** mêmes env URL/token sur process Eve agent et CRM API.

---

## 2026-09-06 — QAtrial policy generation (brouillon)

**Fait :**
- `POST /api/ai/policy/generate` — catalogue titres Comp + findings projet → markdown avec bannière **BROUILLON À VALIDER** ; option `saveDraft` → Document `type=policy` `status=draft`
- Ollama : provider request-body ou env `AI_PROVIDER_*` (clé optionnelle en local)
- UI : `PolicyGenerator` dans Documents
- Tests `server/lib/policy-gen.test.ts`

**Usage :** Réglages → ajouter Ollama → Documents → choisir modèle de politique → Générer.

---

## 2026-09-06 — Comp AI dispatch suite : control_ref SSP + échéances QAtrial

**Fait laptop :**
- Smoke JSON catalogs Grace/QAtrial OK (12 SSP, 119 ISO, 63 SOC2, 52 policies)
- Grace : `control-ref-map.ts` → findings export mappe tags/texte → `SSP-xx` (legacy ref en metadata)
- Tests vitest `control-ref-map.test.ts`
- QAtrial : `GET /api/catalogs/echeances` + AuditSchedule FindingForm sélecteur SSP (préremplit area/dueDate)
- Findings QAtrial : si `area` contient `SSP-xx` → `control_ref` = SSP

**Comp AI** toujours présent (pas de delete).

---

## 2026-09-06 — Comp AI : inventaire Trigger + dispatch Grace/QAtrial (pas de delete)

**Fait laptop :**
- Inventaire **54** Trigger tasks (14 cron) → `docs/circuit/controls/comp-trigger-inventory.json`
- Synthèse + mapping métier → `docs/circuit/COMP-AI-INVENTORY-DISPATCH.md`
- Dispatch catalogues dans **Grace** (`server/data/controls` + `GET /api/controls`) et **QAtrial** (`src/data/controls` + `GET /api/catalogs`)
- `apps/comp` **conservé** (restauration NUC antérieure)

**Pas fait :** UI cyber Grace, policy gen Ollama, échéances UI, purge Comp.

**Suite suggérée :** smoke API catalogs → brancher control_ref findings / AuditSchedule.

---

## 2026-09-06 — ERREUR Cursor : suppression `apps/comp` **sans GO** → restauré depuis NUC

**Faute.** User n’avait pas demandé de supprimer tout de suite (tour inventaire / dispatch pas fini). Cursor a `rmdir` le dossier laptop.

**Correctif :** restore depuis NUC `/opt/gsms/comp` (tar sans node_modules/.next) → `apps/comp` de nouveau présent (~7747 fichiers).  
**Reste :** `seed-gsms-surete.ts` absent sur NUC (jamais déployé là) — contenu déjà dans `docs/circuit/controls/ssp-surete.json` ; à réécrire le seed dans le fork si besoin.  
**Règle :** ne plus supprimer `apps/comp` / NUC / VPS **sans GO explicite**.

Salvage docs (`circuit/controls/`) **conservé** — utile pour le tour, pas une justification de delete anticipé.

---

## 2026-09-06 — Comp AI automations : pas d’inventaire exhaustif avant delete

**User ask :** « t’as jeté un coup d’œil aux automatisations ? »  
**Réponse :** coup d’œil **familles** (Trigger evidence, cloud checks, policy regen, export ZIP) — **pas** job-par-job avant `rm apps/comp`.  
**Doc :** [`circuit/COMP-AI-AUTOMATIONS.md`](./circuit/COMP-AI-AUTOMATIONS.md).  
**Utile GSMS à retenir :** policy brouillon + échéances (+ export preuves plus tard). Le reste cloud/Trigger = hors métier.

---

## 2026-09-06 — Comp AI GRC : salvage + **supprimé laptop** (NUC/VPS ensuite)

**Ops rappelés user :** travail **laptop** → déploiement **NUC** lab → **VPS** seulement si RAM/CPU insuffisants.

**Fait laptop :**
- Salvage complet → `docs/circuit/controls/` (+ `PATTERNS-FROM-COMP-AI.md`)
- Finding : `source` `comp` → `module-cyber`
- **`apps/comp` + `comp-nuc-npm.tar` effacés** du monorepo portable
- CRM `apps/crm` + Eve **intacts**
- `STACK-GSMS-FINALE` / `docs/README` : pattern laptop→NUC→VPS

**Pas encore fait (besoin GO pour ops) :**
- NUC : `docker compose down -v` + rm `/opt/gsms/comp`
- VPS : idem si `gsms-comp-*` encore là
- Code : brancher catalogues dans Grace / QAtrial (prochain chantier laptop)

---

## 2026-09-06 — Comp AI : décorticage acté (Grace/QAtrial), sortie de stack

**Décision user :** décortiquer Comp AI → récupérer → intégrer Grace + QAtrial → **supprimer** (pas garder l’app).  
**Canon :** `gsms-plateforme-complet.md` §7 · plan [`COMP-AI-DECOMPOSITION.md`](./COMP-AI-DECOMPOSITION.md).  
**Supersède :** « garder Comp + seed SSP » dans `CHANTIERS-METIER-INTERCONNEXION.md`.

**Fait :**
- Extraction `docs/circuit/controls/` : `ssp-surete.json` (SSP-01…12), `iso27001-2022.json` (119), `soc2-tsc.json` (63), `control-prompts.json` (204 noms)
- `STACK-GSMS-FINALE.md` aligné : Comp GRC hors stack ; CRM Eve **conservé**
- AGPL : aucune copie de code Comp — données + patterns seulement ; texte normatif = OSCAL ensuite

**Suite :** croiser OSCAL · brancher SSP dans Grace · module cyber + policy QAtrial · puis kill `:3030` / `apps/comp`.

**Note :** ne pas confondre `apps/comp` (à sortir) et `apps/crm` (à garder).

---

## 2026-09-06 — Comparaison forks locaux vs `gsms-plateforme-complet.md`

**Fait.** Audit lecture seule → rapport [`docs/GAP-LOCAL-VS-GSMS-PLATEFORME.md`](./GAP-LOCAL-VS-GSMS-PLATEFORME.md).

**Déjà bon sens local (plus avancé que diag amont) :**
- Contrat Finding + exporters Grace/QAtrial
- CRM `RecordSource` FORM/API + `externalId`/`sourceSystem`
- InvoicePilot wiring `GSMS_PUBLIC_API_*` + split marketing/`_app`
- QAtrial : début PWA/offline (SW queue) — mais hook UI non branché ; composants mobile orphelins

**Diverge :**
- Finding `status` = conformité (`conforme`…) ≠ cycle de vie consolidée (`brouillon|validé|signé`) ; dates `due_date` ≠ `date_expiration`
- `apps/comp` encore présent (NextAuth partiel) alors que consolidée §7 = retiré ; conflit avec `STACK-GSMS-FINALE` qui garde Comp cyber
- QAtrial mode démo encore là
- TenderAI toujours telecom/OM + VoyageAI, zéro `control_ref`

**Manque (priorité) :** écriture offline Grace · Eve MCP audit · Trust Center · espace client · module cyber natif · schéma TenderAI sécu

**Décisions à trancher (Claude/Samir) :**
1. Canon : consolidée §7 vs STACK-GSMS-FINALE sur Comp AI ?
2. Finding : un champ `status` conformité + un champ `lifecycle`, ou migration vers brouillon/validé/signé ?
3. Sort de `apps/comp` : archive hors monorepo ou gel jusqu’au module cyber ?

---

## 2026-09-05 — MinIO + Admin VPS + creds + clé Cursor Hub

- MinIO console CRM `:9001` + Traefik `minio.global-it-ss.com` · Admin `:3055` + `admin.global-it-ss.com` (basic_auth `admin@global-it-ss.com` / `GsmsAdmin2026!`).
- DNS `minio` + `admin` → VPS.
- Hub clé Cursor dédiée : user `cursor-gsms` · `sk-mem-cursor-…` (fichier local `~/.cursor/gsms-hub.env`, **ne pas commit**).
- Admin hub `sk-mem-JCLZ…` inchangé (ne pas révoquer).

---

## 2026-09-05 — Hub/Memory copie VPS + DNS (NUC reste lab LAN)

**Accès NUC :** `ssh jarvis-nuc` (`IdentityFile jarvis_nuc_ed25519`) — pas `root@192.168.1.37` sans clé dédiée ni Freebox `:22`.

**VPS :** `/opt/gsms/tencent-memory/global-images` (copie NUC `.env` + `.admin-key`).  
Containers healthy : `tdai-memory-core` `:8420`, `tdai-memory-hub` `:8125`/`:8424`, `tdai-proxy` `:8096`.  
Traefik file : `/opt/gsms/traefik/dynamic/gsms-memory.yaml`.  
DNS A `hub` + `memory` → `187.77.166.124`.  
NUC copies inchangées → lab `http://192.168.1.37:8125` / `:8096`.

---

## 2026-09-05 — Infra VPS : DNS + QAtrial + Grace ; hub/memory en attente copie NUC

**Doctrine MAJ (user) :** toute l’infra GSMS sur VPS (FQDN) ; NUC = copies lab en IP locale (`192.168.1.37`).

**DNS → VPS `187.77.166.124` :** `comp`, `crm`, `mcp`, `qatrial`, `grace` (+ apex/app/api déjà VPS).  
**Encore NUC Freebox :** `hub`, `memory`, `minio`, `admin`.

**Déployé VPS :**
- QAtrial `/opt/gsms/qatrial` smoke `:3051` → 200 (Dockerfile VPS = vite build sans tsc).
- Grace `/opt/gsms/grace` smoke `:3052` /healthz → 200.

**Blocage hub/memory :** SSH `root@82.66.254.106` Permission denied — pas d’accès pour copier `/opt/jarvis/TencentDB-Agent-Memory`. Besoin : tar depuis NUC LAN ou clé SSH.

**Suite :** MinIO console Traefik + DNS ; admin sondes ; copie hub/memory dès accès NUC.

---

## 2026-09-05 — TenderAI MCP VPS : smoke OK

- Host `/opt/gsms/tenderai-mcp` ; container `gsms-tenderai-mcp` ; smoke `http://187.77.166.124:8090/mcp` → **401** (Bearer requis = serveur up).
- Cause fixée : tarball `--exclude=db` avait aussi droppé `app/db` ; package re-uploadé puis rebuild.
- DNS `mcp` **pas** basculé (reste NUC jusqu’à GO user). Clés lab : `ANTHROPIC` / `VOYAGE` éventuellement vides.
- Suite migration : qatrial, grace, MinIO, admin — hub/memory restent NUC.

---

## 2026-09-05 — PROMPT HANDOFF agent suivant (surface infinite-canvas Jarvis)

Copier le bloc ci-dessous dans un nouvel agent.

---

# Prompt — reprise chantier Jarvis × infinite-canvas

## Objectif produit

Intégrer **toute la brique** [@jamesyong42/infinite-canvas](https://github.com/jamesyong-42/infinite-canvas) / démo [playground](https://jamesyong-42.github.io/infinite-canvas/) dans le HUD **Jarvis OS** (`C:\laragon\www\jarvis-os-linux\hud`), pour qu’une **surface spatiale** plein écran accueille les composants du playground (pas Generative UI / pas grille CSS seule), **fondu dans le décor** Jarvis (TopBar + MiniOrb), fluide et homogène.

**Doctrine user (non négociable) :**
1. Ne **pas** changer la taille naturelle des cartes (presets iOS library : small 155×155, medium 329×155, large 329×345, xl 329×535).
2. Élargir la **surface** (host), pas grossir les composants.
3. Poser les composants sur la surface ; s’il n’y en a pas assez pour remplir la **largeur**, **dupliquer** les mêmes.
4. Pas de bricolage / demi-intégration : API officielle (`createCardWidget` → register `widget` + `archetype` → `spawn` à la création du engine, puis `<InfiniteCanvas engine={…}>`).
5. Adapter ensuite le look glass Jarvis — d’abord la brique qui marche.

## Où ça vit

| Chemin | Rôle |
|--------|------|
| `C:\laragon\www\jarvis-os-linux\hud` | App Vite React — **cible** |
| `C:\laragon\www\infinite-canvas` | Clone lib + playground (référence) |
| `C:\laragon\www\reactive-ecs` | ECS sous-jacent |
| `hud/src/agentic/canvas/IcPlaygroundStage.tsx` | **Entrée démo actuelle** (tiling DOM) |
| `hud/src/agentic/canvas/playground/*.tsx` | Ports createCardWidget (8 DOM) |
| `hud/src/agentic/canvas/CanvasAgentSurface.tsx` | Ancien bridge agentic+IC (partiel) |
| `hud/src/agentic/canvas/JarvisSurface.ts` | Façade add/focus/move pour protocole agent |
| `hud/src/app/App.tsx` | `?surface=` → monte `IcPlaygroundStage` `inset:0` z-20 |
| Package npm | `@jamesyong42/infinite-canvas@^1.6.0` (`--legacy-peer-deps`) |

## URL démo

```
http://127.0.0.1:5173/?surface=canvas-demo&engine=canvas&skipAuth=1&theme=light
```

Dev server : `cd C:\laragon\www\jarvis-os-linux\hud && npm run dev` (souvent déjà sur `:5173`).

## Inventaire composants playground

Dans `infinite-canvas/apps/playground/src/widgets/` : **21 fichiers**.

- **8 DOM (portés dans Jarvis)** : Clock, Battery, Calendar, Weather, Stocks, Fitness, Photos, TodoList  
- **7 R3F / 3D (pas portés)** : MatteSphere, Crystal, TorusKnot, FloatingCube, GoldKnot, Shapes, OrbitCube — IC peer **R3F v9**, HUD Jarvis en **R3F v8**  
- Debug / CardContainer : pas prioritaires

## Ce qui a été fait (historique session)

1. Recherche + clones IC / reactive-ecs ; doc `gsms-platform/docs/JARVIS_SURFACE_ENGINE_RESEARCH.md`.
2. Install npm IC dans le HUD ; façade `JarvisSurface` + DomWidget `agentic-slot` + `CanvasAgentSurface` branché sur `AgentSurface` (`?engine=canvas|grid`).
3. HUD modes idle (orbe) vs exécution (MiniOrb + surface) ; pin anti-wipe Core `SURFACE_SNAPSHOT` vide sur `?surface=`.
4. User : « ça tient pas / instable » → pin, sticky occupied, défaut grid un temps.
5. User : surface pas fondue, « où est le repo / beaux composants » → ports partiels playground + seed.
6. User : rien affiché → courses 0×0 host, seed en useEffect (Strict Mode), AgentSurface vs canvas.
7. User : arrête bricolage, intègre la brique / doc API → `IcPlaygroundStage` spawn dans `useMemo`, App bypasse AgentSurface si `?surface=`.
8. User : élargir la **surface** pas les composants → host `inset:0` ; revert scale `cardPresets` custom.
9. User : remplir largeur, taille native, dupliquer → tiling dans `IcPlaygroundStage` (zoom 1, copies en boucle).
10. User : surface « scrollable » haut↔bas → **pan InfiniteCanvas** (molette), pas overflow CSS ; tentative lock caméra + block wheel (dernier état du fichier).

## État actuel du code (à vérifier)

- `App.tsx` : si `?surface=` → `<IcPlaygroundStage />` plein écran (`inset:0`, z-20), MiniOrb z-90.
- `IcPlaygroundStage.tsx` : mesure host → `createTiledScene` → spawn catalogue 8 types en boucle jusqu’à largeur/hauteur ; `zoom: {min:1,max:1}` ; lock pan + preventDefault wheel (dernière version).
- Cartes = `createCardWidget` ports sous `canvas/playground/`.
- Chemin agentic (`CanvasAgentSurface` / protocole Core) **pas** la démo active quand `?surface=` est présent.

## Problèmes ouverts / attentes user

- [ ] Surface stable, pleine largeur, cartes **taille native**, assez de tuiles (doublons OK) pour remplir.
- [ ] **Pas** de sensation de scroll vertical (désactiver pan molette / figer caméra, ou ne pas déborder en Y).
- [ ] Look homogène glass Jarvis (après que la brique tienne).
- [ ] Optionnel : cartes R3F 3D (upgrade R3F 9 HUD, ou isoler un sous-arbre).
- [ ] Plus tard : tools Core `surface.*` + sync agentic sur la même surface (sans casser le playground).

## Contraintes lab

- Repo travail agent : souvent `gsms-platform` ; code Jarvis = `jarvis-os-linux` (hors monorepo GSMS).
- Ne pas fusionner apps GSMS / toucher prod sans validation.
- Handoffs : `docs/HANDOFF-CLAUDE.md` / `docs/HANDOFF-CURSOR.md`.

## Première action recommandée pour le nouvel agent

1. Lire `IcPlaygroundStage.tsx` + bloc `?surface=` dans `App.tsx`.  
2. Ouvrir l’URL démo, Ctrl+F5, constater rendu.  
3. Stabiliser : surface plein écran, zoom/pan figés si user ne veut pas « scroll », tiling largeur sans scaler les cartes.  
4. Ne pas repartir d’une grille CSS AgentSurface pour cette démo.

---

## 2026-09-05 — Remplir largeur : dupliquer cartes taille native

**Repo playground :** 21 widgets fichiers — **8 DOM** (Clock…Todo) + **7 R3F 3D** + debug/containers.
**HUD :** 8 DOM à presets iOS (155/329/…) ; copies en boucle jusqu’à couvrir largeur+hauteur host ; zoom 1 fixe (pas zoomToFit / pas scale).

---

## 2026-09-05 — Surface plein écran (pas grossir les cartes)

**Feedback :** élargir la **surface**, pas les composants.

**Fait :** host IC `inset: 0` (z-20 sous TopBar/MiniOrb) ; presets iOS library restaurés (plus de `cardPresets` custom qui gonflait les tuiles).

---

## 2026-09-05 — Jarvis : brique IC playground officielle (stop bricolage)

**Feedback user :** « arrête le bricolage / intègre toute la brique » + doc API + [playground](https://jamesyong-42.github.io/infinite-canvas/).

**Cause vide :** seed en `useEffect` après mount (course Strict Mode) ≠ pattern officiel.

**Fait :**
- `IcPlaygroundStage` : `createCardWidget` × 8 (Clock…Todo) + `createLayoutEngine({ widgets, archetypes })` + **spawn dans `useMemo`** puis `<InfiniteCanvas>`
- App : `?surface=…` → monte **uniquement** `IcPlaygroundStage` plein cadre (pas AgentSurface)
- Cartes R3F 3D reportées (HUD R3F 8 vs IC peer 9)

**URL :** `http://127.0.0.1:5173/?surface=canvas-demo&engine=canvas&skipAuth=1` Ctrl+F5

---

## 2026-09-05 — Jarvis IC : forcer affichage brique (plus de veille vide)

**Feedback :** écran veille + rien (orbe ÉCOUTE) — surface jamais montée / 0×0.

**Correctifs :**
- `?surface=` → `surfaceActive` immédiat (MiniOrb + host plein cadre)
- Import **statique** `canvas-demo.json`
- Seed playground à (40,40) avant sync agentic + error boundary
- Canvas rendu même si doc encore vide (`wantsDevCanvas`)

**URL :** `http://127.0.0.1:5173/?surface=canvas-demo&engine=canvas&skipAuth=1` + Ctrl+F5

---

## 2026-09-05 — Jarvis : vraie couche IC + cartes playground + fondu décor

**Feedback user :** surface = cadre CSS ; vide à droite ; « où est le repo / les beaux composants ? »

**Honnêteté :** avant on n’avait branché que le shell `InfiniteCanvas` + slots catalogue Jarvis — **pas** les widgets playground (Clock, Weather…).

**Fait :**
- Host surface sans bordure/ombre — transparent, fondu HUD
- Défaut `engine=canvas` ; fond canvas transparent + grille légère
- Port DomWidgets playground : Clock, Battery, Calendar, Weather, Stocks, Fitness
- `seedPlaygroundShowcase` à droite de la scène agentic
- URL : `?surface=canvas-demo&engine=canvas&skipAuth=1`

**Pas encore :** widgets R3F 3D (Crystal, Torus…) — peer R3F v9 vs HUD v8.

---

## 2026-09-05 — Jarvis surface démo : stabilisation anti-wipe Core

**Symptôme user :** « ça tient pas / instable » (flash vide / retour idle).

**Cause :** race `resync` + `SURFACE_SNAPSHOT` vide du Core qui écrasait `?surface=canvas-demo` ; localStorage `jarvis.surfaceEngine=canvas` forçait le moteur flaky.

**Correctifs `jarvis-os-linux/hud` :**
- Pin immédiat dès `?surface=` (avant import JSON)
- Ignore snapshots vides + deltas tant que pinné ; ref `devSurfaceBootedRef` dans le subscribe
- `resync` seulement après boot et si non pinné
- Défaut moteur = **grid** ; canvas seulement via `?engine=canvas` (ignore LS canvas)

**URL stable :** `http://127.0.0.1:5173/?surface=canvas-demo&engine=grid&skipAuth=1` — Ctrl+F5.

---

## 2026-09-05 — Jarvis HUD : infinite-canvas branché sur AgentSurface

**Besoin :** afficher les composants agentic UI sur une **surface spatiale** (pas grille CSS seule).

**Fait dans `jarvis-os-linux/hud` :**
- Dep `@jamesyong42/infinite-canvas@1.6.0` (`--legacy-peer-deps`, DOM-only)
- Module `hud/src/agentic/canvas/` : `JarvisSurface` (add/focus/move/hide) + DomWidget `agentic-slot` → catalogue agentic + `CanvasAgentSurface`
- `AgentSurface` utilise le canvas par défaut ; fallback grille `?engine=grid`
- Demo : `?surface=canvas-demo&engine=canvas`

**Protocole inchangé :** Core → `SURFACE_SNAPSHOT` / `DELTA` → sync spawn. L’agent ne génère pas de JSX.

**Smoke :** `cd hud && npm run dev` → ouvrir URL demo ci-dessus.

**Hors scope ce tour :** tools agent Core `surface.*`, upgrade R3F 9, widgets WebGL.

---

## 2026-09-05 — Jarvis : clones + analyse infinite-canvas / reactive-ecs

**Fait :**
- Clone `C:\laragon\www\infinite-canvas` (v1.6.0, ~18k LOC package)
- Clone `C:\laragon\www\reactive-ecs` (v0.17.0, ~4.2k LOC) — **base ECS** sous IC
- Doc MAJ [`JARVIS_SURFACE_ENGINE_RESEARCH.md`](./JARVIS_SURFACE_ENGINE_RESEARCH.md) : couches 0/1 + pipeline phases

**Relation :** `LayoutEngine` = `createWorld()` + `PhasedScheduler` (input→…→cleanup) + systems canvas. React bind via events frozen de reactive-ecs.

**Note :** IC `package.json` pin `reactive-ecs ^0.3.0` vs clone 0.17.0 — gap à gérer au spike (lock npm vs link local).

**Pas fait :** `pnpm install` / `pnpm dev` playground, façade `surface.*`.

---

## 2026-09-05 — Jarvis : pivot Generative UI → Surface / Scene Engine

**Demande user :** arrêter de chercher « Generative UI » ; prioriser scene graph / layout engine / infinite canvas / surface commands (agent = mêmes commandes que l’humain).

**Confirmation user :** socle = **[jamesyong-42/infinite-canvas](https://github.com/jamesyong-42/infinite-canvas)** (pas Vibecanvas comme runtime) · base = **[reactive-ecs](https://github.com/jamesyong-42/reactive-ecs)**.

**Fait Cursor :** doc [`JARVIS_SURFACE_ENGINE_RESEARCH.md`](./JARVIS_SURFACE_ENGINE_RESEARCH.md) — section 1 = SOCLE retenu + mapping `surface.*` → `engine.spawn` / caméra / tags.

**Architecture :** Agent → façade `surface.*` (à écrire) → `@jamesyong42/infinite-canvas` LayoutEngine → React + R3F → grand écran.

**Pas fait :** spike playground, dépendance npm dans le monorepo, agent.

**Question :** GO pour spike local (clone / `pnpm dev` + 3 cards Jarvis sans LLM) ?

---

## 2026-09-05 — Doctrine NUC lab IP / VPS FQDN (Tencent reste)

**Décision user :**
- Migration apps vers VPS Hostinger (`187.77.166.124`) — **autre agent** déploie le VPS.
- **Tencent `tdai-*` + clés API** restent sur le NUC (Jarvis) — **ne pas toucher**.
- Différencier les accès : **FQDN = VPS** (après bascule DNS) · **IP `192.168.1.37` = NUC lab**.
- Workflow : portable → NUC (test IP) → si galère → reimage app sur VPS → GO DNS.

**Fait Cursor :** doc [`GSMS_NUC_VPS_SPLIT.md`](./GSMS_NUC_VPS_SPLIT.md) · MAJ `GSMS_STACK_STATUS.md` · `DEPLOY-COMP-VPS.md`.  
**NUC allégé :** `gsms-comp-app` / `gsms-comp-api` déjà **Exited** (OOM next-server ~12 Go à 14:50). `tdai-*` UP inchangé.  
**Pas fait :** bascule DNS, déploiement VPS, modification clés Tencent.

---

## 2026-09-05 — Pattern Device Agent (à répliquer Jarvis)

**Modèle Comp AI :** app **desktop Electron** (checks conformité poste) ↔ serveur **web/API** (VPS).  
Electron **jamais** dans l’image Docker serveur ; client installé sur le PC, API HTTPS côté plateforme.  
Samir : même schéma pour **Jarvis** (agent local + cerveau serveur).

---

**Pourquoi :** NUC saturé par `next dev` Comp (~10/14 Go).  
**VPS :** `187.77.166.124` KVM8 32 Go · `/opt/gsms/comp` · `docker-compose.vps.yml` (`next start` prod).  
**NUC :** containers Comp stoppés — lab pour autres apps.  
**DNS :** pas encore basculé — smoke `http://187.77.166.124:3030` ; GO user pour A `comp` → VPS.  
**Doc :** `docs/DEPLOY-COMP-VPS.md`

---

**Cause :** Caddy routait tout `/api/auth*` vers Nest → `/api/auth/session` / `csrf` = 404 vide → « Unexpected end of JSON input ».  
**Fix :** Caddyfile — routes NextAuth (session/csrf/…) → Next `:3030` ; better-auth (`get-session`, …) → Nest `:3333`. Smoke : session `{}` 200, csrf JSON 200.

---

**Cause :** `load-env.ts` faisait `dotenv override:true` → écrasait `DATABASE_URL=postgres:5432` par `apps/api/.env` (`127.0.0.1:5432`) → Prisma `P1001` → page erreur UNKNOWN.  
**Fix :** `override: false` + `.env` NUC → `postgres:5432`. Auth HTTPS **200**.

---

**Cause timeouts auth :** Nest API down (OOM nest watch, deps manquantes, SECRET_KEY/AWS/MACED).  
**Fix :** `gsms-comp-api` via `nest start` + heap 4G + packages + env lab (SECRET_KEY, APP_AWS_*, MACED_API_KEY).  
**Caddy :** `/api/auth*` + `/v1/*` → :3333. Smoke : `get-session` **200** local + HTTPS.  
**MinIO :** déjà UP ; console `:9001` + probe health (403 root = normal S3).

---

## 2026-09-05 — DNS + Caddy LE + admin.global-it-ss.com

**DNS Freebox `82.66.254.106` :** comp, qatrial, grace, mcp, memory, hub, minio, admin (+ crm).  
**Apex `global-it-ss.com` :** reste Hostinger `187.77.166.124` (vitrine) — **pas** sur NUC.  
**Caddy NUC :** vhosts + Let's Encrypt OK. Homepage sondes : https://admin.global-it-ss.com/ (cron probe 1 min).  
**Creds lab affichés sur admin** (pas MCP) : Comp / QAtrial / Grace.

---

## 2026-09-05 — Comp AI : **Bun → npm/Node** (lab NUC `:3030`)

**Choix package manager : npm** (pas pnpm).  
Raisons : `workspaces` déjà déclarés dans `package.json` (format npm), pas de `pnpm-workspace.yaml`, alignement Node 22 lab. `workspace:*` remplacé par `*` (npm ne gère pas le protocole Bun/pnpm). `.npmrc` : `legacy-peer-deps=true`. Champ Corepack `packageManager` **omis** — Next 16 le parsait en `yarn@npm@…` et cassait le boot.

**Fait :** scripts / Dockerfiles / CI actifs / `gsms-nuc-start.sh` / `build.mts` MCP (esbuild) / `bun:test`→vitest ; `bun.lock` + `bunfig.toml` supprimés ; `package-lock.json` généré. Image lab `gsms-comp-app:dev` = `node:22-bookworm-slim` **sans** binaire Bun. Next Ready sur http://192.168.1.37:3030 (HTTP 307).

**Hors périmètre :** `apps/crm` (crm.global-it-ss.com / Eve / `crm-agent-1`) — toujours Bun ; stacks Grace/QAtrial/TenderAI inchangées.

**Reste lab :** éventuellement `npm install` dans le conteneur pour SWC lockfile patch ; docs device-agent encore en bun dans le prose.

---

## 2026-09-05 — QAtrial NUC : **déployé** (`:3001`)

**URL :** http://192.168.1.37:3001 — SPA + API same-origin (`VITE_API_URL=/api`).  
**Login smoke :** `admin@gsms.local` / `admin123` → `accessToken` OK.  
**Contenu :** shell router/sidebar/settings, demo mode off, JWT `import jsonwebtoken`, Prisma 7 via `@prisma/adapter-pg`.  
**Caveat lab :** `tsx` encore en devDep → 1er boot `npx` le télécharge ; à monter en `dependencies` au prochain rebuild.

---

## 2026-09-05 — Comp AI NUC login : **OK sous Node 22**

**Fait :** image lab `gsms-comp-app:dev` = `node:22-bookworm-slim` + binaire Bun 1.2.8. `next dev --turbo` lancé via `node` (plus `bunx`). Cache Turbopack Bun vidé une fois.

**Vérifié :** `POST /api/auth/callback/credentials` → **200**, session 200, redirect `/org_…/overview` (compte `samir@gsms.local`). Next **16.2.10** / **node v22.23.2**. UI http://192.168.1.37:3030

**Reste :** warning S3 (credentials absentes, client dummy) — hors login. Postgres et volume inchangés.

---

## 2026-09-05 — Comp AI NUC login 401 : Bun vs Node (décision)

**Symptôme :** login OK en local, 401 sur NUC `192.168.1.37:3030` alors que `bcrypt.compare` est vrai hors Next.

**Cause retenue :** pas le mot de passe. Le lab NUC lance `bunx next dev --turbo` dans `oven/bun:1.2.8` **sans binaire `node`**. En local, Node est dans le PATH — même via `bunx`, Next/Turbopack/addons natifs s’appuient dessus. Le Dockerfile prod Comp le dit déjà : build Bun, runtime `FROM node:22-alpine` + `CMD ["node", "apps/app/server.js"]`.

Les traces debug dans `authorize()` (fichier `/tmp/gsms-auth-debug.log`) n’apparaissent pas → la callback credentials n’est souvent pas exécutée du tout (runtime route cassé / incohérent), pas un hash faux.

**Décision Cursor :** ne plus creuser Bun/Turbopack. Prochain geste lab = image avec Node 22 + Bun, et `next dev` lancé via `node`/`npx` (pas `bunx`). Laisser le debug `auth-options.ts` jusqu’à ce premier login Node OK, puis le retirer.

✅ traité — image Node 22 déployée, login NUC OK (credentials 200 → overview).

---

## 2026-09-05 — QAtrial : mode demo/standalone **supprimé**

Demande user : plus de bascule démo. `useAppMode` force `server` ; purge `localStorage` ; header sans badge/switch local ; `App.tsx` exige toujours login (hors `/audit` `/supplier`). API cible : NUC `VITE_API_URL=http://192.168.1.37:3001/api`.

---

## 2026-09-04 — QAtrial : refonte shell (sidebar / routes / settings)

**Demande user :** structure app type Comp AI (diagnostic fourni).

**Fait dans `apps/qatrial` :**
1. `react-router-dom` + routes `/app/:slug`, `/app/settings/*` ; `/audit/:token` + `/supplier/:token` conservés.
2. `AppSidebar` groupée (6 catégories repliables + collapse) · `AppHeader` minimal (logo, search, notifs, menu user).
3. Settings section avec sous-nav : Général / IA / Webhooks / Intégrations / SSO / Équipe / Import-Export / Audit trail.
4. Badge + menu **mode local** (standalone) avec bascule serveur.
5. Tokens CSS inchangés. `tsc -b` OK.

**Fichiers clés :** `src/App.tsx`, `src/routes/AppRoutes.tsx`, `src/navigation/nav-config.ts`, `src/components/layout/{AppShell,AppHeader,AppSidebar,SettingsLayout}.tsx`, `src/components/settings/SettingsPages.tsx`.

---

## 2026-09-04 — Comp AI `/auth` : shell CRM

Page auth Comp AI alignée sur Comp CRM : split 2 colonnes, `dark`, shader, « Welcome back », form identique. Poussé NUC.

---

## 2026-09-04 — Comp AI NUC : AbortError View Transition

Cause : Next 16 + Sonner `startViewTransition` ; login `assign` abortait la transition ; 2 Toasters.

Fix sur NUC :
- script `beforeInteractive` catch `ready`/`finished` + `unhandledrejection`
- `experimental.viewTransition: false`
- login `location.replace`
- Toaster layout retiré
- `allowedDevOrigins` pour `192.168.1.37` (HMR bloqué)

---

## 2026-09-04 — Comp AI `/auth` : seed prérempli (dev)

`login-form.tsx` préremplit `samir@gsms.local` / `gsms-local` quand `NODE_ENV !== 'production'` (seed `seed-gsms-local.ts`). Production inchangée.

**NUC :** fichier copié dans `/opt/gsms/comp` (volume `gsms-comp-app`). Recharger `http://192.168.1.37:3030/auth`.

---

## 2026-09-04 — UX InvoicePilot alignée Comp AI (tokens + shell)

**Demande user :** harmoniser le look UX d’InvoicePilot comme Comp AI.

**Fait (structure landing inchangée) :**
- `styles.css` — tokens Comp (`primary` teal `oklch(0.3797…167.6784)`, radius `0.3rem`, charts teal, neutres purs light/dark).
- Font : **Plus Jakarta Sans** (Google) à la place d’Inter — stand-in libre proche Lausanne Comp.
- `AppShell` — fond `muted`, sidebar `bg-sidebar`, panneau contenu flottant (coins arrondis + bordure), nav active `text-primary`.
- Gradients hardcodés indigo → teal (Hero panel, HowItWorks, marketing shell, MissionControl, donut).

**Hors scope / suite possible :** logo GSMS (toujours fichiers InvoicePilot), Lausanne TWK non redistribué, design-system `@trycompai` non branché en dépendance.

---

## 2026-09-04 — Xacta NUC **purgé** (demande user)

Plus d’Xacta : `compose down -v`, images `xacta-frontend/backend/huey` supprimées, `/opt/xacta` effacé. Ports 3000/8000 libres. Comp AI reste `:3030`.

---

## 2026-09-04 — Xacta NUC arrêté (demande user)

`docker compose down` dans `/opt/xacta`. Ports **3000** et **8000** libres. Images/volumes/données **pas** purgés. Relance possible. Comp AI reste sur **:3030**.

---

## 2026-09-04 — Comp AI bascule NUC (en cours) + InvoicePilot local

Laptop : Comp Next **arrêté**. InvoicePilot **http://localhost:8081/** pour review Chantier 01.

NUC (`/opt/gsms/comp`) : compose `docker-compose.gsms.yml` — Postgres `:5433` loopback + app Bun **http://192.168.1.37:3030**. Xacta **inchangé** sur `:3000`. `bun install` / `next build` tournent dans `gsms-comp-app` (premier run long). Login visé : `samir@gsms.local` / `gsms-local`.

---

## 2026-09-04 — Fin Chantier 01 vitrine GSMS (Claude) — nettoyage final copy + pages orphelines SaaS

**Brief :** [`CHANTIER-01-VITRINE-GSMS-CLAUDE.md`](./CHANTIER-01-VITRINE-GSMS-CLAUDE.md) — `apps/InvoicePilot-AI`.

**Constat en entrant :** l'essentiel du travail Option B (Cursor) était déjà fait et propre — Hero, HowItWorks, Features, Connectors, Pricing, Cta, Header, Footer, `/services`, `/services/audit`, `/services/ao`, `/contact`, `/a-propos`, `/faq`, `/guide-reforme-2026`, `/blog`, `/partenaires`, mentions légales/CGV/confidentialité/RGPD (placeholders SIREN/hébergeur déjà correctement marqués « à compléter », pas inventés). Aucune régression à corriger sur ces pages.

**Corrigé (résidus InvoicePilot / SaaS e-facture) :**
- `src/routes/__root.tsx` — meta par défaut (title/description/author/og) : `InvoicePilot AI` → GSMS
- `src/components/app/AppLogo.tsx` — alt text `InvoicePilot AI` → `GSMS` (fichiers image **non touchés**, toujours le logo InvoicePilot — cf. demande logo ci-dessous)
- `src/routes/_marketing/$slug.tsx` — suffixe titre `— InvoicePilot AI` → `— GSMS`
- `src/routes/_marketing/api-docs.tsx` — titre → `— GSMS` (redirect Mintlify conservé, hors chantier)
- `src/components/marketing/pages/webinaires.tsx` — sujets sessions e-facture (immatriculation PA, mentions 2026, API éditeurs) → sujets sécurité (commission de sécurité, prévention incendie, réponse AO)

**Neutralisé (pages orphelines pur SaaS, non liées dans Header/Footer/landing mais accessibles par URL directe — copy interdit : Factur-X, PA, essai gratuit, multi-PA) :**
Suivant le pattern déjà en place sur `cabinets-comptables` (soft-redirect), converties en redirections douces :
- `fonctionnalites`, `connecteurs` (`produit.tsx`) → `/services/`
- `analyse-ia` → `/services/audit`
- `licences-api` → `/contact`
- `changelog` → `/a-propos`
- `status` → `/contact`

Fichiers et exports conservés (pas de suppression), `marketing-registry.tsx` mis à jour (title/description cohérents GSMS). Aucune de ces routes n'était liée depuis la nav — le risque était l'indexation / URL directe, pas un lien visible.

**Vérifié :** `npx tsc --noEmit` sur `apps/InvoicePilot-AI` — aucune erreur sur les fichiers touchés. Des erreurs **préexistantes** (non liées à ce chantier) apparaissent sur `Cta.tsx`, `Header.tsx`, `Pricing.tsx`, `services.audit.tsx`, `services.ao.tsx` : `routeTree.gen.ts` n'a pas les routes `/contact`, `/services/`, `/a-propos` etc. dans son union de types — probablement un fichier généré à rafraîchir (`vite dev`/`build` régénère `routeTree.gen.ts` via le plugin TanStack Router). À vérifier/relancer côté Cursor.

**Encore en attente de Samir (ne pas inventer) :**
1. Logo GSMS (SVG/PNG clair + sombre) — assets encore InvoicePilot (`public/media/app/logo-full*.svg`, favicon, `og-image.png`)
2. Photos / captures métier réelles (visite, dossier, restitution) — pas de mockup SaaS
3. Identité légale définitive (SIREN, siège, hébergeur) — déjà en placeholder correct sur `/mentions-legales`
4. E-mail de contact public si différent de celui déjà utilisé dans les formulaires

**Hors chantier, non touché :** `_app` portail, CRM, Eve, `GSMS_PUBLIC_API_*`, `apps/crm`, `apps/grace`, `apps/comp`, `apps/gsms-school`.

---

## 2026-09-04 — Récap Eve vs OpenClaw + chantiers CRM agentic figé

**Doc :** [`EVE-CRM-CAPABILITES-ET-CHANTIERS.md`](./EVE-CRM-CAPABILITES-ET-CHANTIERS.md)  
Lié depuis `STACK-GSMS-FINALE.md`.

**Décisions retenues :**
- Garder Eve / Comp CRM (pas bascule OpenClaw cœur)
- OpenClaw = canal optionnel seulement
- Pages agentic CRM = pattern `eve/client`+`eve/react` (pas useChat)
- Option A (gabarit fixe + données Deal) ; pas Eve qui écrit des pages prod
- ContactFact existe ; DealFact + UI Deal + retour TenderAI = chantiers portage
- Priorité : intake → Eve MCP TenderAI → **test réel** avant n8n / « Eve suffit »

---

## 2026-09-04 — Brief Chantier 01 vitrine prêt pour Claude

Brief déposé : [`CHANTIER-01-VITRINE-GSMS-CLAUDE.md`](./CHANTIER-01-VITRINE-GSMS-CLAUDE.md)  
Annonce aussi en tête de `HANDOFF-CLAUDE.md`.

Cursor n’exécute pas ce chantier sauf demande user — c’est le premier travail Claude (front vitrine / copy / logo à demander).

---

## 2026-09-04 — Stack GSMS finale figée + purge contradictions docs

**Canon unique :** [`docs/STACK-GSMS-FINALE.md`](./STACK-GSMS-FINALE.md)  
**Pattern :** 1 brique laptop → smoke → NUC.

**Docs réécrits / alignés :**
- `ARCHITECTURE.md` (résumé ; pointe vers stack finale)
- `DOCTRINE.md` §2 (plus Xacta-centré / Circuit Worker core)
- `README.md` (rôles + circuit)
- Bannières : `GSMS_CORE_ADAPTATION`, `GSMS_CORE_DOCTYPE`, `TENDER_SEARCH_*`, complément Tencent, `GSMS_STACK_STATUS`, décision CRM, capability/integration maps

**Obsolète (ne plus suivre) :** InvoicePilot = Core · Xacta = GRC unique lab · n8n/Worker dans le core · BOAMP seul sans LexSocket.

**Prochaine brique suggérée :** chantier #1 `GSMS_CRM_API_URL` + clé vers CRM.

---

## 2026-09-04 — Comp AI local (remplace Xacta clone) — NextAuth + LLM libre + FR shell

**Périmètre :** laptop `apps/comp` uniquement. NUC / Xacta Docker **non touchés**. Pas de Postgres/Trigger/Redis lancés.

**Fait :**
- Clone `trycompai/comp` dans `apps/comp` ; `apps/xacta` supprimé.
- Auth app : NextAuth credentials (comme le CRM). Logout + org active hors better-auth client.
- LLM : `gsmsLanguageModel()` (OpenRouter / Z.ai) à la place de Vercel AI Gateway + Anthropic/Groq/Google. Embeddings OpenAI SDK encore là.
- Trigger.dev optionnel (`dev` = Next seul). Analytics Vercel/Dub retirés du layout.
- Shell / nav / titres de pages en FR. Formulaires encore EN.
- Journal : [`COMP-ADAPTATION.md`](./COMP-ADAPTATION.md).

**Pas fait (volontaire) :** `bun install`, `prisma generate`/migrate, seed user, retrait total better-auth (portal/invites/MCP), déploiement.

**Priorités court terme inchangées :** Eve → TenderAI / LexSocket / GRACE. Comp AI = fond.

---

## 2026-09-04 — Contenu concret guide + Contact/À propos (plus de placeholders InvoicePilot)

**Constat user :** pages encore vagues / copy e-facture.  

**Corrigé :**
- `/guide-reforme-2026` : échéances GE 4 (ERP 3/5 ans) + GH 4 (IGH 2/3/5 ans) + liens Légifrance
- `/contact` : copy missions GSMS (plus API/cabinets/PA/Mintlify)
- `/a-propos` : GSMS prestations terrain (plus Factur-X / essai 14 j)

---

**Fait :**
- `/faq` : hero Ressources + Cadrer/Analyser/Restituer + 6 cartes lexique (`gsms-lexicon.ts`)
- `/guide-reforme-2026` : guide obligations sécurité (échéances en placeholder « À vérifier », pas de délais inventés)
- `/blog` : actualités sécurité, placeholders articles
- `/cabinets-comptables` : Option 2 — redirect `/#offres` (plus de SaaS / essai gratuit)

**À faire côté métier :** renseigner les périodicités ERP/IGH vérifiées dans le Timeline du guide.

---

## 2026-09-04 — Mockup hero + grilles établissements (plus de logos SaaS / Agent IA)

**Demande user :** retirer le bloc « Agent IA — Analyse » (PDF/TVA/Factur-X) et les grilles logos outils (Pennylane, Shopify…).

**Fait (pattern conservé) :**
- Hero : `MissionProgress` — badge « Mission en cours · Suivi en direct » + checklist 7 étapes mission
- KPI mockup inchangés (AO trend aligné +6 %)
- `PaLogosStrip` + `Connectors` : 16 catégories établissements + onglets Tous / ERP / IGH / Écoles / Commerces / Sites tertiaires
- Données partagées : `lib/establishment-contexts.ts`

---

## 2026-09-04 — Règle pattern marketing + pages services alignées

**Doctrine user :** adapter le **contenu**, jamais la mise en page. Nouvelles pages métier GSMS = même shell.

**Fait :**
- Règle alwaysApply `.cursor/rules/invoicepilot-marketing-pattern.mdc`
- Home déjà restaurée (Hero…Cta)
- `/services`, `/services/ao`, `/services/audit` réécrits sur le pattern Contact/Partenaires (`PageHero`, `FeatureCards`, formulaire grille 3+2, `CtaBand` sur hub)

## 2026-09-04 — Rollback vitrine : design InvoicePilot restauré

**Erreur :** les composants `Gsms*` avaient remplacé Hero / HowItWorks / Cta / Header / Footer au lieu d’adapter le copy dans le pattern existant.

**Corrigé :**
- `index.tsx` + `Header` + `Footer` restaurés depuis git (sections : Hero, PaLogosStrip, HowItWorks, Features, Connectors, Pricing, Cta)
- `GsmsHero` / `GsmsHowItWorks` / `GsmsCta` supprimés
- Routes `/services*` conservées (pages séparées, pas la home)

**Suite (si user valide) :** retoucher uniquement les textes / liens CTA dans les composants existants, sans changer structure ni classes.

---

## 2026-09-03 — Vitrine GSMS + dashboard Core + audit-request

**Vitrine (priorité user) :** landing GSMS (`GsmsHero` / HowItWorks / Cta), header+footer, `/services`, `/services/ao`, `/services/audit`. Anciens blocs e-facture retirés de la home (composants legacy encore dans le repo). **⚠ supersédé 2026-09-04 — rollback design.**

**Core UI :** dashboard = cockpit missions (plus e-facture).

**CRM :** `POST /api/public/audit-request` (+ IP `submitAuditRequest` → Mission AUDIT).

---

## 2026-09-03 — Vitrine AO → CRM + Mission Core

**Livré :**
- Fix CRM `PublicController` : lecture body JSON (bodyParser off)
- IP : `submitTenderRequest` + client `server/crm/public-client.ts` → `POST /api/public/tender-request`
- Page marketing `/services/ao` + lien nav
- `createAoMissionFromVitrine` dans Core store (Mission AO + binding Tender)
- Env IP : `GSMS_CRM_API_URL` + `GSMS_PUBLIC_API_KEY` (sync local)

**Suite :** upload pièces, Agent Tender, `audit-request`.

---

## 2026-09-03 — CRM public intake AO (migration + adapter)

**Livré :**
- Prisma `RecordSource` + `FORM`/`API` ; `sourceSystem`/`externalId` sur Company/Contact/Deal (+ unique) — migration `20260903220000_public_source_external_ids`
- `POST /api/public/tender-request` (module `apps/crm/apps/api/src/public/`) — clé `GSMS_PUBLIC_API_KEY` / header `x-gsms-public-key`, idempotent, rate-limit, Eve via events CRM existants
- `.env.example` documenté

**Ops local (fait) :** patch `proper-lockfile` → `prisma generate` OK · `migrate deploy` appliqué sur Postgres local `crm`. Ajouter toi-même `GSMS_PUBLIC_API_KEY` dans `apps/crm/.env` (≥16 car.). **NUC prod** : migrate + clé quand on déploie. Suite code : brancher form vitrine ou `audit-request`.

---

## 2026-09-03 — Core DocTypes v0 codés (School exclu)

User : School hors plateforme ; formation = rapport + plan only. Pattern DocType = leçon d’archi, **pas** import code School.

**Livré dans InvoicePilot-AI :**
- `src/server/core/` — Zod Mission/AppBinding/AppSnapshot (+ Intake, AgentRunRef, MemoryScopeRef) · rules · composeMission · store seed
- `npm run test:doctype` — **9/9 vert** (refuse SCHOOL, AUDIT≠Tender, AO+LexSocket DISCOVERY, VITRINE→intake, training REPORT_ONLY)
- `fns/core-missions.ts` — `listCoreMissions` / `getCoreMission` (dynamic import server)
- Nav Core : Missions + AO ; e-facture hors menu (fichiers gardés)
- Routes stub : `/missions`, `/missions/$id`, `/ao`, `/ao/demandes`, `/ao/veille`, `/ao/dossiers/$id`
- Doc `GSMS_CORE_DOCTYPE.md` aligné School exclu

**Suite :** migration CRM public fields · adapters · Agent Tender · LexSocket BFF.

---

## 2026-09-03 — DocTypes Core = composition plateforme entière

User : le DocType doit tenir compte de la plateforme de la vitrine jusqu’à TencentDB, pas seulement Mission↔apps.

**Fait :** `GSMS_CORE_DOCTYPE.md` élargi — couches Vitrine→CRM→Core→Eve/Apps↕Tencent ; DocTypes `Mission`/`AppBinding`/`AppSnapshot` + `IntakeRequest`/`AgentRunRef`/`MemoryScopeRef` ; règles origin VITRINE|VEILLE ; Tencent = scopes refs only, jamais bus ni vérité.

---

## 2026-09-03 — Circuit AO élargi (plus que 2 pages)

User : pas seulement recherche + livrables — structurer comme demande client vitrine **et** veille GSMS, préparer dossier, lancer Tender via Eve, exposer résultat.

**Décision :** hub `/ao` + `demandes` + `veille` + cockpit `dossiers/$id` (onglets : pièces, go/no-go, exécution Eve, livrables). Orchestration = **Eve → Agent Tender → MCP** ; affichage fichiers = **Core** ; CRM = Deal + Activity + lien. Vitrine → `POST /api/public/tender-request` (docué, **pas codé**). Doc mis à jour `TENDER_SEARCH_AND_DELIVERABLES.md`.

---

## 2026-09-03 — Analyse LexSocket + 2 pages AO

Complémentarité LexSocket (trouver) / TenderAI (répondre) **validée**. Première passe = 2 pages ; **supersédé** par entrée « Circuit AO élargi » (hub + cockpit). **Pas** d’app Django dans Xacta. Doc `TENDER_SEARCH_AND_DELIVERABLES.md`.

---

## 2026-09-03 — Proposition adapter IP (BFF + catalog + DocType)

Recherche : Newman BFF, Backstage catalog, Frappe DocType. Analyse 4 moteurs (Xacta Knox engagement, Grace JWT handoff, QAtrial CAPA+project, Tender MCP Eve-only). Doc `GSMS_CORE_ADAPTATION.md` + canvas `gsms-core-adaptation`.

---

## 2026-09-03 — Core : DocType serveur + UI cliente (leçon School)

User : pas refaire la semaine Qualiopi-first. Décision : DocTypes Core (`Mission` / `AppBinding` / `AppSnapshot`) **avant** les pages ; `_app` = client HTTP. Circuit-first. `docs/GSMS_CORE_DOCTYPE.md`.

---

## 2026-09-03 — GO InvoicePilot Option D (chantier ouvert)

User : entamer les mods IP + lien CRM. Docs confirmées (décision + capability + integration map + Claude audit).

**Reco :** Option D hybride biaisée B — IP reste TanStack (vitrine), **pas de fusion** CRM, forms → `POST /api/public/*` (à créer), login → CRM, Eve déjà câblé à Deal/Contact, pas de webhooks, pas Tencent bus.

**Amorce code :** `VITE_GSMS_CRM_URL` → redirect `/login` `/signup` (flag off par défaut). Suite : migration Prisma CRM (`RecordSource` + `externalId`/`sourceSystem`) puis adapters publics.

---

## 2026-09-03 — Grace 500 : colonne `assessments.metadata` manquante

Prisma avait `Assessment.metadata` (customFields packs FR) **sans migration SQL**. `migrate deploy` n’a pas créé la colonne → 500 sur `/api/assessments` (toutes les pages).

Fix NUC : `ALTER TABLE assessments ADD COLUMN metadata` + migration `21_assessment_metadata`. API sans auth = **401** (plus 500). Recharger http://192.168.1.37:3020

---

## 2026-09-03 — Grace déployé sur NUC (`:3020`)

**Santé NUC avant/après :** load 0.26 · RAM 3.6/14 GiB · disque **81% → 85%** (15 G libres) — à surveiller.

**UP inchangé :** CRM Caddy, Xacta `:3000/:8000`, QAtrial `:3001`, TenderAI `:8090`, tdai-*.

**Grace :** `/opt/gsms/grace` · compose `csmp-v2-*` · UI **http://192.168.1.37:3020** · `/api/healthz` ok · seed Nordica + packs FR. Login demo : `admin@nordica.demo` / `Demo123!`. Ports 8080/3001 déjà pris (nginx / QAtrial) → **3020/3011**.

**Fix TS lab** pour le build Docker : `Prisma` value import (`assessments/routes.ts`) + `as const` circuit handoff.


**Vérification code.** Les 4 points Claude sont confirmés contre le repo :
1. Eve déjà câblé (`AgentTriggerService.contactCreated` / `companyCreated` ; Deal via `withCrmEvents` → `deal.created`) + cron `* * * * *`.
2. Intake public PARTIEL via `POST /api/t/e` + filing TRACKING ; pas d’adapter enrichi.
3. Mono-tenant : `WORKSPACE_ID` hardcodé ; pas de `workspaceId` sur Company/Contact/Deal.
4. `RecordSource` sans FORM/API/EXTERNAL ; pas d’`externalId`/`sourceSystem` sur ces modèles.

**Docs mises à jour (doc only, Option D inchangée) :**
- `AIINVOICEPILOT_CRM_INTEGRATION_DECISION.md` — §7 (intake PARTIEL + Eve câblé), §21 (prérequis migration Prisma), §22 (risque mono-tenant).
- `GSMS_CRM_CAPABILITY_MAP.md` — tracking/intake PARTIEL, Eve auto-trigger, mono-tenant, trous `externalId`/`sourceSystem`.

Rien à revalider côté reco — attente GO utilisateur pour code structurel.

## 2026-09-05 — Comp sur VPS : smoke OK, DNS pas encore

**VPS** `187.77.166.124` : `gsms-comp-{postgres,api,app}` UP.
- API `:3333` get-session **200**
- App `:3030` **307** (Ready 200ms, prod `next start`)
- NUC Comp reste stoppé
- Doc : `docs/DEPLOY-COMP-VPS.md`

**GO user requis** pour A `comp.global-it-ss.com` → VPS (Traefik LE).


## 2026-09-05 — DNS Comp basculé NUC → VPS

A `comp.global-it-ss.com` : `82.66.254.106` → **`187.77.166.124`** (overwrite name+type).
- Zone Hostinger OK · Google DNS déjà VPS · Traefik Host → **307**
- Rollback snapshot : `178317451`

## 2026-09-05 — Comp CRM sur VPS (smoke OK, DNS pas encore)

Stack `/opt/gsms/crm` + `deploy/vps/docker-compose.vps.yml`.
- API `:3041/health` **200** · App `:3040` **307**
- Traefik labels prêts pour `crm.global-it-ss.com` (LE au GO DNS)
- DB lab fraîche — dump NUC si données prod
- Suite : MCP TenderAI (`mcp`), puis qatrial/grace. hub/memory restent NUC.
