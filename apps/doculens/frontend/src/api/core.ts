/**
 * Mode « GSMS Core » : DocuLens devient l'interface documentaire du Core.
 *
 * Activé par `VITE_GSMS_CORE_URL` (URL du Core, ou `/` quand nginx relaie l'API sur le même domaine,
 * cas du déploiement GSMS). Les documents, le parsing (Docling) et la recherche vivent alors
 * dans le Core, toujours dans le workspace canonique (`workspace_id` du jeton Core, ou
 * `VITE_GSMS_WORKSPACE_ID`). Ce module traduit les réponses du Core vers les types de DocuLens pour
 * que les écrans existants restent inchangés.
 */
import type {
  ApiError,
  AuthResponse,
  ChunkRecord,
  DashboardInsights,
  DocumentEntry,
  EventEntry,
  RuntimeConfig,
  UploadResponse,
  UserProfile,
} from './types';

const coreUrl: string | undefined = import.meta.env.VITE_GSMS_CORE_URL || undefined;
const fixedWorkspaceId: string | undefined = import.meta.env.VITE_GSMS_WORKSPACE_ID || undefined;

export const isCoreMode = Boolean(coreUrl);

let accessToken: string | undefined;
let workspaceId: string | undefined = fixedWorkspaceId;

/** Lit le `workspace_id` porté par le jeton Core (sans le vérifier : le Core le vérifie à chaque appel). */
export function workspaceFromToken(token: string): string | undefined {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as { workspace_id?: string | null };
    return claims.workspace_id ?? undefined;
  } catch {
    return undefined;
  }
}

export function setCoreToken(token?: string) {
  accessToken = token;
  workspaceId = fixedWorkspaceId ?? (token ? workspaceFromToken(token) : undefined);
}

export function getCoreWorkspaceId(): string | undefined {
  return workspaceId;
}

export function notInCoreMode(feature: string): never {
  const error: ApiError = new Error(`${feature} : non disponible quand DocuLens est branché sur le GSMS Core.`);
  error.status = 501;
  throw error;
}

function url(path: string, params?: Record<string, string | number | undefined>): string {
  // `VITE_GSMS_CORE_URL=/` : le Core est servi sur le même domaine que DocuLens (relais nginx).
  const target = new URL(`/api/v1${path}`, new URL(coreUrl ?? '/', window.location.origin));
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') target.searchParams.set(key, String(value));
  });
  return target.toString();
}

function wsPath(path: string): string {
  if (!workspaceId) {
    const error: ApiError = new Error('Aucun workspace GSMS sélectionné.');
    error.status = 400;
    throw error;
  }
  return `/workspaces/${workspaceId}${path}`;
}

async function call<T>(path: string, init: RequestInit = {}, params?: Record<string, string | number | undefined>) {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (workspaceId) headers.set('X-GSMS-Workspace-Id', workspaceId);
  if (typeof init.body === 'string') headers.set('Content-Type', 'application/json');
  const response = await fetch(url(path, params), { ...init, headers });
  if (!response.ok) {
    const error: ApiError = new Error(`Requête Core refusée (${response.status})`);
    error.status = response.status;
    try {
      error.payload = await response.json();
    } catch {
      // réponse non JSON
    }
    throw error;
  }
  return (await response.json()) as T;
}

// --- formes renvoyées par le Core ----------------------------------------------------------------

type ParseStatus = 'PENDING' | 'RUNNING' | 'PARSED' | 'FAILED';

interface CoreDocument {
  id: string;
  workspace_id: string;
  mission_id: string | null;
  title: string;
  doc_type: string | null;
  status: string;
  current_version_id: string | null;
  created_at: string;
  parse_status?: ParseStatus | null;
}

interface CoreUpload {
  document: CoreDocument;
  version: { id: string; filename: string };
}

interface CoreSource {
  document_id: string;
  filename: string;
  page?: number | null;
  sheet?: string | null;
  section?: string | null;
  table?: string | null;
  cell?: string | null;
  block_id?: string | null;
}

interface CoreNormalized {
  document_id: string;
  filename: string;
  blocks: Array<{ id: string; kind: string; text: string; source: CoreSource }>;
  tables: Array<{
    id: string;
    cells: Array<{ row: number; col: number; text: string; source: CoreSource }>;
  }>;
}

export interface CoreSearchHit {
  document_id: string;
  filename: string;
  text: string;
  score: number;
  source: CoreSource;
}

interface CoreMe {
  id: string;
  email: string;
  name: string;
  workspace_id: string | null;
  role: string;
}

