/**
 * Read-only catalogs for policy titles + SSP/ISO/SOC2 control refs.
 * Data salvaged from Comp AI (no AGPL code). Used by policy-gen prep
 * and échéances (AuditFinding.dueDate / AuditSchedule).
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import {
  QATRIAL_CATALOGS,
  loadCatalog,
  type QatrialCatalogSlug,
} from '../lib/controls-catalog.js';
import { buildEcheancesFromCatalogs } from '../lib/echeances-from-catalog.js';

const catalogs = new Hono();

catalogs.use('*', authMiddleware);

catalogs.get('/', (c) =>
  c.json({
    source: 'qatrial',
    catalogs: QATRIAL_CATALOGS.map((slug) => ({
      slug,
      path_hint: `src/data/controls/${slug}.json`,
    })),
  }),
);

/** Suggested due dates from SSP (default) + optional ISO/SOC2 samples. */
catalogs.get('/echeances', (c) => {
  const includeIsoSoc2 = c.req.query('includeIsoSoc2') === '1';
  try {
    const ssp = loadCatalog('ssp-surete') as {
      requirements?: Array<{ identifier: string; name: string }>;
    };
    const iso = includeIsoSoc2
      ? (loadCatalog('iso27001-2022') as {
          controls?: Array<{ identifier: string; name: string }>;
        })
      : undefined;
    const soc2 = includeIsoSoc2
      ? (loadCatalog('soc2-tsc') as {
          controls?: Array<{ identifier: string; name: string }>;
        })
      : undefined;
    const suggestions = buildEcheancesFromCatalogs({
      ssp,
      iso,
      soc2,
      includeIsoSoc2,
    });
    return c.json({
      source: 'qatrial',
      count: suggestions.length,
      suggestions,
    });
  } catch (err) {
    return c.json(
      {
        error: 'echeances_unavailable',
        message: err instanceof Error ? err.message : 'unknown',
      },
      500,
    );
  }
});

catalogs.get('/:slug', (c) => {
  const slug = c.req.param('slug') as QatrialCatalogSlug;
  if (!QATRIAL_CATALOGS.includes(slug)) {
    return c.json({ error: 'catalog_not_found', slug }, 404);
  }
  try {
    return c.json(loadCatalog(slug));
  } catch {
    return c.json({ error: 'catalog_not_found', slug }, 404);
  }
});

export default catalogs;
