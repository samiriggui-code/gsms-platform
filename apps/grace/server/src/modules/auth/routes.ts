import { createReadStream } from 'node:fs';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { getInstanceOrg, invalidateInstanceOrg } from '../../lib/instance-org.js';
import type { JwtPayload } from '../../lib/jwt.js';
import {
  registerSchema,
  loginSchema,
  authResponseSchema,
  meResponseSchema,
  meUpdateSchema,
  meAvatarUploadSchema,
} from './schema.js';

const errorSchema = z.object({ error: z.string() });
const __dirname = dirname(fileURLToPath(import.meta.url));

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'LEAD_ASSESSOR' | 'ASSESSOR' | 'REVIEWER' | 'STAKEHOLDER';
  avatarPath?: string | null;
};

export function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    hasAvatar: Boolean(user.avatarPath),
  };
}

async function avatarsRoot(): Promise<string> {
  const candidates = [
    join(process.cwd(), 'uploads/avatars'),
    join(process.cwd(), 'server/uploads/avatars'),
    join(__dirname, '../../../../uploads/avatars'),
  ];
  const root = candidates[0]!;
  await mkdir(root, { recursive: true });
  return root;
}

function mimeFromPath(p: string): string {
  const ext = extname(p).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

function extFromMime(mime: string): string {
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  return '.jpg';
}

export default async function authRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  router.post(
    '/register',
    {
      schema: {
        tags: ['auth'],
        summary: 'Bootstrap instance (first-run only)',
        body: registerSchema,
        response: { 201: authResponseSchema, 410: errorSchema, 400: errorSchema },
      },
    },
    async (req, reply) => {
      const data = req.body;

      const userCount = await prisma.user.count();
      if (userCount > 0) {
        return reply.code(410).send({ error: 'Instance already bootstrapped' });
      }

      const passwordHash = await bcrypt.hash(data.password, 12);

      const { org, user } = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: { name: data.organizationName, slug: data.organizationSlug },
        });
        const user = await tx.user.create({
          data: {
            email: data.email,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            role: 'ADMIN',
          },
        });
        return { org, user };
      });

      invalidateInstanceOrg();

      const token = await reply.jwtSign({
        sub: user.id,
        role: user.role,
        email: user.email,
      });

      return reply.code(201).send({
        token,
        user: publicUser(user),
        organization: { id: org.id, name: org.name, slug: org.slug },
      });
    },
  );

  router.post(
    '/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Log in with email + password',
        body: loginSchema,
        response: { 200: authResponseSchema, 401: errorSchema },
      },
    },
    async (req, reply) => {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.isActive) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const org = await getInstanceOrg();

      const token = await reply.jwtSign({
        sub: user.id,
        role: user.role,
        email: user.email,
      });

      return reply.send({
        token,
        user: publicUser(user),
        organization: { id: org.id, name: org.name, slug: org.slug },
      });
    },
  );

  router.get(
    '/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Current user + instance organization',
        security: [{ bearerAuth: [] }],
        response: { 200: meResponseSchema, 401: errorSchema, 404: errorSchema },
      },
    },
    async (req, reply) => {
      const jwt = req.user as JwtPayload;
      const user = await prisma.user.findUnique({ where: { id: jwt.sub } });
      if (!user) return reply.code(404).send({ error: 'User not found' });

      const org = await getInstanceOrg();

      return reply.send({
        ...publicUser(user),
        organization: { id: org.id, name: org.name, slug: org.slug },
      });
    },
  );

  router.patch(
    '/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Update current user profile (self)',
        security: [{ bearerAuth: [] }],
        body: meUpdateSchema,
        response: { 200: meResponseSchema, 400: errorSchema, 401: errorSchema, 404: errorSchema },
      },
    },
    async (req, reply) => {
      const jwt = req.user as JwtPayload;
      if (!req.body.firstName && !req.body.lastName) {
        return reply.code(400).send({ error: 'Nothing to update' });
      }

      const existing = await prisma.user.findUnique({ where: { id: jwt.sub } });
      if (!existing) return reply.code(404).send({ error: 'User not found' });

      const user = await prisma.user.update({
        where: { id: jwt.sub },
        data: {
          ...(req.body.firstName !== undefined ? { firstName: req.body.firstName } : {}),
          ...(req.body.lastName !== undefined ? { lastName: req.body.lastName } : {}),
        },
      });

      const org = await getInstanceOrg();

      return reply.send({
        ...publicUser(user),
        organization: { id: org.id, name: org.name, slug: org.slug },
      });
    },
  );

  router.get(
    '/me/avatar',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Download current user avatar image',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req, reply) => {
      const jwt = req.user as JwtPayload;
      const user = await prisma.user.findUnique({
        where: { id: jwt.sub },
        select: { avatarPath: true },
      });
      if (!user?.avatarPath) return reply.code(404).send({ error: 'No avatar' });

      const abs = join(process.cwd(), user.avatarPath);
      try {
        await access(abs);
      } catch {
        return reply.code(404).send({ error: 'Avatar file missing' });
      }

      reply.header('Content-Type', mimeFromPath(abs));
      reply.header('Cache-Control', 'private, max-age=3600');
      return reply.send(createReadStream(abs));
    },
  );

  router.put(
    '/me/avatar',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Upload current user avatar (base64 image)',
        security: [{ bearerAuth: [] }],
        body: meAvatarUploadSchema,
        response: { 200: meResponseSchema, 400: errorSchema, 413: errorSchema, 404: errorSchema },
      },
    },
    async (req, reply) => {
      const jwt = req.user as JwtPayload;
      const buf = Buffer.from(req.body.contentBase64, 'base64');
      if (buf.length > 800_000) {
        return reply.code(413).send({ error: 'file_too_large' });
      }

      const existing = await prisma.user.findUnique({ where: { id: jwt.sub } });
      if (!existing) return reply.code(404).send({ error: 'User not found' });

      const root = await avatarsRoot();
      const ext = extFromMime(req.body.mimeType);
      const rel = `uploads/avatars/${jwt.sub}${ext}`;
      const abs = join(process.cwd(), rel);
      await mkdir(dirname(abs), { recursive: true });

      if (existing.avatarPath && existing.avatarPath !== rel) {
        try {
          await unlink(join(process.cwd(), existing.avatarPath));
        } catch {
          /* ignore */
        }
      }

      await writeFile(abs, buf);
      const user = await prisma.user.update({
        where: { id: jwt.sub },
        data: { avatarPath: rel },
      });

      const org = await getInstanceOrg();
      return reply.send({
        ...publicUser(user),
        organization: { id: org.id, name: org.name, slug: org.slug },
      });
    },
  );

  router.delete(
    '/me/avatar',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Remove current user avatar',
        security: [{ bearerAuth: [] }],
        response: { 200: meResponseSchema, 404: errorSchema },
      },
    },
    async (req, reply) => {
      const jwt = req.user as JwtPayload;
      const existing = await prisma.user.findUnique({ where: { id: jwt.sub } });
      if (!existing) return reply.code(404).send({ error: 'User not found' });

      if (existing.avatarPath) {
        try {
          await unlink(join(process.cwd(), existing.avatarPath));
        } catch {
          /* ignore */
        }
      }

      const user = await prisma.user.update({
        where: { id: jwt.sub },
        data: { avatarPath: null },
      });
      const org = await getInstanceOrg();
      return reply.send({
        ...publicUser(user),
        organization: { id: org.id, name: org.name, slug: org.slug },
      });
    },
  );
}
