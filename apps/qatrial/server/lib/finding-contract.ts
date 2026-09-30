/**
 * Pure helpers for the cross-app Finding contract
 * (docs/circuit/contracts/finding.schema.json v0.1.0, gsms-platform root).
 * Kept free of Prisma/auth imports so conformance tests stay light.
 */

export const FINDING_VERSION = '0.1.0';

export type FindingStatus =
  | 'conforme'
  | 'non_conforme'
  | 'en_cours'
  | 'non_applicable'
  | 'a_verifier';

export type FindingSeverity = 'critique' | 'majeure' | 'mineure' | 'information';

export interface Finding {
  version: string;
  id: string;
  source: 'qatrial';
  category: 'qualite_capa';
  status: FindingStatus;
  severity?: FindingSeverity;
  client_id: string;
  control_ref: string;
  title: string;
  description?: string;
  remediation?: string;
  owner?: string;
  due_date?: string;
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
}

export function capaStatus(status: string): FindingStatus {
  if (status === 'open') return 'non_conforme';
  if (status === 'resolved' || status === 'closed') return 'conforme';
  return 'en_cours';
}

export function auditFindingStatus(status: string): FindingStatus {
  if (status === 'open') return 'non_conforme';
  if (status === 'closed') return 'conforme';
  return 'en_cours';
}

export function severityFromClassification(
  classification: string,
): FindingSeverity | undefined {
  const c = classification.toLowerCase();
  if (c === 'critical' || c === 'critique') return 'critique';
  if (c === 'major' || c === 'majeure') return 'majeure';
  if (c === 'minor' || c === 'mineure') return 'mineure';
  if (c === 'observation' || c === 'information') return 'information';
  return undefined;
}
