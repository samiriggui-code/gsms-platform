#!/bin/sh
set -e
npx prisma db push --schema=server/prisma/schema.prisma --accept-data-loss
exec npx tsx server/index.ts
