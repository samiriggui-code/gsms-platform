# Chantier QAtrial — refonte front

**Date :** 2026-09-07 · **Pilote :** Claude · **Périmètre :** `apps/qatrial` uniquement

> **Règle non négociable (Samir, 2026-09-07) :** aucun package UI partagé, aucun
> `packages/ui`, aucun monorepo UI. On **copie le look Grace vers des fichiers
> locaux de QAtrial**. Deux apps indépendantes, communication stack par **API**.
> Grace n'est pas modifié — il sert de référence en lecture seule.

**Option retenue : A** — corriger QAtrial en place (hiérarchie + visuel).
Option B (fusionner QAtrial dans Grace) écartée : 101 modèles Prisma à fusionner
dont `User`/`Organization`/`Notification` en collision, deux frameworks HTTP
(Grace = Fastify, QAtrial = Hono), et contradiction avec `STACK-GSMS-FINALE.md`
principes #4 et #5 ainsi qu'avec la contrainte de dégradation isolée (§5.4 du doc
consolidé : Grace collecte, QAtrial traite, le découplage est voulu).

---

## 1. Constat mesuré

### Désordre structurel

| Constat | Chiffre |
|---|---|
| Dossiers de composants | **31** pour 121 composants — 11 en contiennent 1 ou 2 |
| Doublon de dossier | **`audit/` (6) et `audits/` (1)** coexistent |
| Dossier `pages/` | **inexistant** — les 18 écrans routés sont dispersés dans les dossiers métier |
| Composants > 16 Ko | **12**, dont `ProviderSettings` 29,9 Ko et `IntegrationSettings` 27,7 Ko |
| Primitives manquantes dans `ui/` | `Card`, `Badge`, `Table`, `Alert` — les 4 les plus recopiées |
| Motif de carte copié-collé | **108 occurrences** dans 44 fichiers |
| Tokens déclarés jamais utilisés | `--radius-r1..r4`, `--shadow-sh1..sh3` (0 usage) |

### Désordre hiérarchique

QAtrial est **mono-projet dans son interface** : un « projet actif » en store global
+ `localStorage`, jamais dans l'URL. Seul moyen de changer de dossier : un `<select>`
dans la sidebar (`AppShell.tsx:189-203`). Pas de liste, pas de vue d'ensemble.

Le composant `PortfolioDashboard.tsx` existe mais est branché **au mauvais niveau** :
c'est le 9ᵉ onglet du dashboard, et il lit `useProjectStore().project` — le projet
actif au singulier. Un « portefeuille » qui n'affiche qu'un projet.

### Référence : ce que fait Grace

| | Grace | QAtrial |
|---|---|---|
| Racine `/` | vue d'ensemble (`DashboardPage`) | `/app/requirements` — détail du projet actif |
| Liste | `/assessments` | **n'existe pas** |
| Détail | `/assessments/$id` | **n'existe pas** |
| Source du contexte | `useParams({ from: '/protected/assessments/$id' })` | store global |
| Lien vers un dossier | `<Link params={{ id: a.id }}>` | impossible |

Point clé : chez Grace **le wizard EST la page de détail** (`/assessments/$id` →
`AssessmentWizardPage`). L'entité est créée d'abord, reçoit un id, et le wizard
devient son espace de travail — atteignable par URL. QAtrial fait l'inverse :
wizard d'abord, puis le projet existe quelque part dans un store.

---

## 2. Étapes

### Étape 0 — Filet · ✅ FAIT
`scripts/capture-refonte.mjs` + **16 captures** de référence dans
`.refonte-shots/before/` (8 écrans × 2 thèmes). QAtrial n'a **aucun test de rendu** :
les 9 suites existantes ne couvrent que logique et contrats API. C'est la seule
protection contre une régression visuelle.

### Étape 1 — Tokens · ✅ FAIT
`src/index.css` : échelles Grace ajoutées (`n-50..950`, `a-50..900`,
`ok/warn/bad/info` + fonds, `r-neg..r-ext` + encres, `--color-card`,
`--color-nav-active`), en clair **et** sombre. **Ajout pur** — aucun nom
sémantique renommé, les 118 fichiers consommateurs inchangés. Build vert,
captures avant/après identiques au SHA-256.