interface CoreEvent {
  id: string;
  type: string;
  occurred_at: string;
  data: Record<string, unknown>;
}

// --- traductions vers DocuLens -------------------------------------------------------------------

const STATUS_LABELS: Record<ParseStatus, string> = {
  PENDING: 'queued',
  RUNNING: 'processing',
  PARSED: 'ready',
  FAILED: 'failed',
};

/** « CCTP.pdf · p. 2 · Article 4 » ou « BPU.xlsx · BPU!D4 » : la provenance lisible d'un extrait. */
export function describeSource(source: CoreSource): string {
  const parts = [source.filename];
  if (source.sheet) parts.push(source.cell ? `${source.sheet}!${source.cell}` : source.sheet);
  else if (source.page) parts.push(`p. ${source.page}`);
  if (source.section) parts.push(source.section);
  return parts.join(' · ');
}

function toEntry(doc: CoreDocument): DocumentEntry {
  return {
    event_id: doc.id,
    document_id: doc.id,
    uploaded_at: doc.created_at,
    filename: doc.title,
    doc_type: doc.doc_type,
    status: doc.parse_status ? STATUS_LABELS[doc.parse_status] : 'uploaded',
    metadata: { workspace_id: doc.workspace_id, mission_id: doc.mission_id, source: 'gsms-core' },
  };
}

function sourceMetadata(source: CoreSource): Record<string, unknown> {
  return {
    document_id: source.document_id,
    filename: source.filename,
    page: source.page ?? null,
    sheet: source.sheet ?? null,
    section: source.section ?? null,
    table: source.table ?? null,
    cell: source.cell ?? null,
    block_id: source.block_id ?? null,
    provenance: describeSource(source),
  };
}

function role(coreRole: string): UserProfile {
  return {
    id: '',
    email: '',
    full_name: '',
    persona: 'operations',
    role: coreRole,
    access_level: ['viewer', 'client_member'].includes(coreRole) ? 'read' : 'write',
  };
}

// --- API utilisée par client.ts ------------------------------------------------------------------

export async function coreProfile(): Promise<UserProfile> {
  const me = await call<CoreMe>('/auth/me');
  if (!fixedWorkspaceId && me.workspace_id) workspaceId = me.workspace_id;
  return { ...role(me.role), id: me.id, email: me.email, full_name: me.name };
}

function loginError(message: string, status: number): ApiError {
  const error: ApiError = new Error(message);
  error.status = status;
  return error;
}

export async function coreLogin(credentials: { email: string; password: string }): Promise<AuthResponse> {
  let token: { access_token: string; token_type: string; workspace_id: string | null };
  try {
    token = await call('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ ...credentials, workspace_id: fixedWorkspaceId }),
    });
  } catch (error) {
    const status = (error as ApiError).status ?? 0;
    if (status === 401) throw loginError('E-mail ou mot de passe incorrect.', status);
    if (status === 403) throw loginError('Ce compte n’a accès à aucun espace de travail GSMS.', status);
    throw loginError('Le GSMS Core ne répond pas. Réessayez dans un instant.', status);
  }
  if (!token.workspace_id && !fixedWorkspaceId) {
    // Compte valide mais rattaché à aucun espace de travail (ex. administrateur sans prestation).
    throw loginError(
      'Votre compte n’est rattaché à aucun espace de travail. Créez une prestation sur la plateforme GSMS, puis reconnectez-vous.',
      403,
    );
  }
  setCoreToken(token.access_token);
  return {
    access_token: token.access_token,
    token_type: token.token_type,
    user: await coreProfile(),
    personas: [],
    roles: {},
  };
}

export async function coreDocuments(limit: number): Promise<DocumentEntry[]> {
  const docs = await call<CoreDocument[]>(wsPath('/documents'));
  return docs.slice(0, limit).map(toEntry);
}

/** Dépôt dans le Core puis demande de parsing (Docling) ; le Digest du workspace suit côté Core. */
export async function coreUpload(file: File, docType?: string): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  if (docType) form.append('doc_type', docType);
  const uploaded = await call<CoreUpload>(wsPath('/documents'), { method: 'POST', body: form });
  const parse = await call<{ id: string }>(wsPath(`/documents/${uploaded.document.id}/parse`), { method: 'POST' });
  return {
    message: 'Document déposé dans le GSMS Core ; analyse Docling en cours.',
    event_id: uploaded.document.id,
    task_id: parse.id,
    event_type: 'document.uploaded',
    original_filename: uploaded.version.filename,
    stored_path: `core://document/${uploaded.document.id}`,
  };
}

