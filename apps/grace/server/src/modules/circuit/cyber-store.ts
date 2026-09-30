/**
 * File-backed cyber checklist store (P0 — no Prisma migration required).
 * Path: server/data/cyber/store.json
 */

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type CyberStatus =
  | 'not_started'
  | 'in_progress'
  | 'conforme'
  | 'non_conforme'
  | 'non_applicable';

export type CyberEvidence = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  uploadedAt: string;
  uploadedBy?: string;
};

export type CyberResponse = {
  id: string;
  catalogSlug: 'iso27001-2022' | 'soc2-tsc';
  controlIdentifier: string;
  controlName: string;
  status: CyberStatus;
  notes?: string;
  siteId?: string;
  evidence: CyberEvidence[];
  updatedAt: string;
  updatedBy?: string;
};

type StoreFile = { version: 1; responses: CyberResponse[] };

async function storePath(): Promise<string> {
  const candidates = [
    join(process.cwd(), 'data/cyber/store.json'),
    join(process.cwd(), 'server/data/cyber/store.json'),
    join(__dirname, '../../../../data/cyber/store.json'),
  ];
  for (const p of candidates) {
    try {
      await access(dirname(p));
      return p;
    } catch {
      /* try next */
    }
  }
  const fallback = join(process.cwd(), 'data/cyber/store.json');
  await mkdir(dirname(fallback), { recursive: true });
  return fallback;
}

async function readStore(): Promise<StoreFile> {
  const path = await storePath();
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as StoreFile;
  } catch {
    return { version: 1, responses: [] };
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  const path = await storePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(store, null, 2), 'utf8');
}

export async function listCyberResponses(filter?: {
  catalogSlug?: string;
  siteId?: string;
}): Promise<CyberResponse[]> {
  const store = await readStore();
  return store.responses.filter((r) => {
    if (filter?.catalogSlug && r.catalogSlug !== filter.catalogSlug) return false;
    if (filter?.siteId && r.siteId !== filter.siteId) return false;
    return true;
  });
}

export async function upsertCyberResponse(input: {
  catalogSlug: 'iso27001-2022' | 'soc2-tsc';
  controlIdentifier: string;
  controlName: string;
  status: CyberStatus;
  notes?: string;
  siteId?: string;
  updatedBy?: string;
}): Promise<CyberResponse> {
  const store = await readStore();
  const idx = store.responses.findIndex(
    (r) =>
      r.catalogSlug === input.catalogSlug &&
      r.controlIdentifier === input.controlIdentifier &&
      (r.siteId ?? '') === (input.siteId ?? ''),
  );
  const now = new Date().toISOString();
  if (idx >= 0) {
    const prev = store.responses[idx]!;
    const next: CyberResponse = {
      ...prev,
      controlName: input.controlName,
      status: input.status,
      notes: input.notes,
      siteId: input.siteId,
      updatedAt: now,
      updatedBy: input.updatedBy,
    };
    store.responses[idx] = next;
    await writeStore(store);
    return next;
  }
  const created: CyberResponse = {
    id: randomUUID(),
    catalogSlug: input.catalogSlug,
    controlIdentifier: input.controlIdentifier,
    controlName: input.controlName,
    status: input.status,
    notes: input.notes,
    siteId: input.siteId,
    evidence: [],
    updatedAt: now,
    updatedBy: input.updatedBy,
  };
  store.responses.push(created);
  await writeStore(store);
  return created;
}

export async function attachEvidence(input: {
  responseId: string;
  fileName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  uploadedBy?: string;
}): Promise<CyberResponse | null> {
  const store = await readStore();
  const idx = store.responses.findIndex((r) => r.id === input.responseId);
  if (idx < 0) return null;
  const ev: CyberEvidence = {
    id: randomUUID(),
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.size,
    storagePath: input.storagePath,
    uploadedAt: new Date().toISOString(),
    uploadedBy: input.uploadedBy,
  };
  store.responses[idx] = {
    ...store.responses[idx]!,
    evidence: [...store.responses[idx]!.evidence, ev],
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
  return store.responses[idx]!;
}

export function cyberStatusToFindingStatus(
  s: CyberStatus,
): 'conforme' | 'non_conforme' | 'en_cours' | 'non_applicable' | 'a_verifier' {
  if (s === 'conforme') return 'conforme';
  if (s === 'non_conforme') return 'non_conforme';
  if (s === 'non_applicable') return 'non_applicable';
  if (s === 'in_progress') return 'en_cours';
  return 'a_verifier';
}
