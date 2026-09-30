# Comp AI — adaptation GSMS (local)

**Date :** 2026-09-04  
**Clone :** `apps/comp` ← https://github.com/trycompai/comp.git  
**Remplace :** clone local `apps/xacta` (retiré). NUC : Xacta **purgé** 2026-09-04. Comp en cours sur **:3030** (`/opt/gsms/comp`).  
**Modèle :** même démarche que Comp CRM (`trycompai/crm`) — NextAuth, pas de fournisseur cloud imposé.

Ne pas lancer Postgres / Trigger.dev / Redis tant qu’un test précis ne l’exige. Pour le front : `bun run dev` du package app (Next seul). `dev:trigger` conserve l’ancien script concurrent.

---

## Inventaire upstream (avant adaptation)

| Brique | Upstream | Décision GSMS |
|---|---|---|
| Auth | `better-auth` + `@thallesp/nestjs-better-auth` sur l’API (`/api/auth/*`). Magic link, OTP, Google / GitHub / Microsoft. ~114 `auth.api.*`. | **Sign-in / sign-out / org active = NextAuth v4 credentials** (email + mot de passe, allow-list). JWT comme le CRM. Better-auth **reste** pour portal / invitations / MCP OAuth — voir « reste à faire ». |
| LLM chat | `@ai-sdk/gateway` (Vercel) + `@ai-sdk/anthropic` / `groq` / `google` + slugs Claude/GPT | **OpenRouter / Z.ai / OpenAI-compatible** via `gsmsLanguageModel()` (`apps/app/src/lib/ai-provider.ts` et `apps/api/src/lib/ai-provider.ts`). Variable `GSMS_LLM_MODEL` (défaut `z-ai/glm-5.3-flash`). Packages anthropic/groq/google/gateway **retirés**. |
| Embeddings | `@ai-sdk/openai` (`text-embedding-3-small`) | **Conservé** (besoin d’un modèle d’embedding ; pas de gateway Vercel). |
| Jobs | Trigger.dev | **Optionnel.** `dev` ne le lance plus. Tâches conservées dans le code. |
| Analytics | `@vercel/analytics`, `@dub/analytics` | **Retirés** (layout + package.json). |
| `@vercel/sandbox` | déclaré, aucun import | **Retiré** du `package.json`. |
| Vecteurs | `@upstash/vector` | **Optionnel** (déjà soft-fail). |
| Trust DNS | `@vercel/sdk` + `VERCEL_ACCESS_TOKEN` | Conservé mais optionnel (domaine trust portal). |
| Resend | `RESEND_API_KEY` required | Rendu **optionnel** dans `env.mjs`. |
| Dub referrals | `dub` + `@dub/embed-react` | Code encore là ; pas utilisé en lab GSMS. |

---

## Fait (2026-09-04)

1. Suppression de `apps/xacta`. Clone `apps/comp`.
2. Prisma `User.password` (bcrypt) + `User.lastActiveOrganizationId` (org active hors plugin better-auth). **`prisma generate` / migrate pas encore lancés** (pas de Postgres dans ce chantier).
3. NextAuth : `apps/app/src/app/api/auth/[...nextauth]/` — credentials, `ALLOWED_SIGN_IN`, `NEXTAUTH_SECRET` ou `AUTH_SECRET`.
4. Session app : Prisma + NextAuth (plus d’appel `/api/auth/get-session` pour la session courante).
5. Login FR, email + mot de passe. Logout = `next-auth/react` `signOut` (plus better-auth client).
6. Changement d’org = `setActiveOrganizationAction` → `User.lastActiveOrganizationId`.
7. `HybridAuthGuard` : cookie NextAuth JWT en premier (avec `userEmail`), fallback better-auth.
8. Tous les `generateText` / `generateObject` / `streamText` chat : `gsmsLanguageModel()`. Plus de Vercel AI Gateway, plus de SDK Anthropic/Groq/Google.
9. Layout : plus de Vercel Analytics / Dub ; `lang="fr"` ; titres FR.
10. Navigation / shell / titres de pages en français (menus, paramètres, métadonnées). Les formulaires et tableaux restent majoritairement EN.
11. **Boucle de redirection login** : le proxy (`src/proxy.ts`) ne voyait que les cookies better-auth. Après NextAuth, login → `/` → `/auth` → `/` en boucle. Corrigé : cookies `next-auth.session-token` reconnus ; page `/` lit l’org via Prisma si l’API Nest est down.
12. **Prisma P1017** après restart Laragon/Postgres : le client recrée le pool (retry 1 s) ; `getSession` ne fait plus planter le layout.

---

## Reste à faire (chantier de fond)

- Retirer complètement `better-auth` / `@thallesp/nestjs-better-auth` / plugins client (portal, framework-editor, invitations OAuth, impersonation admin).
- Réécrire `signInEmail` / `signUpEmail` / `createInvitation` / `addMember` / `useSession` client 100 % Prisma + NextAuth.
- Portal + framework-editor : même NextAuth (ou SSO interne CRM).
- i18n du reste de l’UI (formulaires, empty states, toasts, copy marketing interne).
- Seed local utilisateur (`password` bcrypt) quand on lancera Postgres (`prisma generate` + migrate d’abord).
- Embeddings : soit un modèle OpenRouter compatible, soit documenter la dépendance OpenAI pour le vector store.
- `bun install` dans `apps/comp` avant le premier run.
- Déploiement NUC : **en cours** — `/opt/gsms/comp`, UI **:3030**, Xacta reste `:3000`.

---

## Variables d’environnement (lab)

```
AUTH_SECRET=          # ou NEXTAUTH_SECRET — même rôle que le CRM
ALLOWED_SIGN_IN=toi@gsms.example
GSMS_LLM_MODEL=z-ai/glm-5.3-flash
OPENROUTER_API_KEY=   # ou ZAI_API_KEY
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/comp
```

Plus besoin de `AI_GATEWAY_BASE_URL`, `TRIGGER_SECRET_KEY`, `RESEND_API_KEY`, `AUTH_GOOGLE_*`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY` pour démarrer le lab.
