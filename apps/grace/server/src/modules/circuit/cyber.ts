/**
 * Cyber checklist API — ISO27001 / SOC2 responses + local evidence files.
 * Emits Finding source=module-cyber via GET /api/findings?includeCyber=1 (merged in findings.ts).
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requirePermission } from '../../lib/rbac.js';
import {
  attachEvidence,
  listCyberResponses,
  upsertCyberResponse,
  type CyberStatus,
} from './cyber-store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const statusEnum = z.enum([
  'not_started',
  'in_progress',
  'conforme',
  'non_conforme',
  'non_applicable',
]);

async function uploadsRoot(): Promise<string> {
  const candidates = [
    join(process.cwd(), 'uploads/cyber'),
    join(process.cwd(), 'server/uploads/cyber'),
    join(__dirname, '../../../../uploads/cyber'),
  ];
  const root = candidates[0]!;
  await mkdir(root, { recursive: true });
  return root;
}

export async function registerCyberRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    '/responses',
    {
      onRequest: [app.authenticate, requirePermission('assessments:read')],
      schema: {
        tags: ['circuit', 'cyber'],
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          catalog: z.enum(['iso27001-2022', 'soc2-tsc']).optional(),
          siteId: z.string().optional(),
        }),
      },
    },
    async (req) => {
      const responses = await listCyberResponses({
        catalogSlug: req.query.catalog,
        siteId: req.query.siteId,
      });
      return { source: 'module-cyber', count: responses.length, responses };
    },
  );

  r.put(
    '/responses',
    {
      onRequest: [app.authenticate, requirePermission('assessments:write')],
      schema: {
        tags: ['circuit', 'cyber'],
        security: [{ bearerAuth: [] }],
        body: z.object({
          catalogSlug: z.enum(['iso27001-2022', 'soc2-tsc']),
          controlIdentifier: z.string().min(1),
          controlName: z.string().min(1),
          status: statusEnum,
          notes: z.string().optional(),
          siteId: z.string().optional(),
        }),
      },
    },
    async (req) => {
      const user = req.user as { sub?: string };
      const row = await upsertCyberResponse({
        ...req.body,
        status: req.body.status as CyberStatus,
        updatedBy: user?.sub,
      });
      return { response: row };
    },
  );

  /** P0: JSON body with base64 file (max ~1.5MB encoded). */
  r.post(
    '/evidence',
    {
      onRequest: [app.authenticate, requirePermission('assessments:write')],
      schema: {
        tags: ['circuit', 'cyber'],
        security: [{ bearerAuth: [] }],
        body: z.object({
          responseId: z.string().uuid(),
          fileName: z.string().min(1),
          mimeType: z.string().default('application/octet-stream'),
          contentBase64: z.string().min(1),
        }),
      },
    },
    async (req, reply) => {
      const buf = Buffer.from(req.body.contentBase64, 'base64');
      if (buf.length > 1_500_000) {
        return reply.code(413).send({ error: 'file_too_large', maxBytes: 1_500_000 });
      }
      const root = await uploadsRoot();
      const id = randomUUID();
      const safeName = req.body.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = join(root, id, safeName);
      await mkdir(dirname(storagePath), { recursive: true });
      await writeFile(storagePath, buf);
      const user = req.user as { sub?: string };
      const row = await attachEvidence({
        responseId: req.body.responseId,
        fileName: safeName,
        mimeType: req.body.mimeType,
        size: buf.length,
        storagePath: `uploads/cyber/${id}/${safeName}`,
        uploadedBy: user?.sub,
      });
      if (!row) return reply.code(404).send({ error: 'response_not_found' });
      return { response: row };
    },
  );
}
