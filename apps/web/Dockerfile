# GSMS Web — image autonome Next.js (output: "standalone").
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S gsms && adduser -S -G gsms -u 10001 gsms
COPY --from=build --chown=gsms:gsms /app/.next/standalone ./
COPY --from=build --chown=gsms:gsms /app/.next/static ./.next/static
COPY --from=build --chown=gsms:gsms /app/public ./public
USER gsms
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --retries=30 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "server.js"]
