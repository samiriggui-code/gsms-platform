# Environment

Setup, DB commands, Google Cloud and the `vercel env pull` hazard: `docs/setup.md`.

## One `.env`, at the repo root

`.env.example` **is the documentation** — every variable the repo reads, with a note,
and nothing that is not read. `packages/env` walks up to the workspace root and reads
`.env`, then `.env.local` on top.

- **Real environment variables always win** — the loader never overwrites
  `process.env`, so Vercel/Docker/CI takes precedence.
- **Never add a per-package `.env`.** Four once existed with duplicate
  `DATABASE_URL`/`NEXTAUTH_SECRET`; when they drifted the app minted a cookie the
  API could not verify and every authenticated call came back `401`.
- **The root marker is a `package.json` declaring `workspaces`** — stopping at the
  first `turbo.json` resolves the API's root to `apps/api`.

## A new variable has three homes, not two

`.env.example` and — if the API reads it — `env.validation.ts` are the two people
remember. The third is **`globalPassThroughEnv` in the root `turbo.json`**, and it is
the one that bites: Turborepo hides an undeclared variable from every task it runs, so
a deployment that sets the variable perfectly still hands the code `undefined`, and
nothing anywhere says so. That is how `MICROSOFT_CLIENT_ID` shipped with the sign-in
button quietly missing. **`passThroughEnv`, never `env`** — a secret in `env` is a
cache key, which means a cache miss on every rotation and the secret in the cache
metadata. The root file's comment has the whole account.

## Required

`DATABASE_URL`, `NEXTAUTH_SECRET`, `ALLOWED_SIGN_IN`. Everything else has a
localhost default or is genuinely optional.

Sign-in is email + password (NextAuth, credentials provider) — there is no
sign-in button to configure. Accounts are created with
`bun run --filter=@crm/auth create-user <email> <name> <password>`, and
`ALLOWED_SIGN_IN` is the only thing deciding who that script — and sign-in
itself — will accept.

**`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`** connect Gmail/Calendar sync
from Settings → Connections, once signed in — not a sign-in method. Optional,
but **set together or not at all** (`packages/auth/src/env.ts` throws on one).

**`MICROSOFT_CLIENT_ID` + `MICROSOFT_CLIENT_SECRET`** are the same bargain for
Entra ID: Outlook mail sync, one app registration, the same pair rule.
**`MICROSOFT_TENANT_ID`** defaults to `common` and is the only one of the
three that is genuinely optional on its own — set it to your tenant's GUID to
refuse other tenants at Microsoft. There is **no Microsoft equivalent of
`hd`**: `tenantId` is the whole of it.

**`ALLOWED_SIGN_IN`** — comma-separated whole domains or single addresses (bare
addresses exist for a solo self-hoster, where `gmail.com` would be an open door). **One
list, read by the sign-in guard *and* the sync's "which side is external" decision** —
if they drifted a colleague would be refused at the door or filed as a lead. **An empty
list fails closed.** Parsed on demand. `packages/auth/src/workspace.ts`.

**`GSMS_SSO_ISSUER` + `GSMS_SSO_CLIENT_SECRET`** (et `GSMS_SSO_CLIENT_ID`, `crm` par
défaut) activent la connexion GSMS (OpenID Connect). Facultatifs : sans eux, le bouton
« Se connecter avec GSMS » n'existe pas. `ALLOWED_SIGN_IN` ne filtre pas ces connexions.
Voir la section « Connexion GSMS (SSO) » du README. `packages/auth/src/gsms-sso.ts`.

## Where things are

- **`APP_URL`** (`:3000`) mints session cookies (NextAuth) and is also the
  trusted-origin / `callbackURL` allow-list. `NEXTAUTH_URL` is the equivalent
  variable NextAuth itself reads — set both to the same value.
- **`API_URL`** (`:3001`) is a separate deployment that only *verifies* the
  cookie `APP_URL` minted (`sessionFromHeaders`, `packages/auth`) — it mounts
  no auth routes of its own. `next.config.ts` republishes `API_URL` as
  `NEXT_PUBLIC_API_URL` for the browser to call.
- **Editing a file under `packages/` does not restart the API. Restart it by hand.**
  `bun --watch src/main.ts` refuses to watch outside its project directory and
  says so once at boot: `File ... is not in the project directory and will not be
  watched`. So a change to `packages/auth` or `packages/db` leaves the API
  serving the old module until someone kills it. This cost an hour once: the
  Slack OAuth scope list was correct in source and stale in the process, and
  every reconnect kept asking Slack for the old scopes.
  Running the API from the repo root fixes the watch and breaks Nest, which
  resolves its tsconfig paths from the current directory and then cannot build
  its dependency graph. There is no fix in the dev script today.
