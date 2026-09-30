/**
 * Control / policy catalogs salvaged from Comp AI (JSON only).
 * Runtime: src/data/controls/ — also mirrored under docs/circuit/controls/.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type QatrialCatalogSlug =
  | 'ssp-surete'
  | 'iso27001-2022'
  | 'soc2-tsc'
  | 'policy-template-titles'
  | 'task-template-titles'
  | 'finding-template-categories';

export const QATRIAL_CATALOGS: QatrialCatalogSlug[] = [
  'ssp-surete',
  'iso27001-2022',
  'soc2-tsc',
  'policy-template-titles',
  'task-template-titles',
  'finding-template-categories',
];

function resolveCatalogPath(slug: QatrialCatalogSlug): string {
  const fileName = `${slug}.json`;
  const candidates = [
    join(process.cwd(), 'src/data/controls', fileName),
    join(process.cwd(), '../src/data/controls', fileName),
    join(__dirname, '../../src/data/controls', fileName),
    join(process.cwd(), '../../../docs/circuit/controls', fileName),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(`Controls catalog not found: ${fileName}`);
}

export function loadCatalog(slug: QatrialCatalogSlug): unknown {
  const path = resolveCatalogPath(slug);
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}
