import type {
  ApiError,
  AuthResponse,
  ChunkRecord,
  DashboardInsights,
  ClassificationHistoryEntry,
  ClassificationOverrideRequest,
  DocumentLifecycleResponse,
  DocumentClassificationRequest,
  DocumentClassificationResponse,
  DocumentEntry,
  EventResponse,
  EventEntry,
  QAHistoryEntry,
  LabelRequestPayload,
  LabelResponse,
  LabelsResponse,
  RuntimeConfig,
  SearchHistoryEntry,
  UploadResponse,
  UserProfile,
} from './types';
import * as core from './core';

export { isCoreMode } from './core';

type QueryParams = Record<string, string | number | boolean | undefined>;

interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  apiKeyHeader: string;
  accessToken?: string;
}

const defaultBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:8080' : window.location.origin);
const defaultApiKeyHeader = 'X-API-Key';

let apiConfig: ApiConfig = {
  baseUrl: defaultBaseUrl,
  apiKeyHeader: defaultApiKeyHeader,
};

export function getApiConfig(): ApiConfig {
  return { ...apiConfig };
}

export function setApiConfig(update: Partial<ApiConfig>) {
  apiConfig = { ...apiConfig, ...update };
}

export function setAuthToken(token?: string | null) {
  apiConfig = { ...apiConfig, accessToken: token ?? undefined };
  core.setCoreToken(token ?? undefined);
}

export function clearAuthToken() {
  apiConfig = { ...apiConfig, accessToken: undefined };
  core.setCoreToken(undefined);
}

