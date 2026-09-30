import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requirePermission } from '../../lib/rbac.js';
import type { JwtPayload } from '../../lib/jwt.js';

const errorSchema = z.object({ error: z.string() });
const uuid = z.string().uuid();

const severityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const statusEnum = z.enum(['OPEN', 'INVESTIGATING', 'CONTAINED', 'CLOSED']);

const incidentSchema = z.object({
  id: uuid,
  title: z.string(),
  description: z.string().nullable(),
  severity: severityEnum,
  status: statusEnum,
  occurredAt: z.string().datetime(),
  reportedAt: z.string().datetime(),
  closedAt: z.string().datetime().nullable(),
  assetId: uuid.nullable(),
  assetName: z.string().nullable(),
  threatId: uuid.nullable(),
  threatLabel: z.string().nullable(),
  reportedById: uuid,
  reportedByName: z.string().nullable(),
  resolutionNotes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().nullable().optional(),
  severity: severityEnum.default('MEDIUM'),
  status: statusEnum.default('OPEN'),
  occurredAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  assetId: uuid.nullable().optional(),
  threatId: uuid.nullable().optional(),
  resolutionNotes: z.string().nullable().optional(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  severity: severityEnum.optional(),
  status: statusEnum.optional(),
  occurredAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  assetId: uuid.nullable().optional(),
  threatId: uuid.nullable().optional(),
  resolutionNotes: z.string().nullable().optional(),
});

type IncidentRow = {
  id: string;
  title: string;
  description: string | null;
  severity: z.infer<typeof severityEnum>;
  status: z.infer<typeof statusEnum>;
  occurredAt: Date;
  reportedAt: Date;
  closedAt: Date | null;
  assetId: string | null;
  threatId: string | null;
  reportedById: string;
  resolutionNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  asset: { name: string } | null;
  threat: { adversaryType: string; actionType: string } | null;
  reportedBy: { firstName: string; lastName: string } | null;
};

function serialize(row: IncidentRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
    occurredAt: row.occurredAt.toISOString(),
    reportedAt: row.reportedAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
    assetId: row.assetId,
    assetName: row.asset?.name ?? null,
    threatId: row.threatId,
    threatLabel: row.threat
      ? `${row.threat.adversaryType} · ${row.threat.actionType}`
      : null,
    reportedById: row.reportedById,
    reportedByName: row.reportedBy
      ? `${row.reportedBy.firstName} ${row.reportedBy.lastName}`
      : null,
    resolutionNotes: row.resolutionNotes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const include = {
  asset: { select: { name: true } },
  threat: { select: { adversaryType: true, actionType: true } },
  reportedBy: { select: { firstName: true, lastName: true } },
} as const;

function parseOccurredAt(raw: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T00:00:00.000Z`);
  return new Date(raw);
}

export default async function incidentRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  router.get(
    '/',
    {
      onRequest: [app.authenticate, requirePermission('incidents:read')],
      schema: {
        tags: ['incidents'],
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          status: statusEnum.optional(),
          severity: severityEnum.optional(),
          search: z.string().optional(),
        }),
        response: { 200: z.object({ items: z.array(incidentSchema) }) },
      },
    },
    async (req) => {
      const where: Record<string, unknown> = {};
      if (req.query.status) where.status = req.query.status;
      if (req.query.severity) where.severity = req.query.severity;
      if (req.query.search?.trim()) {
        where.OR = [
          { title: { contains: req.query.search.trim(), mode: 'insensitive' } },
          { description: { contains: req.query.search.trim(), mode: 'insensitive' } },
        ];
      }
      const items = await prisma.incident.findMany({
        where,
        include,
        orderBy: [{ occurredAt: 'desc' }],
      });
      return { items: items.map((row) => serialize(row as IncidentRow)) };
    },
  );

  router.post(
    '/',
    {
      onRequest: [app.authenticate, requirePermission('incidents:write')],
      schema: {
        tags: ['incidents'],
        security: [{ bearerAuth: [] }],
        body: createSchema,
        response: { 201: incidentSchema, 400: errorSchema, 404: errorSchema },
      },
    },
    async (req, reply) => {
      const user = req.user as JwtPayload;
      if (req.body.assetId) {
        const asset = await prisma.asset.findFirst({ where: { id: req.body.assetId }, select: { id: true } });
        if (!asset) return reply.code(404).send({ error: 'Asset not found' });
      }
      if (req.body.threatId) {
        const threat = await prisma.threat.findFirst({ where: { id: req.body.threatId }, select: { id: true } });
        if (!threat) return reply.code(404).send({ error: 'Threat not found' });
      }

      const created = await prisma.incident.create({
        data: {
          title: req.body.title,
          description: req.body.description ?? null,
          severity: req.body.severity,
          status: req.body.status,
          occurredAt: parseOccurredAt(req.body.occurredAt),
          assetId: req.body.assetId ?? null,
          threatId: req.body.threatId ?? null,
          reportedById: user.sub,
          resolutionNotes: req.body.resolutionNotes ?? null,
          closedAt: req.body.status === 'CLOSED' ? new Date() : null,
        },
        include,
      });
      return reply.code(201).send(serialize(created as IncidentRow));
    },
  );

  router.patch(
    '/:id',
    {
      onRequest: [app.authenticate, requirePermission('incidents:write')],
      schema: {
        tags: ['incidents'],
        security: [{ bearerAuth: [] }],
        params: z.object({ id: uuid }),
        body: updateSchema,
        response: { 200: incidentSchema, 404: errorSchema },
      },
    },
    async (req, reply) => {
      const existing = await prisma.incident.findFirst({
        where: { id: req.params.id },
        select: { id: true, status: true },
      });
      if (!existing) return reply.code(404).send({ error: 'Incident not found' });

      const data: Record<string, unknown> = {};
      if (req.body.title !== undefined) data.title = req.body.title;
      if (req.body.description !== undefined) data.description = req.body.description;
      if (req.body.severity !== undefined) data.severity = req.body.severity;
      if (req.body.assetId !== undefined) data.assetId = req.body.assetId;
      if (req.body.threatId !== undefined) data.threatId = req.body.threatId;
      if (req.body.resolutionNotes !== undefined) data.resolutionNotes = req.body.resolutionNotes;
      if (req.body.occurredAt !== undefined) data.occurredAt = parseOccurredAt(req.body.occurredAt);
      if (req.body.status !== undefined) {
        data.status = req.body.status;
        if (req.body.status === 'CLOSED' && existing.status !== 'CLOSED') {
          data.closedAt = new Date();
        }
        if (req.body.status !== 'CLOSED') data.closedAt = null;
      }

      const updated = await prisma.incident.update({
        where: { id: existing.id },
        data,
        include,
      });
      return serialize(updated as IncidentRow);
    },
  );

  router.delete(
    '/:id',
    {
      onRequest: [app.authenticate, requirePermission('incidents:write')],
      schema: {
        tags: ['incidents'],
        security: [{ bearerAuth: [] }],
        params: z.object({ id: uuid }),
        response: { 204: z.null(), 404: errorSchema },
      },
    },
    async (req, reply) => {
      const existing = await prisma.incident.findFirst({
        where: { id: req.params.id },
        select: { id: true },
      });
      if (!existing) return reply.code(404).send({ error: 'Incident not found' });
      await prisma.incident.delete({ where: { id: existing.id } });
      return reply.code(204).send(null);
    },
  );
}