> `--color-card` désamorce un piège : chez Grace, `bg-card` est une règle CSS
> manuelle en `!important` (supprimée par la migration v4). Côté QAtrial c'est un
> vrai token, donc un utilitaire natif — pas de dette reportée.

### Étape 2 — Primitives `hifi/` · ✅ FAIT
7 primitives dans `src/components/hifi/` : `Card`, `CardHeader`, `KPICard`, `Pill`,
`RiskBadge`, `Btn2`, `Avatar` + barrel. Fichiers neufs. Échelle `--text-hifi-*` en
tokens (pas de px en dur Grace). `TagMultiSelect` non porté (contrôle métier Grace,
absent du barrel).

### Étape 3 — Hiérarchie · ✅ FAIT (2026-09-07, Cursor suite Claude)
### Étape 3b — Tri scope GLOBAL vs PROJET · ✅ FAIT (2026-09-08, GO Samir)

```
/app/projects                      → PortfolioPage (GLOBAL)
/app/tasks|kpi|systems|suppliers|training → écrans org (GLOBAL)
/app/projects/:projectId           → ProjectScopeLayout
/app/projects/:projectId/dashboard → pages métier projectId
```

Anciennes URLs `/app/projects/:id/{systems|suppliers|training|tasks|kpi}` → redirect `/app/...`.
Onglet dashboard « Portefeuille » retiré.

Livré :
1. Wizard sans auto-déclenchement (`wizardVisible = showWizard` seul)
2. `PortfolioPage` racine + compteurs API `GET /projects`
3. `ProjectScopeLayout` — lit `:projectId`, alimente le store ; 18 pages intactes
4. Nav / select / MobileNav / logo → chemins scopés ; compat anciennes `/app/:slug`
5. `PortfolioDashboard` rebranché sur la liste complète (`useProjectData().projects`)
6. Lien sidebar « Dossiers » avec `end` (plus actif sur les sous-routes)

Captures : `.refonte-shots/etape3b-*.png` (portfolio, dashboard URL, requirements).

### Étape 4 — Rangement · ✅ FAIT (2026-09-07, Cursor)

- **`src/pages/`** : 21 écrans routés (`*Page.tsx`), `AppRoutes` lazy-load depuis `pages/`
- **Fusion** `audit/` ← EvidencePanel + ApprovalPanel ; `audits/` disparu (écran → `AuditsPage`)
- **Regroupements** : `quality/` (RequirementModal, TestModal, TaskPanel), `compliance/` (change/complaints/deviations), `documents/` (+ ReportPreview), `systems/` (ex-gamp)
- **Découpe** : `ProviderSettings` → presets + form dialog (~11,6 Ko shell) ; `IntegrationSettings` → 4 cartes integrations/ (~3,2 Ko shell) ; `ApprovalPanel` → types + history + actions (~17,5 Ko shell)
- Dossiers 1 fichier restants volontaires : `systems/`, `suppliers/`
- `tsc -b` ok · captures `.refonte-shots/etape4-*.png`

### Étape 5 — Migration des cartes · ✅ FAIT (2026-09-07, Cursor)

- **Card** : motif `bg-surface rounded-xl border…` → `<Card>` (dashboard 31 + pages 44 + reste analytics/kpi/mobile/…). Grep wrappers = 0 (seul commentaire dans `hifi/index.ts`).
- **Pill** : `StatusBadge` branché sur Pill ; chips dashboard (portfolio/CAPA/evidence/gap/ISO/risk) ; ApprovalPanel + AuditTrailViewer.
- **badge-*** : usages applicatifs résorbés (ok-bg / Pill).
- `tsc -b` ok · captures `.refonte-shots/etape5-*.png`

### Étape 6 — Densité · ✅ FAIT (2026-09-07, Cursor)

Gabarit Grace via `KPICard` (`px-3.5 py-3`, `text-hifi-kpi` 24px/−0.8px, `text-hifi-label` 10px mono) :
- `CoverageCard` → KPICard + barre en `footer`
- `StatusChart` densifié ; strips CAPA / Tasks / Complaints / Anomalies / Deviations / Impact / SupplierPortal / AuditMode
- `KPIWidgetCard` counter + chrome ; score Compliance / ISO densifiés
- Plus de `text-4xl` / `text-2xl font-bold` dans `dashboard/`
- `tsc` ok · capture `.refonte-shots/etape6-dashboard.png`