function resolveUrl(path: string, params?: QueryParams): string {
  const url = new URL(path, apiConfig.baseUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

function buildHeaders(extra?: HeadersInit, includeContentType = false): Headers {
  const headers = new Headers(extra ?? {});

  if (includeContentType && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (apiConfig.apiKey) {
    headers.set(apiConfig.apiKeyHeader, apiConfig.apiKey);
  }

  if (apiConfig.accessToken) {
    headers.set('Authorization', `Bearer ${apiConfig.accessToken}`);
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = new Error(`Request failed with status ${response.status}`);
    error.status = response.status;
    try {
      error.payload = await response.json();
    } catch {
      // ignore JSON parse failures for non-JSON responses
    }
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchDocuments(limit = 20): Promise<DocumentEntry[]> {
  if (core.isCoreMode) return core.coreDocuments(limit);
  const response = await fetch(resolveUrl('/events/documents', { limit }), {
    headers: buildHeaders(),
  });
  return handleResponse<DocumentEntry[]>(response);
}

export async function fetchEvents(limit = 20): Promise<EventEntry[]> {
  if (core.isCoreMode) return core.coreEvents(limit);
  const response = await fetch(resolveUrl('/events', { limit }), {
    headers: buildHeaders(),
  });
  return handleResponse<EventEntry[]>(response);
}

export async function archiveDocument(documentId: string, reason?: string): Promise<DocumentLifecycleResponse> {
  if (core.isCoreMode) core.notInCoreMode('Archivage');
  const response = await fetch(resolveUrl(`/events/documents/${documentId}/archive`), {
    method: 'POST',
    headers: buildHeaders(undefined, true),
    body: JSON.stringify(reason ? { reason } : {}),
  });
  return handleResponse<DocumentLifecycleResponse>(response);
}

export async function deleteDocument(
  documentId: string,
  options?: { reason?: string; purgeVectors?: boolean },
): Promise<DocumentLifecycleResponse> {
  if (core.isCoreMode) core.notInCoreMode('Suppression');
  const response = await fetch(
    resolveUrl(`/events/documents/${documentId}`, {
      reason: options?.reason,
      purge_vectors: options?.purgeVectors ?? true,
    }),
    {
      method: 'DELETE',
      headers: buildHeaders(),
    },
  );
  return handleResponse<DocumentLifecycleResponse>(response);
}

export async function restoreDocument(documentId: string, reason?: string): Promise<DocumentLifecycleResponse> {
  if (core.isCoreMode) core.notInCoreMode('Restauration');
  const response = await fetch(resolveUrl(`/events/documents/${documentId}/restore`), {
    method: 'POST',
    headers: buildHeaders(undefined, true),
    body: JSON.stringify(reason ? { reason } : {}),
  });
  return handleResponse<DocumentLifecycleResponse>(response);
}

export async function fetchDocumentChunks(
  documentId: string,
  limit: number,
): Promise<ChunkRecord[]> {
  if (core.isCoreMode) return core.coreChunks(documentId, limit);
  const response = await fetch(
    resolveUrl(`/events/documents/${documentId}/chunks`, { limit }),
    {
      headers: buildHeaders(),
    },
  );
  return handleResponse<ChunkRecord[]>(response);
}

export async function fetchQaHistory(limit = 20): Promise<QAHistoryEntry[]> {
  if (core.isCoreMode) return [];
  const response = await fetch(resolveUrl('/events/qa/history', { limit }), {
    headers: buildHeaders(),
  });
  return handleResponse<QAHistoryEntry[]>(response);
}

export async function fetchSearchHistory(limit = 20): Promise<SearchHistoryEntry[]> {
  if (core.isCoreMode) return [];
  const response = await fetch(resolveUrl('/events/search/history', { limit }), {
    headers: buildHeaders(),
  });
  return handleResponse<SearchHistoryEntry[]>(response);
}

export async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  if (core.isCoreMode) return core.coreRuntimeConfig();
  const response = await fetch(resolveUrl('/events/config'), {
    headers: buildHeaders(),
  });
  return handleResponse<RuntimeConfig>(response);
}

export async function fetchDashboardInsights(): Promise<DashboardInsights> {
  if (core.isCoreMode) return core.coreDashboard();
  const response = await fetch(resolveUrl('/events/insights/dashboard'), {
    headers: buildHeaders(),
  });
  return handleResponse<DashboardInsights>(response);
}

export async function postEvent(payload: Record<string, unknown>): Promise<EventResponse> {
  if (core.isCoreMode) core.notInCoreMode('Résumé et questions-réponses IA');
  const response = await fetch(resolveUrl('/events'), {
    method: 'POST',
    headers: buildHeaders(undefined, true),
    body: JSON.stringify(payload),
  });
  return handleResponse<EventResponse>(response);
}

export async function uploadDocument(options: {
  file: File;
  docType?: string;
  metadata?: Record<string, unknown>;
}): Promise<UploadResponse> {
  if (core.isCoreMode) return core.coreUpload(options.file, options.docType);
  const form = new FormData();
  form.append('file', options.file);
  if (options.docType) {
    form.append('doc_type', options.docType);
  }
  if (options.metadata && Object.keys(options.metadata).length > 0) {
    form.append('metadata', JSON.stringify(options.metadata));
  }

  const response = await fetch(resolveUrl('/events/documents/upload'), {
    method: 'POST',
    headers: buildHeaders(undefined, false),
    body: form,
  });
  return handleResponse<UploadResponse>(response);
}

export async function login(credentials: { email: string; password: string }): Promise<AuthResponse> {
  if (core.isCoreMode) return core.coreLogin(credentials);
  const response = await fetch(resolveUrl('/auth/login'), {
    method: 'POST',
    headers: buildHeaders(undefined, true),
    body: JSON.stringify(credentials),
  });
  return handleResponse<AuthResponse>(response);
}

export async function fetchProfile(): Promise<UserProfile> {
  if (core.isCoreMode) return core.coreProfile();
  const response = await fetch(resolveUrl('/auth/me'), {
    headers: buildHeaders(),
  });
  return handleResponse<UserProfile>(response);
}

export async function classifyDocument(
  documentId: string,
  payload: DocumentClassificationRequest = {},
): Promise<DocumentClassificationResponse> {
  if (core.isCoreMode) core.notInCoreMode('Classification IA');
  const response = await fetch(resolveUrl(`/events/documents/${documentId}/classify`), {
    method: 'POST',
    headers: buildHeaders(undefined, true),
    body: JSON.stringify(payload),
  });
  return handleResponse<DocumentClassificationResponse>(response);
}

export async function fetchLabels(): Promise<LabelsResponse> {
  if (core.isCoreMode) return { tree: [], candidate_labels: [] };
  const response = await fetch(resolveUrl('/events/labels'), {
    headers: buildHeaders(),
  });
  return handleResponse<LabelsResponse>(response);
}

export async function createLabel(payload: LabelRequestPayload): Promise<LabelResponse> {
  if (core.isCoreMode) core.notInCoreMode('Libellés');
  const response = await fetch(resolveUrl('/events/labels'), {
    method: 'POST',
    headers: buildHeaders(undefined, true),
    body: JSON.stringify(payload),
  });
  return handleResponse<LabelResponse>(response);
}

export async function updateLabel(labelId: string, payload: Partial<LabelRequestPayload>): Promise<LabelResponse> {
  if (core.isCoreMode) core.notInCoreMode('Libellés');
  const response = await fetch(resolveUrl(`/events/labels/${labelId}`), {
    method: 'PATCH',
    headers: buildHeaders(undefined, true),
    body: JSON.stringify(payload),
  });
  return handleResponse<LabelResponse>(response);
}

export async function deleteLabel(labelId: string, force = false): Promise<void> {
  if (core.isCoreMode) core.notInCoreMode('Libellés');
  const response = await fetch(resolveUrl(`/events/labels/${labelId}`, { force }), {
    method: 'DELETE',
    headers: buildHeaders(),
  });
  await handleResponse<void>(response);
}

export async function fetchClassificationHistory(documentId: string): Promise<ClassificationHistoryEntry[]> {
  if (core.isCoreMode) return [];
  const response = await fetch(resolveUrl(`/events/documents/${documentId}/classification-history`), {
    headers: buildHeaders(),
  });
  return handleResponse<ClassificationHistoryEntry[]>(response);
}

export async function overrideClassification(
  documentId: string,
  payload: ClassificationOverrideRequest,
): Promise<ClassificationHistoryEntry> {
  if (core.isCoreMode) core.notInCoreMode('Classification IA');
  const response = await fetch(resolveUrl(`/events/documents/${documentId}/classification-history`), {
    method: 'POST',
    headers: buildHeaders(undefined, true),
    body: JSON.stringify(payload),
  });
  return handleResponse<ClassificationHistoryEntry>(response);
}

/** Recherche du ⌘K : plein texte avec provenance dans le Core, filtre local en mode autonome. */
export async function searchDocumentEntries(query: string, limit = 6): Promise<DocumentEntry[]> {
  if (core.isCoreMode) return core.coreSearchEntries(query, limit);
  const needle = query.trim().toLowerCase();
  const documents = await fetchDocuments(150);
  return documents
    .filter((document) =>
      [document.filename, document.doc_type, document.summary?.summary, document.document_id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
    .slice(0, limit);
}
