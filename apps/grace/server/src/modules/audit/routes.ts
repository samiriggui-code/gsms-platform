import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requirePermission } from '../../lib/rbac.js';

const uuid = z.string().uuid();

const SNAPSHOT_REASONS = [
  'SUBMITTED_FOR_REVIEW', 'APPROVED', 'REJECTED', 'MANUAL_SAVE',
  'STEP_ADVANCED', 'THREAT_ADDED', 'THREAT_REMOVED',
  'RECOMMENDATION_ADDED', 'METADATA_UPDATED',
] as const;

const auditEventSchema = z.object({
  id: uuid,
  kind: z.literal('SNAPSHOT'),
  assessmentId: uuid,
  assessmentTitle: z.string(),
  capturedAt: z.string().datetime(),
  capturedById: uuid,
  capturedByName: z.string().nullable(),
  reason: z.enum(SNAPSHOT_REASONS),
  note: z.string().nullable(),
});

export default async function auditRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  router.get(
    '/',
    {
      onRequest: [app.authenticate, requirePermission('assessments:read')],
      schema: {
        tags: ['audit'],
        summary: 'Cross-assessment audit feed (assessment snapshots)',
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(500).default(100),
          reason: z.enum(SNAPSHOT_REASONS).optional(),
        }),
        response: { 200: z.object({ items: z.array(auditEventSchema) }) },
      },
    },
    async (req) => {
      const items = await prisma.assessmentSnapshot.findMany({
        where: req.query.reason ? { reason: req.query.reason } : undefined,
        include: {
          assessment: { select: { title: true } },
          capturedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: [{ capturedAt: 'desc' }],
        take: req.query.limit,
      });

      return {
        items: items.map((s) => {
          const payload = s.payload as { note?: string | null } | null;
          return {
            id: s.id,
            kind: 'SNAPSHOT' as const,
            assessmentId: s.assessmentId,
            assessmentTitle: s.assessment.title,
            capturedAt: s.capturedAt.toISOString(),
            capturedById: s.capturedById,
            capturedByName: `${s.capturedBy.firstName} ${s.capturedBy.lastName}`,
            reason: s.reason as (typeof SNAPSHOT_REASONS)[number],
            note: payload?.note ?? null,
          };
        }),
      };
    },
  );
}
