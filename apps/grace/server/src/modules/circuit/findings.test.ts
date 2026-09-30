/**
 * Conformance test: the Grace findings module must stay in sync with the
 * cross-app contract docs/circuit/contracts/finding.schema.json (platform root).
 * If this test fails, either the contract changed (bump FINDING_VERSION and
 * update the module) or the module drifted (fix the module).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  FINDING_VERSION,
  categoryEnum,
  findingSchema,
  severityEnum,
  statusEnum,
} from './findings.js';

const contractsDir = new URL(
  '../../../../../../docs/circuit/contracts/',
  import.meta.url,
);

function loadJson(name: string): any {
  return JSON.parse(readFileSync(fileURLToPath(new URL(name, contractsDir)), 'utf8'));
}

const contract = loadJson('finding.schema.json');
const examples = loadJson('finding.examples.json');

describe('finding contract conformance (source=grace)', () => {
  it('module version matches the contract version const', () => {
    expect(contract.properties.version.const).toBe(FINDING_VERSION);
  });

  it('grace is a valid source in the contract', () => {
    expect(contract.properties.source.enum).toContain('grace');
  });

  it('module-cyber is a valid source in the contract', () => {
    expect(contract.properties.source.enum).toContain('module-cyber');
  });

  it('category enum matches the contract exactly', () => {
    expect([...categoryEnum.options].sort()).toEqual(
      [...contract.properties.category.enum].sort(),
    );
  });

  it('status enum matches the contract exactly', () => {
    expect([...statusEnum.options].sort()).toEqual(
      [...contract.properties.status.enum].sort(),
    );
  });

  it('severity enum matches the contract exactly', () => {
    expect([...severityEnum.options].sort()).toEqual(
      [...contract.properties.severity.enum].sort(),
    );
  });

  it('module schema keeps every contract-required field required', () => {
    const shape = findingSchema.shape as Record<string, { isOptional(): boolean }>;
    for (const field of contract.required as string[]) {
      const entry = shape[field];
      expect(entry, `missing field ${field}`).toBeDefined();
      expect(entry?.isOptional(), `${field} must be required`).toBe(false);
    }
  });

  it('module schema has no field unknown to the contract (additionalProperties:false)', () => {
    const contractFields = new Set(Object.keys(contract.properties));
    for (const field of Object.keys(findingSchema.shape)) {
      expect(contractFields.has(field), `field ${field} not in contract`).toBe(true);
    }
  });

  it('grace examples from the contract validate against the module schema', () => {
    const graceExamples = (examples.examples as any[]).filter(
      (e) => e.source === 'grace',
    );
    expect(graceExamples.length).toBeGreaterThan(0);
    for (const ex of graceExamples) {
      // agent_id / tender_id are contract fields Grace does not emit; the
      // module schema must still accept plain grace findings without them.
      const { agent_id: _a, tender_id: _t, ...rest } = ex;
      const result = findingSchema.safeParse(rest);
      expect(
        result.success,
        `example ${ex.id}: ${result.success ? '' : JSON.stringify(result.error.issues)}`,
      ).toBe(true);
    }
  });
});
