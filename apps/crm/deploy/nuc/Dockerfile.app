# Bun 1.3 (= packageManager du dépôt) : l'installeur isolé garde la version de Next propre à apps/app.
# Avec Bun 1.2, une seconde version de Next remontée à la racine fait échouer la vérification de
# next.config.ts (« NextConfig is not assignable … »).
FROM oven/bun:1.3-debian AS build

# Debian 12's `nodejs` apt package is v18 — too old for prisma's CLI, which
# needs Node's require(esm) support (>=20) for its @prisma/dev dependency.
# NodeSource's setup script swaps the apt source for a current LTS first.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates curl gnupg openssl \
	&& curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
	&& apt-get install -y --no-install-recommends nodejs \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

# Must come before `bun install`: @crm/db's postinstall runs `prisma
# generate`, which only needs DATABASE_URL to resolve (never connects) — but
# needs it there already, not just before the later `bun run build`.
ARG NEXT_PUBLIC_API_URL
ARG S3_PUBLIC_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV S3_PUBLIC_URL=$S3_PUBLIC_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crm?schema=public"
ENV NEXTAUTH_SECRET="build-only-placeholder-secret-32-characters!"

RUN bun install

# `next build` targets Node's module loader for its server/proxy chunks —
# Bun's CJS interop can't load them ("Expected CommonJS module to have a
# function wrapper", a Bun bug, not ours). Build stays on Bun (fast, and
# @crm/db's prisma generate needs it); the runtime stage below switches to
# Node for `next start` so the compiled output actually runs.
RUN cd apps/app && bun run build

FROM oven/bun:1.3-debian

# Same Node 22 as the build stage — `next start` must run under Node, not
# Bun: Bun's CJS interop can't load Next's compiled proxy/middleware chunk
# (see the comment above `next build`).
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates curl gnupg openssl \
	&& curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
	&& apt-get install -y --no-install-recommends nodejs \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app .

WORKDIR /app/apps/app

EXPOSE 3000

CMD ["node", "node_modules/.bin/next", "start"]