/** Le document parsé, découpé en extraits (blocs puis lignes de tableau) avec leur provenance. */
export async function coreChunks(documentId: string, limit: number): Promise<ChunkRecord[]> {
  let doc: CoreNormalized;
  try {
    doc = await call<CoreNormalized>(wsPath(`/documents/${documentId}/normalized`));
  } catch (error) {
    if ((error as ApiError).status === 404) return [];
    throw error;
  }
  const records: ChunkRecord[] = doc.blocks.map((block) => ({
    id: block.id,
    contents: block.text,
    metadata: { kind: block.kind, ...sourceMetadata(block.source) },
  }));
  for (const table of doc.tables) {
    const rows = new Map<number, typeof table.cells>();
    table.cells.forEach((cell) => rows.set(cell.row, [...(rows.get(cell.row) ?? []), cell]));
    [...rows.entries()]
      .sort(([a], [b]) => a - b)
      .forEach(([row, cells]) => {
        const ordered = [...cells].sort((a, b) => a.col - b.col);
        const text = ordered.map((c) => c.text).filter(Boolean).join(' | ');
        if (text) {
          records.push({
            id: `${table.id}#${row + 1}`,
            contents: text,
            metadata: { kind: 'table_row', ...sourceMetadata(ordered[0].source) },
          });
        }
      });
  }
  return records.slice(0, limit);
}

export async function coreSearch(query: string, limit = 20): Promise<CoreSearchHit[]> {
  return call<CoreSearchHit[]>(wsPath('/search'), {}, { q: query, limit });
}

/** Recherche du ⌘K : un résultat par document, avec le meilleur extrait et sa provenance. */
export async function coreSearchEntries(query: string, limit: number): Promise<DocumentEntry[]> {
  const hits = await coreSearch(query, 50);
  const byDocument = new Map<string, CoreSearchHit>();
  hits.forEach((hit) => {
    if (!byDocument.has(hit.document_id)) byDocument.set(hit.document_id, hit);
  });
  return [...byDocument.values()].slice(0, limit).map((hit) => ({
    event_id: hit.document_id,
    document_id: hit.document_id,
    uploaded_at: '',
    filename: hit.filename,
    status: 'ready',
    summary: { summary: `${hit.text} — ${describeSource(hit.source)}`, bullet_points: [] },
    metadata: { source: 'gsms-core', provenance: sourceMetadata(hit.source) },
  }));
}

export async function coreEvents(limit: number): Promise<EventEntry[]> {
  const events = await call<CoreEvent[]>(wsPath('/events'), {}, { limit: Math.min(limit, 500) });
  return events.map((event) => ({
    id: event.id,
    created_at: event.occurred_at,
    updated_at: event.occurred_at,
    data: { event_type: event.type, ...event.data },
  }));
}

export async function coreDashboard(): Promise<DashboardInsights> {
  const docs = await call<CoreDocument[]>(wsPath('/documents'));
  const parsed = docs.filter((d) => d.parse_status === 'PARSED').length;
  const failed = docs.filter((d) => d.parse_status === 'FAILED').length;
  const today = new Date().toISOString().slice(0, 10);
  return {
    total_documents: docs.length,
    summarised_documents: parsed,
    chunk_count: 0,
    embedded_count: 0,
    queue_latency: '—',
    estimated_savings: 0,
    hours_saved: 0,
    analyst_rate: 0,
    sla_risk_count: failed,
    sla_risk_message: failed ? `${failed} document(s) en échec d'analyse` : 'Aucun échec d’analyse',
    throughput_series: [],
    compliance_series: [],
    delta_processed: `${parsed}/${docs.length} analysés`,
    delta_processed_tone: 'neutral',
    delta_summaries: '—',
    delta_summaries_tone: 'neutral',
    today_total: docs.filter((d) => d.created_at.slice(0, 10) === today).length,
    today_summaries: 0,
    yesterday_total: 0,
    yesterday_summaries: 0,
  };
}

export function coreRuntimeConfig(): RuntimeConfig {
  return {
    app_name: 'DocuLens · GSMS',
    summary_chunk_limit: 0,
    qa_top_k: 0,
    search_result_limit: 20,
    search_preview_limit: 6,
    chunk_preview_limit: 200,
    auth_required: true,
    showcase_read_only: false,
    api_key_header: 'Authorization',
  };
}
