/**
 * Conformance test: QAtrial's finding helpers must stay in sync with the
 * cross-app contract shared/contracts/finding.schema.json at the
 * gsms-platform root. If this fails, either the contract changed (bump
 * FINDING_VERSION and update the helpers) or the helpers drifted.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FINDING_VERSION,
  type Finding,
  auditFindingStatus,
  capaStatus,
  severityFromClassification,
} from './lib/finding-contract';

// Built via fileURLToPath + path.resolve rather than `new URL(literal, import.meta.url)`:
// Vite statically special-cases that exact literal pattern for asset bundling, which
// mangles the resolved URL for a target outside the module graph (shared/ is outside apps/qatrial).
const thisFilePath = fileURLToPath(import.meta.url);
const contractPath = path.resolve(
  path.dirname(thisFilePath),
  '../../../shared/contracts/finding.schema.json',
);
const contract = JSON.parse(readFileSync(contractPath, 'utf8'));

const statusEnum: string[] = contract.properties.status.enum;
const severityEnum: string[] = contract.properties.severity.enum;
const categoryEnum: string[] = contract.properties.category.enum;

describe('finding contract conformance (source=qatrial)', () => {
  it('version matches the contract const', () => {
    expect(contract.properties.version.const).toBe(FINDING_VERSION);
  });

  it('qatrial is a valid source and qualite_capa a valid category', () => {
    expect(contract.properties.source.enum).toContain('qatrial');
    expect(categoryEnum).toContain('qualite_capa');
  });

  it('capaStatus only emits contract statuses', () => {
    for (const s of ['open', 'investigation', 'in_progress', 'verification', 'resolved', 'closed', 'anything']) {
      expect(statusEnum).toContain(capaStatus(s));
    }
    expect(capaStatus('open')).toBe('non_conforme');
    expect(capaStatus('closed')).toBe('conforme');
    expect(capaStatus('investigation')).toBe('en_cours');
  });

  it('auditFindingStatus only emits contract statuses', () => {
    for (const s of ['open', 'closed', 'responded', 'whatever']) {
      expect(statusEnum).toContain(auditFindingStatus(s));
    }
  });

  it('severityFromClassification only emits contract severities (or undefined)', () => {
    for (const c of ['critical', 'major', 'minor', 'observation', 'Critique', 'MAJEURE']) {
      const sev = severityFromClassification(c);
      if (sev !== undefined) expect(severityEnum).toContain(sev);
    }
    expect(severityFromClassification('unknown-class')).toBeUndefined();
  });

  it('a fully-populated Finding uses only contract-known fields and required ones are present', () => {
    const sample: Finding = {
      version: FINDING_VERSION,
      id: 'qatrial-capa-123',
      source: 'qatrial',
      category: 'qualite_capa',
      status: 'en_cours',
      severity: 'majeure',
      client_id: 'client-0042',
      control_ref: 'qatrial-capa',
      title: 'Écart de ronde récurrent',
      description: 'Cause racine identifiée',
      remediation: 'Rappel consigne / contrôle renforcé',
      owner: 'chef de poste',
      due_date: '2026-10-01',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: { project_id: 'p1' },
    };

    const contractFields = new Set(Object.keys(contract.properties));
    for (const key of Object.keys(sample)) {
      expect(contractFields.has(key), `field ${key} not in contract`).toBe(true);
    }
    for (const req of contract.required as string[]) {
      expect(sample, `missing required ${req}`).toHaveProperty(req);
    }
  });
});
