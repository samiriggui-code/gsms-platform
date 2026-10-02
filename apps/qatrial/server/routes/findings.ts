/**
 * Findings export — read-only, conforms to the cross-app contract
 * shared/contracts/finding.schema.json (v0.1.0) at the gsms-platform
 * root. QAtrial is the "source: qatrial" producer; Eve/CRM aggregates
 * without knowing QAtrial internals.
 *
 * Mapping:
 * - CAPA: open → non_conforme; investigation/in_progress/verification →
 *   en_cours; resolved/closed → conforme.
 * - AuditFinding: open → non_conforme; closed → conforme; else en_cours.
 *   classification → severity (critical/major/minor/observation).
 *
 * P0 limitations: client_id from env GSMS_CLIENT_ID (client mapping lives
 * CRM-side); control_ref synthetic until the crosswalk file exists.
 */

import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, getUser } from '../middleware/auth.js';
import { listAccessibleProjectIds, findAccessibleProject } from '../lib/projectAccess.js';
import {
  FINDING_VERSION,
  type Finding,
  capaStatus,
  auditFindingStatus,
  severityFromClassification,
} from '../lib/finding-contract.js';

function clientId(): string {
  return process.env.GSMS_CLIENT_ID?.trim() || 'qatrial-local';
}

const findings = new Hono();

findings.use('*', authMiddleware);

findings.get('/', async (c) => {
  try {
    const user = getUser(c);
    const status = c.req.query('status');
    const projectId = c.req.query('projectId');
    const limit = Math.min(Math.max(Number(c.req.query('limit')) || 500, 1), 1000);

    let projectIds: string[];
    if (projectId) {
      const project = await findAccessibleProject(projectId, user.orgId);
      if (!project) return c.json({ source: 'qatrial', generatedAt: new Date().toISOString(), count: 0, findings: [] });
      projectIds = [project.id];
    } else {
      projectIds = await listAccessibleProjectIds(user.orgId);
    }

    const [capas, auditFindings] = await Promise.all([
      prisma.cAPA.findMany({
        where: { projectId: { in: projectIds } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.auditFinding.findMany({
        where: { audit: { projectId: { in: projectIds } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { audit: { select: { projectId: true } } },
      }),
    ]);

    const cid = clientId();

    const capaFindings: Finding[] = capas.map((k) => ({
      version: FINDING_VERSION,
      id: `qatrial-capa-${k.id}`,
      source: 'qatrial' as const,
      category: 'qualite_capa' as const,
      status: capaStatus(k.status),
      client_id: cid,
      control_ref: k.linkedTestId ? `qatrial-test-${k.linkedTestId}` : 'qatrial-capa',
      title: k.title,
      description: k.rootCause ?? undefined,
      remediation:
        [k.correctiveAction, k.preventiveAction].filter(Boolean).join(' / ') || undefined,
      owner: k.createdBy ?? undefined,
      created_at: k.createdAt.toISOString(),
      updated_at: k.updatedAt.toISOString(),
      metadata: { project_id: k.projectId, capa_status: k.status },
    }));

    const afFindings: Finding[] = auditFindings.map((f) => {
      const sspMatch = f.area.match(/\b(SSP-\d{2})\b/i);
      const control_ref = sspMatch
        ? sspMatch[1].toUpperCase()
        : `qatrial-audit-${f.area.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      return {
        version: FINDING_VERSION,
        id: `qatrial-af-${f.id}`,
        source: 'qatrial' as const,
        category: 'qualite_capa' as const,
        status: auditFindingStatus(f.status),
        severity: severityFromClassification(f.classification),
        client_id: cid,
        control_ref,
        title: f.description.slice(0, 300),
        description: f.description,
        remediation: f.response ?? undefined,
        owner: f.responsibleParty ?? undefined,
        due_date: f.dueDate ? f.dueDate.toISOString().slice(0, 10) : undefined,
        created_at: f.createdAt.toISOString(),
        updated_at: f.updatedAt.toISOString(),
        metadata: {
          project_id: f.audit.projectId,
          audit_id: f.auditId,
          capa_id: f.capaId,
          classification: f.classification,
          area: f.area,
          ...(sspMatch ? { referentiel_hint: ['ssp-surete', control_ref] } : {}),
        },
      };
    });

    let all = [...capaFindings, ...afFindings];
    if (status) all = all.filter((f) => f.status === status);
    all = all.slice(0, limit);

    return c.json({
      source: 'qatrial',
      generatedAt: new Date().toISOString(),
      count: all.length,
      findings: all,
    });
  } catch (err) {
    console.error('findings export failed', err);
    return c.json({ message: 'Internal error' }, 500);
  }
});

export default findings;
