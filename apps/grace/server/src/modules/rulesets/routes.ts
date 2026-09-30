import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requirePermission } from '../../lib/rbac.js';
import { composeApplicability, extractSiteContext } from './compose.js';

const errorSchema = z.object({ error: z.string() });
const uuid = z.string().uuid();

const compositionSchema = z.object({
  auditType: z.string(),
  packageSlug: z.string(),
  status: z.enum(['ok', 'incomplete_context', 'not_applicable']),
  maturity: z.string(),
  disclaimer: z.string(),
  missingKeys: z.array(z.string()),
  moduleSlugs: z.array(z.string()),
  surveyKeys: z.array(z.string()),
  surveyNames: z.array(z.object({ key: z.string(), name: z.string() })),
  familyIds: z.array(z.string()),
  notes: z.array(z.string()),
  sourceHints: z.array(z.string()),
  officialArticleRefs: z.array(z.string()),
  appliedRuleIds: z.array(z.string()),
  context: z.record(z.unknown()),
});

/**
 * RuleSets / applicability routes — WHAT composition, not risk scoring.
 * Mounted under /assessments to reuse assessment auth + metadata.
 */
export async function registerApplicabilityRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  router.get(
    '/:id/applicability',
    {
      onRequest: [app.authenticate, requirePermission('assessments:read')],
      schema: {
        tags: ['assessments', 'rulesets'],
        summary: 'Compose pack/surveys recommendation from assessment SiteContext (RuleSets P0)',
        security: [{ bearerAuth: [] }],
        params: z.object({ id: uuid }),
        querystring: z.object({
          auditType: z.string().default('AUD.PRECOMMISSION.ERP'),
        }),
        response: { 200: compositionSchema, 404: errorSchema },
      },
    },
    async (req, reply) => {
      const a = await prisma.assessment.findFirst({
        where: { id: req.params.id },
        select: { id: true, metadata: true },
      });
      if (!a) return reply.code(404).send({ error: 'Assessment not found' });

      const ctx = extractSiteContext(a.metadata);
      const composition = await composeApplicability(req.query.auditType, ctx);
      return composition;
    },
  );
}
