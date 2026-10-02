# apps/web — GSMS Platform (UI globale)

`apps/web` est **la** seule interface web de GSMS (cf. `docs/architecture/GSMS-PLATFORM-CORE-V2.md`, §6, §16, §17, Annexe B) :

- **vitrine publique** (`app/(public)`) : landing GSMS, prestations, formulaire de demande, connexion ;
- **plateforme authentifiée** (`app/(platform)/app`) : tableau de bord, clients, sites, missions, documents, audits, constats et actions, échéances, appels d'offres, commercial, assistant, rapports, paramètres.

Stack : Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind CSS 4, lucide-react, class-variance-authority, clsx et tailwind-merge.

## Règle d'or : le navigateur ne parle qu'au Core

> **Next.js → Core uniquement.** Le navigateur ne connaît ni l'URL du Core, ni celle d'une application spécialisée.

- Les Server Components et les route handlers appellent `CORE_API_URL` côté serveur, via `lib/core/client.ts`, avec le JWT Core lu dans le cookie httpOnly `gsms_session`.
- Pour les vues interactives, le navigateur appelle `/api/core/*` : un relais authentifié qui n'accepte que les préfixes `me` et `workspaces/`.
- Chaque appel porte `X-GSMS-Correlation-Id`, plus `X-GSMS-Workspace-Id` et `X-GSMS-Mission-Id` quand ils s'appliquent.
- **Aucune donnée fictive.** Quand le Core est injoignable ou non configuré, chaque vue l'affiche explicitement (« Core indisponible » ou « Core non configuré », avec l'endpoint et le statut). Rien n'est simulé.
- Tous les endpoints attendus sont documentés dans **`lib/core/endpoints.ts`**, qui est le contrat front ↔ Core.
- Les copies publiques ne citent **aucun nom d'outil interne**.

## Routes

### Public — `app/(public)`

| Route | Rôle |
|---|---|
| `/` | Landing GSMS : hero, problème, environnements, parcours, offres, FAQ, appel à l'action final, pied de page |
| `/prestations` | Missions et secteurs |
| `/prestations/[slug]` | Fiche prestation (8 fiches générées statiquement) |
| `/demande?type=audit\|ao\|contact` | Formulaire → `POST /api/intake` → Core `POST /api/v1/intake` (idempotent). Si le Core est injoignable, la route renvoie **503** avec un message clair. |
| `/login` | Login brandé en split → `POST /api/auth/login` → Core `POST /api/v1/auth/login`, puis cookie httpOnly |

### Plateforme — `app/(platform)/app` (protégée par `proxy.ts`)