### Étape 7 — Layout · ✅ FAIT (2026-09-07, Cursor)

Pattern Grace `shell/` local (copie, zéro import croisé) :

| Fichier | Rôle |
|---------|------|
| `components/shell/ShellLayout.tsx` | chrome ~1 Ko (Sidebar + Topbar + main) |
| `Sidebar.tsx` / `Topbar.tsx` / `MobileNav.tsx` | ex-AppSidebar / AppHeader / MobileNav |
| `layout/AppShell.tsx` | data / wizard / ProjectDataProvider (hôte) |

`ProjectScopeLayout` + `SettingsLayout` restent dans `layout/`. Nav/responsive inchangés. `tsc` ok.

---

## 3. Ordre et justification

**2 → 3 → 4 → 5 → 6 → 7**

- **2 en premier** : ne peut rien casser, et tout le reste s'appuie dessus
- **3 avant 4** : sinon on déplace des fichiers qu'on va restructurer juste après
- **4 avant 5** : ne pas restyler des fichiers qui vont bouger
- **7 en dernier** : c'est là qu'on casse la navigation

## 4. Vigilances

- **Mode sombre** — 127 classes `dark:` dans 20 fichiers ; chaque étape se vérifie dans les deux thèmes
- **Recharts** — 6 fichiers, couleurs rattrapées par des `!important` en fin d'`index.css` ; toute refonte du thème doit repasser dessus
- **i18n** — 101 fichiers sur 222 utilisent `useTranslation` (1 597 clés EN/FR, parfaitement synchronisées) ; si la refonte déplace du texte, les clés suivent

## 5. Hors périmètre — à trancher séparément

- **`registry.ts`** (64 Ko) calibré pharma. Le moteur de composition est transposable
  tel quel (pays × secteur × type × modules → fusion + déduplication) ; son **contenu**
  est à remplacer par les référentiels GSMS. C'est de la donnée, pas du code.
- **Modules sans objet pour GSMS** : `etmf`, `udi`, `stability`, `econsent`, `batches`, `gamp`.
- **`POST /projects/compose`** — route manquante pour qu'Eve amorce un dossier après
  un devis validé. Le wizard ne fait aujourd'hui que 3 appels (`POST /projects`,
  `/requirements`, `/tests`) et **les 3 routes existent déjà** : Eve peut donc créer
  un projet pré-rempli dès maintenant. Ce qui manque, c'est la **composition côté
  serveur** — `composeTemplate()` est 100 % client, aucun fichier de `server/`
  n'importe `src/`.
- **11 tests serveur en échec** sur approvals et evidence (404), préexistants.

## 6. Infra QAtrial — état après intervention

- Base **locale** `qatrial` créée sur le Postgres Laragon (62 tables via `prisma db push`).
  Stack 100 % locale : front `:5174` → API `:3001` → Postgres `:5432`. Le NUC reste
  un environnement de déploiement pré-VPS, pas une dépendance.
- **Ni Prisma ni le serveur ne chargent `.env`.** `prisma.config.ts:7` retombe sur
  `db:5432` (hôte Docker) sans `DATABASE_URL` dans le shell ; `server/index.ts` ne
  charge aucun `dotenv`. Exporter `DATABASE_URL` et `JWT_SECRET` avant chaque commande.
  Un `import 'dotenv/config'` réglerait les deux — **non fait, périmètre Cursor.**
- **Deux failles corrigées** dans la file hors-ligne : les routes `/auth/` ne sont
  plus mises en file (le corps contenait email + mot de passe en clair dans IndexedDB),
  et le jeton n'est plus persisté avec les mutations (réinjecté frais au rejeu).
- **Un bug de conception corrigé** : `useAppMode.ts:25-27` recopiait `VITE_API_URL`
  dans `localStorage` au premier démarrage, et la valeur stockée gagnait ensuite
  pour toujours — le `.env` devenait décoratif. Un marqueur `qatrial:api-url:env`
  détecte désormais un changement d'environnement et réaligne.
