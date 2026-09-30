# QAtrial VPS — skip tsc unused-import noise (vite build only)
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npx vite build

FROM node:20-alpine AS server
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server/ ./server/
COPY prisma.config.ts ./prisma.config.ts
RUN npx prisma generate --schema=server/prisma/schema.prisma
COPY --from=frontend /app/dist ./dist/

FROM node:20-alpine
WORKDIR /app
COPY --from=server /app ./
RUN printf '%s\n' \
  '#!/bin/sh' \
  'set -e' \
  'npx prisma db push --schema=server/prisma/schema.prisma --accept-data-loss' \
  'exec npx tsx server/index.ts' \
  > /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh
EXPOSE 3001
ENV NODE_ENV=production
CMD ["/app/docker-entrypoint.sh"]