- **Every OAuth `redirect_uri` for account linking (Google/Microsoft/Slack) is
  built from `APP_URL`, never `API_URL`.** Those flows
  (`apps/app/app/api/connections/[provider]/`) live entirely in the app, not
  the API — a redirect built from `API_URL` points at a process with no such
  route, and the provider rejects it with "redirect_uri did not match". This
  is invisible until someone sets `APP_URL` to a tunnel or a LAN host, at
  which point the redirect silently becomes that host.
- **`AUTH_COOKIE_DOMAIN`** only for API and app on different subdomains of one parent.
- **`AGENT_URL`** is the agent's deployment, server-side only, and **must include the
  scheme** — validated at boot, or it throws when a task is queued instead.

## `IS_MARKETING` — landing page flag, off by default

`"true"` serves `app/(landing)` at `/`; anything else sends a signed-out visitor to
`/sign-in`, because the page markets *this* product.

- **Only the literal `true`** (same shape as `PRISMA_LOG_QUERIES`).
- **It decides one thing**: what a stranger at `/` sees.
- **`isMarketing()` (`apps/app/lib/env.ts`) reads per request**, so a config change
  needs no rebuild. Declared in `apps/app/turbo.json` `passThroughEnv`.

## Typed, validated env

`apps/api/src/config/env.validation.ts` runs via `ConfigModule.forRoot({ validate })`,
and lists every variable the API reads and nothing else.

- **Validation runs while `AppModule` is evaluated** — a test must set variables before
  importing it (see the dynamic `import()` in `test/auth.e2e.spec.ts`).
- **The schema is the API's, not the repo's** — `@crm/auth` and the agent read their own.
- **`NEXTAUTH_SECRET` is required here even though the API never signs a
  token** — it only decodes the one `APP_URL` minted, and needs the same
  value to do it.

## Optional: what the agent can do

Every outside source is optional and the agent runs with none. A missing key removes a
place to look; **never an error, never throws**. `agent/lib/capabilities.ts` is the
single place that knows what is set.

| Variable | What it adds |
| --- | --- |
| `PERPLEXITY_API_KEY` | Open-web research with citations; finds a LinkedIn slug |
| `GITHUB_TOKEN` | Raises the GitHub rate limit from 60/hour |
| `BLOB_READ_WRITE_TOKEN` | Mirrors logos and photos into Vercel Blob |
| `S3_ENDPOINT` + `S3_BUCKET` + `S3_ACCESS_KEY_ID` + `S3_SECRET_ACCESS_KEY` + `S3_PUBLIC_URL` | Same mirroring, against any S3-compatible store (MinIO on the NUC deploy) — set all five together, and only if `BLOB_READ_WRITE_TOKEN` is unset |
| `ZAI_API_KEY` + `ZAI_BASE_URL` | The model — direct Z.ai/GLM instead of the AI Gateway. Coding-plan keys use the default coding endpoint; pay-as-you-go keys set `ZAI_BASE_URL=https://api.z.ai/api/paas/v4` |
| `AI_GATEWAY_API_KEY` | Legacy: only used when `ZAI_API_KEY` is unset. Not needed on Vercel (OIDC) |
| `AGENT_BRIDGE_SECRET` | The rep-facing Agent panel — see `agent.md` |

`BLOB_READ_WRITE_TOKEN` and the `S3_*` five are also in `env.validation.ts`,
`apps/api/turbo.json` and `apps/agent/turbo.json` — the API's backfill sweep
and the agent's portrait/brand-image writes both call
`packages/db/src/blob.ts`. The Next.js app is deliberately excluded —
recognising our URL for the image optimizer (`isMirrored`/`isOptimizable`,
`packages/db/src/images.ts`) needs no credential, just `S3_PUBLIC_URL` when
self-hosted.

### The Context key is asked for, not configured

**`CONTEXT_DEV_API_KEY` is not a variable here and must not become one.** The key lives
in `AppSetting`, is asked for at `/onboarding/research`, and changes on Settings →
General — an admin who cannot redeploy cannot set a variable.

- **It buys two places to look, not one.** Company brand data by domain, and a person
  read back from a LinkedIn URL already on their record. Both capabilities in
  `agent/lib/capabilities.ts` turn on and off with this one key.
- **An install that had the variable is asked again**: no migration, no fallback, and
  **the gate cannot be dismissed**.
- **Nothing is lost while waiting.** A keyless `brand` task settles `SKIPPED` *before*
  anything marks the row `RUNNING`, and `settle` only overwrites `RUNNING` — so the
  company stays `PENDING`, which the sweep re-queues
  (`test/keyless-brand.integration.spec.ts`).
- **Saving the key runs the company sweep immediately** (fire-and-forget).
- **`readContextDevKey` (`@crm/db/settings`) is the only reader**, read live with no
  cache. An unreadable database is a capability that is off, not an exception.
