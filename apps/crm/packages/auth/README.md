# `@crm/auth`

Session verification, workspace/role logic, and OAuth-connection helpers
shared between `apps/app` and `apps/api`, backed by `@crm/db`.

Sign-in itself lives entirely in `apps/app` (NextAuth v4, credentials
provider — email + password, no public sign-up). This package does not mint
sessions; it only verifies the JWT NextAuth issues, and holds the pure,
framework-agnostic logic both processes need.

## Topology

`apps/app` (port 3000) is the only process that mints session cookies —
`app/api/auth/[...nextauth]/route.ts`. `apps/api` (port 3001) never sees that
route; it only *verifies* the same cookie, via `sessionFromHeaders` (checked
first for an `x-api-key` header, then the NextAuth cookie) wired into a small
session guard at `apps/api/src/auth/session/`.

Both processes therefore need the same `NEXTAUTH_SECRET`, or a cookie one
mints will not verify in the other.

OAuth account **linking** (Gmail/Calendar, Outlook, Slack — Settings →
Connections) is a separate concern from sign-in. It lives in
`apps/app/app/api/connections/[provider]/{start,callback}/route.ts`,
hand-rolled against each provider's OAuth endpoints directly, and writes into
the same `Account` table sign-in accounts would have used. `src/slack-grant.ts`
and `src/slack-connect.ts` hold Slack's extra bookkeeping (one shared
workspace-wide connection, owner/admin gating).

## Usage

```ts
import { sessionFromHeaders } from "@crm/auth";

// From a NestJS request's raw headers (cookie or x-api-key)
const session = await sessionFromHeaders(request.headers);
```

```ts
import { decodeSessionToken } from "@crm/auth";

// From a raw JWT string (the NextAuth session cookie's value)
const session = await decodeSessionToken(token);
```

## Setup

```bash
cp .env.example .env      # at the repo root — there is no per-package env file
openssl rand -base64 32   # -> NEXTAUTH_SECRET, same value apps/app and apps/api both read
```

This package is a library and never loads an env file of its own; it reads
whatever `process.env` its host process has, and `src/env.ts` imports
`@crm/env/load` so the repo-root `.env` is picked up regardless. See
[`docs/environment.md`](../../docs/environment.md).

`ALLOWED_SIGN_IN` decides who may sign in, and an empty value admits nobody. It
is the whole authorisation model: there are no roles beyond the single
workspace's owner/admin/member, so `src/workspace.ts` and
`src/organization.ts` are worth reading before you change anything here.

## API keys

Hand-rolled, not a plugin: `src/api-key-session.ts` generates a random key,
stores only its sha256 hash (`Apikey.keyHash`), and resolves an `x-api-key`
header back to a session the same shape `sessionFromCookieHeader` returns.

## SSO

Per-tenant OIDC/SAML sign-in is not implemented yet — `SsoProvider` in the
schema is config storage only for now, and `apps/api/src/sso/sso.service.ts`'s
`register`/`remove` refuse with a clear "not available yet" error rather than
pretending to work.

## Changing the schema

There is no generator anymore — this package's models
(`User`, `Account`, `Apikey`, `SsoProvider`, `Organization`, `Member`, …) are
maintained directly in `packages/db/prisma/schema.prisma`. After editing it:

```bash
bun run db:migrate      # create the migration, from packages/db
```
