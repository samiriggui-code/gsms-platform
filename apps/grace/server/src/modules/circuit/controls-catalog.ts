/**
 * Control catalogs salvaged from Comp AI (JSON only, no AGPL code).
 * Runtime copies live under server/data/controls/ — canon also in
 * shared/controls/ at platform root.
 */

import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requirePermission } from '../../lib/rbac.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type CatalogSlug =
  | 'ssp-surete'
  | 'iso27001-2022'
  | 'soc2-tsc'
  | 'control-prompts'
  | 'control-requirement-edges-iso-soc2';

const CATALOGS: CatalogSlug[] = [
  'ssp-surete',
  'iso27001-2022',
  'soc2-tsc',
  'control-prompts',
  'control-requirement-edges-iso-soc2',
];

async function resolveCatalogFile(slug: CatalogSlug): Promise<string> {
  const fileName = `${slug}.json`;
  const candidates = [
    join(process.cwd(), 'data/controls', fileName),
    join(process.cwd(), 'server/data/controls', fileName),
    join(__dirname, '../../../../data/controls', fileName),
    join(process.cwd(), '../../../shared/controls', fileName),
    join(process.cwd(), 'shared/controls', fileName),
  ];
  for (const p of candidates) {
    try {
      await access(p);
      return p;
    } catch {
      /* try next */
    }
  }
  throw new Error(`Controls catalog not found: ${fileName}`);
}

export async function loadCatalog(slug: CatalogSlug): Promise<unknown> {
  const path = await resolveCatalogFile(slug);
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

export async function registerControlsCatalogRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    '/',
    {
      onRequest: [app.authenticate, requirePermission('assessments:read')],
      schema: {
        tags: ['circuit'],
        summary: 'List available control catalogs (SSP / ISO / SOC2)',
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({
            source: z.literal('grace'),
            catalogs: z.array(
              z.object({
                slug: z.string(),
                path_hint: z.string(),
              }),
            ),
          }),
        },
      },
    },
    async () => ({
      source: 'grace' as const,
      catalogs: CATALOGS.map((slug) => ({
        slug,
        path_hint: `server/data/controls/${slug}.json`,
      })),
    }),
  );

  r.get(
    '/:slug',
    {
      onRequest: [app.authenticate, requirePermission('assessments:read')],
      schema: {
        tags: ['circuit'],
        summary: 'Load one control catalog JSON',
        security: [{ bearerAuth: [] }],
        params: z.object({
          slug: z.enum([
            'ssp-surete',
            'iso27001-2022',
            'soc2-tsc',
            'control-prompts',
            'control-requirement-edges-iso-soc2',
          ]),
        }),
      },
    },
    async (req, reply) => {
      try {
        const data = await loadCatalog(req.params.slug);
        return data;
      } catch (err) {
        req.log.error(err);
        return reply.code(404).send({ error: 'catalog_not_found', slug: req.params.slug });
      }
    },
  );
}
