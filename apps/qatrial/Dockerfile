# Stage 1: Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Same-origin /api when SPA is served by Hono on :3001
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: Build server
FROM node:20-alpine AS server
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server/ ./server/
RUN npx prisma generate --schema=server/prisma/schema.prisma
COPY --from=frontend /app/dist ./dist/

# Stage 3: Runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=server /app ./
EXPOSE 3001
ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://qatrial:qatrial@db:5432/qatrial
CMD ["npx", "tsx", "server/index.ts"]