- **The key is never read back** — only whether one is set, and its last four.
- **The agent checks it, not the API** (a vendor client in the API is a bug):
  `settings.setResearchKey` calls `POST /internal/crm/verify-key` and writes unless the
  answer is *invalid*. **`401` is the only answer meaning the key is wrong**, and **a
  check that cannot be made is not a failed check** — `unknown` saves anyway and logs it
  unverified.

## Mailbox sync

Opt-in, connected per rep from Settings → Connections
(`apps/app/app/api/connections/[provider]/`) — sign-in no longer grants any
mailbox scope, since sign-in is email + password. The full scope set
(identity + Gmail/Calendar, or Outlook Mail.Read) is requested at connect
time, in one round trip.

**`needsMailboxGrant`/`/grant-access`** (`@crm/auth`) still exist for the rare
case a connected account somehow ended up without the sync scopes (a provider
partial-consent screen, mainly) — it re-prompts through the same connect
routes rather than being a second code path.

**One granted mailbox is enough.** A rep with both providers linked who granted Google
is not asked for Outlook; `mailboxGrantsNeeded` names the ones still outstanding and
`/grant-access` offers exactly those buttons.

**Microsoft's granted scopes come back fully qualified** —
`https://graph.microsoft.com/Mail.Read`, not `Mail.Read`. `parseScopes` is the one
canonicaliser and strips that prefix, so the comparison is against the bare permission
everywhere.

**Sync is forward-only** — Gmail records the current `historyId` on its first pass and
imports nothing, Calendar reads from `now`, and Outlook records `now` as its cursor.

**`CRON_SECRET`** (min 16 chars) guards `POST /internal/sync/mailboxes` and
`/internal/sync/rates`; both **fail closed when unset**. `/internal/sync/google` is
kept as an alias of the first, so an existing deployment's cron does not break on
deploy. **Crons live in `apps/api/vercel.json`** — mailboxes `*/5 * * * *`, rates
daily. Minute-level schedules need a Pro plan; on Hobby it silently becomes daily.

Deliberate absences: **no `GOOGLE_SYNC_ENABLED`** (a switch that can disable a mandatory
feature is only ever wrong), **no `GOOGLE_WORKSPACE_DOMAIN`** (`ALLOWED_SIGN_IN` already
says who is internal — two sources is how a colleague becomes a lead), **no
`GMAIL_BACKFILL_DAYS`**, **no `OUTLOOK_BACKFILL_DAYS`**, **no rate provider variable**.

## Telemetry is on, and turning it off is one variable

`CRM_TELEMETRY_DISABLED="1"` — or `DO_NOT_TRACK=1`, honoured identically — and nothing
is sent. No client is constructed, so there is no queue waiting to flush later.

- **Server side only**, `posthog-node` in the API and the agent. **`posthog-js`
  appears once, on the `trycrm.ai` landing page**, and nowhere a record can be
  reached: autocapture on a CRM would lift contact names and deal amounts out of
  somebody else's database. That one import is gated on
  `window.location.hostname`, not on `IS_MARKETING` — turning the landing page on
  for your own domain never loads it. `docs/telemetry.md`.
- **There is no variable for the destination.** The project key and host are
  constants in `packages/telemetry/src/project.ts`. A `phc_` key is write-only —
  it can send events and read nothing back — so making it configurable would
  only imply it were a secret. Edit the constants to point somewhere else.
- **The install ID is a row, not a file** — `install`, one row, UUID written by
  the migration. Vercel's filesystem is ephemeral, so `~/.crm/telemetry-id`
  would count containers.
- Declared in `env.validation.ts` as optional, like everything else here. Every
  event and the never-sent list are in **`docs/telemetry.md`**.

## Not env vars

- **Cache TTL** — `DEFAULT_TTL_MS` (60s) in `cache.module.ts`; `CACHE_TTL_MS` overrides.
- **Redis** — optional; without `REDIS_URL` the cache is per-instance in-memory, which
  is wrong for multi-instance.
- **Sign-in method** — Google and Microsoft are in code; an IdP is a row (SSO, in `api.md`).

## GSMS Core (pont CRM ↔ Core)

`GSMS_CORE_URL` (portail GSMS, ex. `https://gsms-security.com`) et `GSMS_CORE_WEBHOOK_SECRET` (entrée `crm` de
`GSMS_WEBHOOK_SECRETS` côté Core) sont lus par l'agent (`apps/agent/agent/lib/gsms-core.ts`). Chaque événement
CRM (société, contact, affaire) est envoyé au Core, signé `X-GSMS-Signature`. Une affaire gagnée ouvre la
prestation dans le Core ; son lien revient dans le champ « Prestation GSMS ». Sans ces variables, rien n'est envoyé.
Première synchronisation : `bun run gsms:sync` dans `apps/agent`.
