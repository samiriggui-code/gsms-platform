import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join(__dirname, 'server/prisma/schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://qatrial:qatrial@db:5432/qatrial',
  },
  migrate: {
    async url() {
      return process.env.DATABASE_URL ?? 'postgresql://qatrial:qatrial@db:5432/qatrial';
    },
  },
});
