# DocuLens — provenance GSMS

| Champ | Valeur |
|-------|--------|
| Upstream | https://github.com/CodeWithMoin/doculens-ai |
| Commit importé | `218caef7f219a37ebf0061ce4b908c02c0dc4f8c` (2026-07-14, « Add live showcase link (#3) ») |
| Auteur upstream | Moinuddin Shaik |
| Licence | MIT — voir [`LICENSE`](./LICENSE) (conservé tel quel) |
| Méthode d'import | `git subtree add --prefix=apps/doculens` — **historique upstream complet conservé** (14 commits) |
| Date d'import | 2026-10-02 |
| Modifications GSMS dans le commit d'import | **aucune** (ce fichier est ajouté dans un commit séparé) |

## Pourquoi ce dépôt et pas un autre

Plus de 150 dépôts GitHub s'appellent « DocuLens ». Le bon a été identifié par recoupement, pas par le nom :

1. `apps/crm/apps/app/components/compliance-desk/ATTRIBUTION.md` cite : *« DocuLens AI frontend (`gsms-core/upstream/doculens/frontend`), MIT License, Copyright (c) 2025 Moinuddin Shaik »*.
2. Les composants CRM portés citent `IntakePage`, `DocumentRow`, `DocumentUploadForm`, et `apps/tenant-core` porte `NotificationBell` / `NotificationCenter` / `NotificationToaster` « pattern DocuLens ». Ces fichiers existent tous dans `frontend/src` de `CodeWithMoin/doculens-ai`.
3. Moinuddin Shaik = compte GitHub `CodeWithMoin` ; son seul dépôt DocuLens est `doculens-ai` (FastAPI + PostgreSQL + Pydantic, RAG citation-first).
4. `docs/HANDOFF-CURSOR.md` (2026-09-08) : « Plan adaptation DocuLens → Intake », phases P0 fork DocuLens + MinIO, `Desk = DocuLens frontend`, `Desk=FastAPI`. Le clone local `gsms-core/upstream/doculens` n'a jamais été poussé ; c'est pourquoi la brique manquait au dépôt.

## Règles d'usage dans GSMS

- `apps/doculens/` reste **un service à part** (pas de code mélangé au Core tant que la décision de l'architecture V2 n'est pas exécutée).
- Toute adaptation GSMS se fait dans des commits séparés, identifiables, au-dessus de l'upstream.
- Pour récupérer une évolution upstream : `git subtree pull --prefix=apps/doculens https://github.com/CodeWithMoin/doculens-ai main`.
- L'en-tête de licence MIT et la mention de l'auteur doivent rester sur tout code extrait vers d'autres dossiers (Core, UI).

Décisions KEEP / ADAPT / EXTRACT / REMOVE : voir [`docs/architecture/GSMS-PLATFORM-CORE-V2.md`](../../docs/architecture/GSMS-PLATFORM-CORE-V2.md) § 18.

## Adaptations GSMS

### 2026-10-03 — Mode « GSMS Core » (interface documentaire du Core)

Activé au build du frontend par `VITE_GSMS_CORE_URL` (URL publique du Core). Sans cette variable,
DocuLens fonctionne comme l'upstream, avec son propre backend.

| Variable (frontend) | Rôle |
|---|---|
| `VITE_GSMS_CORE_URL` | URL du GSMS Core, par ex. `https://gsms-security.com`. Active le mode Core. |
| `VITE_GSMS_WORKSPACE_ID` | Optionnel : workspace imposé. Sinon, celui du jeton Core (`workspace_id`). |

Côté Core, autoriser l'origine de DocuLens : `GSMS_CORS_ORIGINS='["https://doculens.gsms-security.com"]'`.

En mode Core, `frontend/src/api/client.ts` délègue à `frontend/src/api/core.ts` :

| Écran DocuLens | Route du Core |
|---|---|
| Connexion / profil | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` |
| Dépôt | `POST …/workspaces/{ws}/documents` puis `POST …/documents/{id}/parse` (Docling, puis Digest) |
| Liste, statut d'analyse | `GET …/workspaces/{ws}/documents` (`parse_status`) |
| Consultation des extraits + provenance | `GET …/documents/{id}/normalized` (blocs, lignes de tableau, `SourceRef`) |
| Fichier d'origine | `GET …/documents/{id}/content` |
| Recherche ⌘K | `GET …/workspaces/{ws}/search?q=` (plein texte, avec page / section / feuille / cellule) |
| Activité | `GET …/workspaces/{ws}/events` |

Masqué ou refusé proprement (erreur 501 lisible) tant que le Core ne le sert pas : questions-réponses
et résumés IA (page « Ask DocuLens » redirigée vers Documents), classification IA, libellés,
archivage / suppression / restauration. Le backend Python et le worker Celery de DocuLens ne sont
plus utilisés dans ce mode (non supprimés).

### 2026-10-03 — Image de déploiement GSMS

`docker/Dockerfile.gsms` + `docker/nginx.gsms.conf` : interface construite avec `VITE_GSMS_CORE_URL=/`,
servie par nginx qui relaie `/api/v1/auth/*` et `/api/v1/workspaces/*` au Core (service `core` du
`docker-compose.yml` de la racine). Publiée sur `doculens.<domaine>` par `deploy/deploy.sh`.
Les fichiers `docker/Dockerfile.*` et `docker/nginx.conf` d'origine sont inchangés.

### 2026-10-03 — Connexion « Accès GSMS »

En mode Core, la page de connexion (`frontend/src/pages/GsmsLoginPage.tsx`) remplace celle de l'upstream :
bouton « Se connecter avec GSMS » (OIDC du portail, PKCE, retour sur `/auth/callback`,
`GsmsCallbackPage.tsx`), formulaire e-mail + mot de passe GSMS, textes en français, plus de compte de
démonstration. `/` mène directement à l'application. Portail : `VITE_GSMS_PORTAL_URL`, sinon déduit du domaine
(`doculens.<domaine>` → `https://<domaine>`). Hors mode Core, la page d'origine est inchangée.
