/**
 * Findings export — read-only, conforms to the cross-app contract
 * docs/circuit/contracts/finding.schema.json (v0.1.0) at the platform root.
 * Grace is the "source: grace" producer; Eve/CRM aggregates without knowing
 * Grace internals. Does NOT touch risk-engine, does NOT call other apps.
 *
 * P0 limitations (explicit):
 * - client_id comes from env GSMS_CLIENT_ID (Grace has no client entity;
 *   the client mapping lives CRM-side).
 * - control_ref is a stable synthetic ref (countermeasure id / gap type /
 *   threat action type) until a real crosswalk file exists.
 * - Threats export as status "a_verifier" (a scored risk is not by itself
 *   a non-conformity); open gaps export as "non_conforme", closed as "conforme".
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requirePermission } from '../../lib/rbac.js';
import { mergeReferentiel, resolveSspControlRef } from './control-ref-map.js';
import {
  cyberStatusToFindingStatus,
  listCyberResponses,
} from './cyber-store.js';

export const FINDING_VERSION = '0.1.0' as const;

export const categoryEnum = z.enum([
  'acces_physique',
  'incendie_prevention',
  'habilitation_agent',
  'materiel_securite',
  'cyber',
  'piece_ao',
  'qualite_capa',
  'administratif',
]);

export const statusEnum = z.enum([
  'conforme',
  'non_conforme',
  'en_cours',
  'non_applicable',
  'a_verifier',
]);

export const severityEnum = z.enum(['critique', 'majeure', 'mineure', 'information']);

export const findingSourceEnum = z.enum(['grace', 'module-cyber']);

export const findingSchema = z.object({
  version: z.literal(FINDING_VERSION),
  id: z.string(),
  source: findingSourceEnum,
  category: categoryEnum,
  status: statusEnum,
  severity: severityEnum.optional(),
  client_id: z.string(),
  site_id: z.string().optional(),
  control_ref: z.string(),
  referentiel: z.array(z.string()).optional(),
  title: z.string(),
  description: z.string().optional(),
  remediation: z.string().optional(),
  owner: z.string().optional(),
  due_date: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const envelopeSchema = z.object({
  source: z.literal('grace'),
  generatedAt: z.string().datetime(),
  count: z.number().int(),
  findings: z.array(findingSchema),
});

type Finding = z.infer<typeof findingSchema>;

const FIRE_TAGS = ['FR_SSI', 'FR_ERP', 'FR_IGH', 'FR_COMMISSION'];

function categoryFromTags(tags: string[]): z.infer<typeof categoryEnum> {
  if (tags.includes('FR_CNAPS')) return 'habilitation_agent';
  if (tags.some((t) => FIRE_TAGS.includes(t))) return 'incendie_prevention';
  return 'acces_physique';
}

function severityFromGap(
  s: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
): z.infer<typeof severityEnum> {
  if (s === 'CRITICAL') return 'critique';
  if (s === 'HIGH') return 'majeure';
  if (s === 'MEDIUM') return 'mineure';
  return 'information';
}

function severityFromPriority(
  p: 'LOW' | 'MEDIUM' | 'HIGH' | 'HIGHEST' | null,
): z.infer<typeof severityEnum> | undefined {
  if (p === 'HIGHEST') return 'critique';
  if (p === 'HIGH') return 'majeure';
  if (p === 'MEDIUM') return 'mineure';
  if (p === 'LOW') return 'information';
  return undefined;
}

function threatLabel(t: {
  adversaryType: string;
  actionType: string;
  actionDescription: string | null;
}): string {
  if (t.actionDescription?.trim()) return t.actionDescription.trim().slice(0, 300);
  return `${t.adversaryType} / ${t.actionType}`;
}

function clientId(): string {
  return process.env.GSMS_CLIENT_ID?.trim() || 'grace-local';
}

export async function registerFindingsRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>();

  router.get(
    '/',
    {
      onRequest: [app.authenticate, requirePermission('assessments:read')],
      schema: {
        tags: ['circuit', 'findings'],
        summary:
          'Read-only findings export (contract finding.schema.json v0.1.0, source=grace) for the Eve/CRM aggregator',
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          status: statusEnum.optional(),
          category: categoryEnum.optional(),
          assessmentId: z.string().uuid().optional(),
          includeCyber: z
            .union([z.literal('1'), z.literal('0'), z.literal('true'), z.literal('false')])
            .optional()
            .transform((v) => v === '1' || v === 'true'),
          limit: z.coerce.number().int().min(1).max(1000).default(500),
        }),
        response: { 200: envelopeSchema },
      },
    },
    async (req) => {
      const { status, category, assessmentId, includeCyber, limit } = req.query;
      const cid = clientId();

      const [gaps, threats] = await Promise.all([
        prisma.countermeasureGap.findMany({
          where: assessmentId ? { assessmentId } : undefined,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            assessmentId: true,
            threatId: true,
            countermeasureId: true,
            gapType: true,
            gapSeverity: true,
            description: true,
            recommendedAction: true,
            isOpen: true,
            closedAt: true,
            createdAt: true,
            threat: {
              select: {
                complianceTags: true,
                targetAssetId: true,
              },
            },
          },
        }),
        prisma.threat.findMany({
          where: assessmentId ? { assessmentId } : undefined,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            assessmentId: true,
            adversaryType: true,
            actionType: true,
            actionDescription: true,
            irv: true,
            riskTreatmentPriority: true,
            complianceTags: true,
            targetAssetId: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);

      const gapFindings: Finding[] = gaps.map((g) => {
        const tags = g.threat?.complianceTags ?? [];
        const synthetic = g.countermeasureId
          ? `grace-cm-${g.countermeasureId}`
          : `grace-gaptype-${g.gapType.toLowerCase()}`;
        const ssp = resolveSspControlRef({
          complianceTags: tags,
          text: `${g.description} ${g.recommendedAction ?? ''}`,
          gapType: g.gapType,
        });
        return {
          version: FINDING_VERSION,
          id: `grace-gap-${g.id}`,
          source: 'grace' as const,
          category: categoryFromTags(tags),
          status: g.isOpen ? ('non_conforme' as const) : ('conforme' as const),
          severity: severityFromGap(g.gapSeverity),
          client_id: cid,
          site_id: g.threat?.targetAssetId ?? undefined,
          control_ref: ssp?.control_ref ?? synthetic,
          referentiel: mergeReferentiel(tags.length ? tags : undefined, ssp),
          title: (g.recommendedAction?.trim() || g.description).slice(0, 300),
          description: g.description,
          remediation: g.recommendedAction ?? undefined,
          created_at: g.createdAt.toISOString(),
          updated_at: (g.closedAt ?? g.createdAt).toISOString(),
          metadata: {
            assessment_id: g.assessmentId,
            threat_id: g.threatId,
            gap_type: g.gapType,
            ...(ssp
              ? { ssp_name: ssp.ssp_name, legacy_control_ref: synthetic }
              : {}),
          },
        };
      });

      const threatFindings: Finding[] = threats.map((t) => {
        const synthetic = `grace-threat-${t.actionType.toLowerCase()}`;
        const ssp = resolveSspControlRef({
          complianceTags: t.complianceTags,
          text: t.actionDescription,
        });
        return {
          version: FINDING_VERSION,
          id: `grace-thr-${t.id}`,
          source: 'grace' as const,
          category: categoryFromTags(t.complianceTags ?? []),
          status: 'a_verifier' as const,
          severity: severityFromPriority(t.riskTreatmentPriority),
          client_id: cid,
          site_id: t.targetAssetId,
          control_ref: ssp?.control_ref ?? synthetic,
          referentiel: mergeReferentiel(
            t.complianceTags?.length ? t.complianceTags : undefined,
            ssp,
          ),
          title: threatLabel(t),
          created_at: t.createdAt.toISOString(),
          updated_at: t.updatedAt.toISOString(),
          metadata: {
            assessment_id: t.assessmentId,
            irv: t.irv,
            ...(ssp
              ? { ssp_name: ssp.ssp_name, legacy_control_ref: synthetic }
              : {}),
          },
        };
      });

      let findings = [...gapFindings, ...threatFindings];

      if (includeCyber) {
        const cyberRows = await listCyberResponses();
        const cyberFindings: Finding[] = cyberRows.map((r) => {
          const controlRef = r.controlIdentifier.trim();
          return {
            version: FINDING_VERSION,
            id: `module-cyber-${r.id}`,
            source: 'module-cyber' as const,
            category: 'cyber' as const,
            status: cyberStatusToFindingStatus(r.status),
            client_id: cid,
            site_id: r.siteId,
            control_ref: controlRef || r.controlIdentifier,
            referentiel: [r.catalogSlug],
            title: r.controlName.trim() || controlRef,
            description: r.notes,
            created_at: r.updatedAt,
            updated_at: r.updatedAt,
            metadata: {
              catalog: r.catalogSlug,
              evidence_count: r.evidence.length,
              cyber_status: r.status,
            },
          };
        });
        findings = [...findings, ...cyberFindings];
      }

      if (status) findings = findings.filter((f) => f.status === status);
      if (category) findings = findings.filter((f) => f.category === category);
      findings = findings.slice(0, limit);

      return {
        source: 'grace' as const,
        generatedAt: new Date().toISOString(),
        count: findings.length,
        findings,
      };
    },
  );
}
