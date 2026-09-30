# Deploy the CRM on the NUC

Self-hosted deployment: Postgres, API, app, eve agent and a Caddy reverse proxy
with automatic HTTPS on `crm.global-it-ss.com`. Daily Postgres dumps are kept
14 days. All services share the one root `.env`, per the repo rule.

## 0. Prerequisites on the NUC

- Docker Engine + the Compose plugin.
- A DNS `A` record: `crm.global-it-ss.com` → your public IP.
- Your box forwards ports 80 and 443 to the NUC.
- Private-only access instead? Keep Twingate and read "TLS variants" below.

## 1. Copy the repo to the NUC

No git remote exists for this project. Copy the folder without dependencies:

```
rsync -a --exclude node_modules --exclude .next --exclude .git \
	/c/laragon/www/crm/ user@nuc-ip:~/crm/
```

## 2. Configure the one `.env`

From the repo root on the NUC:

```
cp deploy/nuc/.env.example .env
```

Fill in:

- `POSTGRES_PASSWORD` — `openssl rand -hex 24`
- `NEXTAUTH_SECRET` — `openssl rand -hex 32`
- `AGENT_BRIDGE_SECRET` — `openssl rand -hex 24`
- `CRON_SECRET` — `openssl rand -hex 24`. The cron container signs the internal
  job calls with it.
- `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` — MinIO's admin credentials, also
  used directly as the S3 access key/secret (no separate IAM user). Anything;
  `openssl rand -hex 16` for the password.
- `ZAI_API_KEY` — the eve agent's model key (direct Z.ai/GLM, no AI Gateway).
  Optional: a pay-as-you-go key needs `ZAI_BASE_URL=https://api.z.ai/api/paas/v4`;
  a coding-plan key uses the default coding endpoint. Empty key = agent idles,
  nothing crashes (repo rule for optional capabilities).

`CRM_DOMAIN`, `APP_URL`, `NEXTAUTH_URL`, `ALLOWED_SIGN_IN`, `S3_BUCKET` and
`S3_PUBLIC_URL` are already set for `crm.global-it-ss.com` +
`global-it-ss.com`. `GOOGLE_CLIENT_ID/SECRET` are for the Gmail/Calendar sync,
not for sign-in — sign-in is email + password.

## 3. Build and start

From the repo root:

```
docker compose --env-file .env -f deploy/nuc/docker-compose.yml up -d --build
```

The `migrate` service applies Prisma migrations first. The API, app and agent
start after it. First build downloads images and compiles — allow 10 minutes.

```
docker compose --env-file .env -f deploy/nuc/docker-compose.yml logs -f
```

## 4. Create your user

```
docker compose --env-file .env -f deploy/nuc/docker-compose.yml exec api \
	bun /app/packages/auth/scripts/create-user.ts \
	samir@global-it-ss.com "Samir" 'a strong passphrase'
```

Then open `https://crm.global-it-ss.com` and sign in.

## 5. Google OAuth (Gmail/Calendar sync only)

In Google Cloud Console → Credentials → your OAuth client, add the redirect
URI:

```
https://crm.global-it-ss.com/api/connections/google/callback
```

## 6. Connect JARVIS

1. Generate an API key in the CRM settings (API keys page).
2. JARVIS calls `https://crm.global-it-ss.com` with that key in the
   `x-api-key` header (`API_KEY_HEADER` in `packages/auth/src/api-keys.ts`).
3. Data surface: tRPC under `/api/trpc/*`. JARVIS never calls `/internal/*` —
   Caddy answers 403 there by design.

## 7. Backups and restore

A sidecar dumps the database to `deploy/nuc/backups/` once a day and deletes
dumps older than 14 days. Copy that folder to a second disk.

Restore a dump:

```
docker compose --env-file .env -f deploy/nuc/docker-compose.yml exec -T db \
	pg_restore -U postgres -d crm --clean < deploy/nuc/backups/crm-XXXX.dump
```

## 8. Update the deployment

Copy the new code, then:

```
docker compose --env-file .env -f deploy/nuc/docker-compose.yml up -d --build
```

Migrations run again before the services restart.

## Background jobs, cache and storage

On Vercel, five jobs run through Vercel Cron (`apps/api/vercel.json`): mailbox
sync every 5 minutes, currency rates daily at 06:00, telemetry rollup at 07:00,
tracking retention at 04:00 and archive prune at 05:00. The `cron` container
replaces it: it runs the same five calls against the API with
`Authorization: Bearer $CRON_SECRET`. Edit `deploy/nuc/crontab` to change a
schedule, then restart the `cron` service.

The API cache rides on the bundled Redis container (`redis-data` volume). The
API falls back to an in-memory cache if Redis is down — nothing breaks.

Image mirroring (`packages/db/src/blob.ts`, used by the API's backfill sweep
and the agent's portrait/brand-image writes) talks to Vercel Blob when
`BLOB_READ_WRITE_TOKEN` is set, or the bundled MinIO container otherwise —
whichever is set wins if somehow both are. `minio-init` creates the
`S3_BUCKET` bucket and makes it public-read on first boot; the `api` and
`agent` services reach it at `S3_ENDPOINT=http://minio:9000` (the Docker
network), and Caddy's `/blob/*` route (stripping that prefix) is what makes
`S3_PUBLIC_URL` actually resolve for a browser. Set neither pair and image
mirroring is off — nothing breaks, images stay hotlinked from their origin.

## The agent's sandbox needs the Docker socket

The research agent's bash/file tools run inside an eve sandbox
(`apps/agent/agent/sandbox/sandbox.ts`), which resolves its backend in order:
Vercel Sandbox → Docker → microsandbox → just-bash. Off Vercel, with no
`/dev/kvm` passthrough, it would otherwise fall through to just-bash — the
only backend that **cannot enforce the sandbox's `networkPolicy: "deny-all"`
at all**, while the agent's own seeded workspace doc still tells the model
"there is no network from this sandbox." That would be false, silently.

The `agent` service is given `/var/run/docker.sock` so eve's Docker backend
is reachable instead, and `deny-all` is real again. The first sandboxed run
pulls `ghcr.io/vercel/eve:latest` (eve's sandbox runtime image) through the
host daemon — expect a delay on the very first agent task.

## TLS variants

- Default: public DNS + Let's Encrypt. Caddy obtains and renews certificates
  on its own. Ports 80 and 443 must stay reachable.
- Private-only (Twingate, no open ports): replace the site address
  `crm.global-it-ss.com {` in `Caddyfile` with your Twingate hostname and add
  `tls internal` on the next line. Browsers need the Caddy root certificate
  installed once per device.

## Issues known at write time

1. The image builds have run nowhere yet — first `up --build` happens on the
   NUC. Report failures with the failing `RUN` line.
2. `NEXT_PUBLIC_API_URL` and the image optimizer's `S3_PUBLIC_URL` allowlist
   entry are baked into the app bundle at build time. Changing the domain or
   the bucket's public URL means a rebuild, not just a restart.
3. New API REST prefixes need a new `handle` block in `Caddyfile` — path
   routing is explicit on purpose.
4. The CRM sends no email today. When it does, add `SMTP_*` variables to
   `.env` and to `apps/api/src/config/env.validation.ts` (Hostinger values).
