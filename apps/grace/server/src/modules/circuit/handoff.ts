/**
 * Circuit handoff — read-only export for Xacta / SimpleRisk / QAtrial / School.
 * Phase 7: conceptual bridge payload. Does NOT call other apps or touch risk-engine.
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requirePermission } from '../../lib/rbac.js';
import { composeApplicability, extractSiteContext } from '../rulesets/compose.js';

const errorSchema = z.object({ error: z.string() });
const uuid = z.string().uuid();

const PACKAGE_SLUG = 'erp-precommission' as const;
const AUDIT_TYPE = 'AUD.PRECOMMISSION.ERP' as const;
const HANDOFF_VERSION = '0.1.0' as const;

const TRAINING_RE =
  /\b(formation|former|ssiap|exercice|évacuation|evacuation|consigne|entraînement|entrainement)\b/i;

const handoffSchema = z.object({
  version: z.literal(HANDOFF_VERSION),
  auditType: z.literal(AUDIT_TYPE),
  generatedAt: z.string().datetime(),
  disclaimer: z.string(),
  assessment: z.object({
    id: uuid,
    title: z.string(),
    status: z.string(),
    period: z.string().nullable(),
    packageSlug: z.string(),
    clusterId: uuid.nullable(),
    assetId: uuid.nullable(),
    scopeDescription: z.string().nullable(),
  }),
  siteContext: z.record(z.unknown()),
  applicability: z.object({
    status: z.string(),
    surveyKeys: z.array(z.string()),
    moduleSlugs: z.array(z.string()),
  }),
  risks: z.array(
    z.object({
      threatId: uuid,
      label: z.string(),
      targetAssetName: z.string().nullable(),
      irv: z.string().nullable(),
      priority: z.string().nullable(),
      complianceTags: z.array(z.string()),
      targetApp: z.literal('simplerisk'),
    }),
  ),
  capas: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(['action_plan', 'gap']),
      title: z.string(),
      threatId: uuid.nullable(),
      owner: z.string().nullable(),
      dueDate: z.string().nullable(),
      status: z.string().nullable(),
      complianceTags: z.array(z.string()),
      targetApp: z.literal('qatrial'),
    }),
  ),
  trainingHints: z.array(
    z.object({
      id: z.string(),
      reason: z.string(),
      relatedCapaId: z.string().nullable(),
      suggestedDomain: z.string().nullable(),
      targetApp: z.literal('gsms-school'),
    }),
  ),
  xactaHints: z.object({
    engagementTitle: z.string(),
    suggestedWorkpapers: z.array(z.string()),
  }),
});

function threatLabel(t: {
  adversaryType: string;
  actionType: string;
  actionDescription: string | null;
}): string {
  if (t.actionDescription?.trim()) return t.actionDescription.trim().slice(0, 200);
  return `${t.adversaryType} / ${t.actionType}`;
}

export async function registerCircuitHandoffRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  router.get(
    '/:id/circuit-handoff',
    {
      onRequest: [app.authenticate, requirePermission('assessments:read')],
      schema: {
        tags: ['assessments', 'circuit'],
        summary: 'Read-only circuit handoff payload (Xacta / SimpleRisk / QAtrial / School)',
        security: [{ bearerAuth: [] }],
        params: z.object({ id: uuid }),
        response: { 200: handoffSchema, 404: errorSchema },
      },
    },
    async (req, reply) => {
      const a = await prisma.assessment.findFirst({
        where: { id: req.params.id },
        select: {
          id: true,
          title: true,
          status: true,
          period: true,
          clusterId: true,
          assetId: true,
          scopeDescription: true,
          metadata: true,
          threats: {
            select: {
              id: true,
              adversaryType: true,
              actionType: true,
              actionDescription: true,
              irv: true,
              riskTreatmentPriority: true,
              complianceTags: true,
              targetAsset: { select: { name: true } },
              actionPlans: {
                select: {
                  id: true,
                  actionRequired: true,
                  responsiblePerson: true,
                  targetDate: true,
                  status: true,
                  complianceTags: true,
                  threatId: true,
                },
              },
            },
          },
          countermeasureGaps: {
            where: { isOpen: true },
            select: {
              id: true,
              description: true,
              recommendedAction: true,
              threatId: true,
              gapSeverity: true,
            },
          },
        },
      });
      if (!a) return reply.code(404).send({ error: 'Assessment not found' });

      const siteContext = extractSiteContext(a.metadata, PACKAGE_SLUG);
      const applicability = await composeApplicability(AUDIT_TYPE, siteContext);

      const risks = a.threats.map((t) => ({
        threatId: t.id,
        label: threatLabel(t),
        targetAssetName: t.targetAsset?.name ?? null,
        irv: t.irv,
        priority: t.riskTreatmentPriority,
        complianceTags: t.complianceTags,
        targetApp: 'simplerisk' as const,
      }));

      const capas = [
        ...a.threats.flatMap((t) =>
          t.actionPlans.map((p) => ({
            id: p.id,
            kind: 'action_plan' as const,
            title: p.actionRequired,
            threatId: p.threatId,
            owner: p.responsiblePerson,
            dueDate: p.targetDate ? p.targetDate.toISOString().slice(0, 10) : null,
            status: p.status,
            complianceTags: p.complianceTags,
            targetApp: 'qatrial' as const,
          })),
        ),
        ...a.countermeasureGaps.map((g) => ({
          id: g.id,
          kind: 'gap' as const,
          title: g.recommendedAction?.trim() || g.description,
          threatId: g.threatId,
          owner: null,
          dueDate: null,
          status: g.gapSeverity,
          complianceTags: [] as string[],
          targetApp: 'qatrial' as const,
        })),
      ];

      const trainingHints: Array<{
        id: string;
        reason: string;
        relatedCapaId: string | null;
        suggestedDomain: string | null;
        targetApp: 'gsms-school';
      }> = [];

      if (siteContext.ssiap_required === true) {
        trainingHints.push({
          id: 'hint-ssiap-context',
          reason: 'SiteContext ssiap_required=true — vérifier besoin formation / effectif SSIAP (School).',
          relatedCapaId: null,
          suggestedDomain: 'SSIAP',
          targetApp: 'gsms-school',
        });
      }

      for (const c of capas) {
        if (c.kind === 'action_plan' && TRAINING_RE.test(c.title)) {
          trainingHints.push({
            id: `hint-capa-${c.id}`,
            reason: `Action plan évoque formation / consignes / exercice : « ${c.title.slice(0, 120)} »`,
            relatedCapaId: c.id,
            suggestedDomain: /ssiap/i.test(c.title) ? 'SSIAP' : 'EVACUATION',
            targetApp: 'gsms-school',
          });
        }
      }

      for (const t of a.threats) {
        const tags = t.complianceTags ?? [];
        if (tags.includes('FR_SSI') || tags.includes('FR_CNAPS')) {
          trainingHints.push({
            id: `hint-tag-${t.id}`,
            reason: `Threat taguée ${tags.filter((x) => x.startsWith('FR_')).join(', ')} — évaluer besoin formation associé.`,
            relatedCapaId: null,
            suggestedDomain: tags.includes('FR_CNAPS') ? 'CNAPS' : 'SSI',
            targetApp: 'gsms-school',
          });
        }
      }

      // Dedupe by id
      const seen = new Set<string>();
      const uniqueHints = trainingHints.filter((h) => {
        if (seen.has(h.id)) return false;
        seen.add(h.id);
        return true;
      });

      return {
        version: HANDOFF_VERSION,
        auditType: AUDIT_TYPE,
        generatedAt: new Date().toISOString(),
        disclaimer:
          'Export circuit P0 — pont conceptuel. Contenu terrain = checklist opérationnelle, pas articles Légifrance atomiques. ' +
          'Ne pas importer comme conformité opposable. Voir docs/circuit/CIRCUIT-PRECOM-ERP.md et SOURCES-STATUS-ERP-PRECOM.md.',
        assessment: {
          id: a.id,
          title: a.title,
          status: a.status,
          period: a.period,
          packageSlug: PACKAGE_SLUG,
          clusterId: a.clusterId,
          assetId: a.assetId,
          scopeDescription: a.scopeDescription,
        },
        siteContext,
        applicability: {
          status: applicability.status,
          surveyKeys: applicability.surveyKeys,
          moduleSlugs: applicability.moduleSlugs,
        },
        risks,
        capas,
        trainingHints: uniqueHints,
        xactaHints: {
          engagementTitle: a.title,
          suggestedWorkpapers: applicability.surveyNames.map((s) => s.name),
        },
      };
    },
  );
}