| Route | Données Core |
|---|---|
| `/app` | Tableau de bord : `GET /workspaces/{ws}/dashboard` |
| `/app/clients` | `GET /workspaces/{ws}/clients` |
| `/app/sites` | `GET /workspaces` |
| `/app/missions`, `/app/missions/{audits\|commission-securite\|appels-offres\|accompagnement\|conformite}` | `GET /workspaces/{ws}/missions?type=` |
| `/app/documents?q=` | `GET /workspaces/{ws}/documents` et `…/documents/search` |
| `/app/audits` | `GET /workspaces/{ws}/audits` (lien profond vers l'outil expert, fourni par le Core) |
| `/app/findings` | Constats et actions : `GET …/findings` et `…/actions` |
| `/app/deadlines?kind=` | `GET /workspaces/{ws}/deadlines` |
| `/app/tenders` | Dossiers AO (`…/tenders`) et veille (`…/tenders/opportunities`, filtres CPV, NUTS, montant, date) |
| `/app/tenders/[missionId]` | Synthèse : `GET …/tenders/{missionId}` |
| `/app/tenders/[missionId]/[tab]` | Onglets de l'Annexe B : `pieces`, `analyse`, `exigences`, `conformite`, `go-no-go`, `risques`, `questions`, `reponse-technique`, `reponse-financiere`, `documents`, `echeances`, `historique`, `agents` |
| `/app/commercial` | `…/commercial/opportunities` et `…/commercial/quotes` |
| `/app/assistant` | `…/assistant/conversations` ; envoi via `/api/core/…/assistant/messages` |
| `/app/reports` | `…/reports` |
| `/app/settings` | `…/members`, `…/roles`, `…/settings/notifications`, `…/settings/integrations` |

### Route handlers — `app/api`

| Route | Rôle |
|---|---|
| `POST /api/intake` | Valide la demande (pot de miel, champs requis), puis la relaie au Core avec `Idempotency-Key`. Renvoie 503 si le Core est indisponible. |
| `POST /api/auth/login` | Relaie l'authentification au Core et pose les cookies `gsms_session` (httpOnly, SameSite=Lax, Secure en production) et `gsms_ws` |
| `POST /api/auth/logout` | Révoque la session côté Core (au mieux), efface les cookies et redirige vers la landing `/` |
| `GET /api/auth/logout?next=` | Nettoie la session quand le Core renvoie 401 (jeton expiré) |
| `POST /api/session/workspace` | Mémorise le site courant choisi dans le sélecteur |
| `/api/core/[...path]` | Relais authentifié navigateur → Core, réservé aux préfixes `me` et `workspaces/` |

## Arborescence

```
app/
  (public)/(site)/…     landing, prestations, demande (avec nav et footer)
  (public)/login/       login brandé
  (platform)/app/…      plateforme (Shell : sidebar, topbar, tiroir mobile)
  api/…                 route handlers (seul point de sortie vers le Core)
components/
  brand/                wordmark, thème (data-theme et prefers-color-scheme)
  landing/              sections de la vitrine (réécrites depuis la landing commerciale existante)
  auth/                 AuthBrandedLayout et formulaire de connexion
  platform/             Shell, sélecteur de site, ResourcePanel, états Core, vues AO
  ui/                   primitives (Button, Card, Badge, champs de formulaire)
lib/
  core/client.ts        client Core typé (serveur uniquement)
  core/endpoints.ts     contrat d'API attendu du Core
  core/load.ts          chargement scopé au site courant
  copy/*.ts             copie FR centralisée (landing, prestations, plateforme)
  tenders/tabs.ts       onglets AO (Annexe B)
proxy.ts                protection de /app/* (Next 16 : « proxy », anciennement « middleware »)
```

## Design

Les tokens viennent de la signature GSMS (`apps/crm/packages/ui`, `apps/tenant-core`) :

- fond papier chaud `#faf8f5`, primaire `#1a7df5`, bandeau sombre `#111721` ;
- rayons de 14 à 28 px ;
- polices Manrope et DM Mono, avec Newsreader en italique pour les accents éditoriaux (`next/font/google`).

Côté thème : clair par défaut. Le mode sombre suit `prefers-color-scheme` ou le bouton de bascule, qui pose `data-theme` sur `<html>` et le mémorise en `localStorage`.

Accessibilité :

- lien d'évitement « Aller au contenu » ;
- landmarks (`header`, `nav` étiquetés, `main#contenu`, `aside`, `footer`) ;
- focus visible ;
- tiroir mobile modal, qui se ferme avec Échap ;
- FAQ en `<details>` natif ;
- `prefers-reduced-motion` respecté : animations et transitions sont coupées.

## Configuration

Copier `.env.example` vers `.env.local` :

```
CORE_API_URL=http://localhost:8000   # URL interne du Core (jamais exposée au client)
CORE_TIMEOUT_MS=5000                 # au-delà, le Core est considéré indisponible
```

## Lancer

```bash
cd apps/web
npm install
cp .env.example .env.local   # puis renseigner CORE_API_URL
npm run dev                  # http://localhost:3000
npm run lint                 # ESLint (eslint-config-next)
npm run typecheck            # tsc --noEmit
npm run build && npm start   # production
```

Sans Core démarré :

- la vitrine fonctionne ;
- `/demande` et `/login` répondent 503 avec un message explicite ;
- `/app/*` affiche « Core indisponible ».

## Reste à brancher

- **Core** : `apps/core` n'existe pas encore. Il faut implémenter les endpoints de `lib/core/endpoints.ts`, puis remplacer `lib/core/types.ts` par des types générés depuis l'OpenAPI du Core.
- **Workspace dans l'URL** : le §16 prévoit `/app/w/{workspaceId}/…`. Pour l'instant, le site courant est porté par le cookie `gsms_ws` et l'en-tête `X-GSMS-Workspace-Id`.
- **Actions d'écriture** : dépôt du DCE, lancement de l'analyse, décision Go/No-Go, questions et tâches d'assistant. Les boutons sont présents mais désactivés tant que les endpoints POST n'existent pas.
- **Temps réel et vues interactives** : SSE `GET /api/v1/stream` (notifications) et TanStack Query côté client.
- **i18n** : passage de la copie de `lib/copy/*.ts` vers next-intl (FR par défaut, EN).
- **Kit UI** : copie complète du kit `apps/crm/packages/ui` dans `components/ui` si nécessaire (seules les primitives utiles ont été réécrites ici).
- **Qualité** : audit axe et Lighthouse en CI sur `/`, `/prestations` et `/demande`.
