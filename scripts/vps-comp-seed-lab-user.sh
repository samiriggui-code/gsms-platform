#!/bin/bash
set -euo pipefail

echo "=== lab user count before ==="
docker exec gsms-comp-postgres psql -U postgres -d comp -tAc 'SELECT COUNT(*) FROM "User" WHERE email='"'"'samir@gsms.local'"'"';'

cat >/tmp/seed-lab.mjs <<'EOF'
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL missing');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const email = 'samir@gsms.local';
const password = 'gsms-local';
const hash = await bcrypt.hash(password, 10);
const user = await prisma.user.upsert({
  where: { email },
  update: {
    password: hash,
    emailVerified: true,
    role: 'admin',
    isPlatformAdmin: true,
    banned: false,
  },
  create: {
    name: 'Samir GSMS',
    email,
    emailVerified: true,
    password: hash,
    role: 'admin',
    isPlatformAdmin: true,
  },
});
let org = await prisma.organization.findFirst({ where: { slug: 'gsms' } });
if (!org) {
  org = await prisma.organization.create({
    data: {
      name: 'GSMS',
      slug: 'gsms',
      hasAccess: true,
      onboardingCompleted: true,
      website: 'https://global-it-ss.com',
    },
  });
}
const existingMember = await prisma.member.findFirst({
  where: { organizationId: org.id, userId: user.id },
});
if (!existingMember) {
  await prisma.member.create({
    data: { organizationId: org.id, userId: user.id, role: 'owner' },
  });
} else {
  await prisma.member.update({
    where: { id: existingMember.id },
    data: { role: 'owner', isActive: true, deactivated: false },
  });
}
await prisma.user.update({
  where: { id: user.id },
  data: { lastActiveOrganizationId: org.id },
});
try {
  await prisma.onboarding.upsert({
    where: { organizationId: org.id },
    update: {},
    create: { organizationId: org.id },
  });
} catch (e) {
  console.warn('onboarding upsert skipped', e.message);
}
const fresh = await prisma.user.findUnique({ where: { email } });
const ok = await bcrypt.compare(password, fresh.password);
console.log(JSON.stringify({ email, orgId: org.id, userId: user.id, passwordOk: ok }));
await prisma.$disconnect();
EOF

docker cp /tmp/seed-lab.mjs gsms-comp-api:/tmp/seed-lab.mjs
docker exec -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/comp \
  -w /app gsms-comp-api node /tmp/seed-lab.mjs

echo "=== lab user after ==="
docker exec gsms-comp-postgres psql -U postgres -d comp -tAc 'SELECT email, CASE WHEN password IS NULL OR password='"'"''"'"' THEN '"'"'no-password'"'"' ELSE '"'"'has-password'"'"' END FROM "User" WHERE email='"'"'samir@gsms.local'"'"';'
