/**
 * GSMSContext — contexte métier central (autorité Core).
 * Le frontend ne doit jamais inventer tenant/client/site/engagement/workspace.
 * Toujours résoudre via Core ContextResolver.
 */

export type GsmsContextIds = {
  tenantId: string | null;
  clientId: string;
  siteId: string | null;
  engagementId: string | null;
  workspaceId: string;
  contactIds: string[];
};

export type GsmsContext = GsmsContextIds & {
  clientName: string;
  siteName: string | null;
  engagementTitle: string | null;
  engagementType: string | null;
  workspaceName: string;
  applications: Array<{
    application_id: string;
    label: string;
    external_workspace_id: string;
    status: string;
    capabilities: string[];
  }>;
  workflow: {
    engagement_type: string;
    label: string;
    steps: string[];
    applications: string[];
  } | null;
  openTasks: Array<{ id: string; title: string; status: string }>;
  documents: Array<{ id: string; title: string; doc_type?: string | null; status?: string }>;
  recentEvents: Array<{ id: string; type: string; occurred_at?: string | null; subject?: string }>;
  permissions: string[];
  /** Headers à propager — source de vérité Core. */
  headers: Record<string, string>;
};

export type GsmsContextPayload = {
  tenant_id: string | null;
  client_id: string;
  client_name: string;
  site_id: string | null;
  site_name: string | null;
  engagement_id: string | null;
  engagement_title: string | null;
  engagement_type: string | null;
  workspace_id: string;
  workspace_name: string;
  contact_ids: string[];
  applications: GsmsContext["applications"];
  workflow: GsmsContext["workflow"];
  open_tasks: GsmsContext["openTasks"];
  documents: GsmsContext["documents"];
  recent_events: GsmsContext["recentEvents"];
  permissions: string[];
  headers: Record<string, string>;
};

export function mapContextPayload(data: GsmsContextPayload): GsmsContext {
  return {
    tenantId: data.tenant_id,
    clientId: data.client_id,
    clientName: data.client_name,
    siteId: data.site_id,
    siteName: data.site_name,
    engagementId: data.engagement_id,
    engagementTitle: data.engagement_title,
    engagementType: data.engagement_type,
    workspaceId: data.workspace_id,
    workspaceName: data.workspace_name,
    contactIds: data.contact_ids ?? [],
    applications: data.applications ?? [],
    workflow: data.workflow,
    openTasks: data.open_tasks ?? [],
    documents: data.documents ?? [],
    recentEvents: data.recent_events ?? [],
    permissions: data.permissions ?? [],
    headers: data.headers ?? {},
  };
}

/** Headers métier obligatoires pour les appels inter-apps. */
export const GSMS_CONTEXT_HEADER_KEYS = [
  "X-GSMS-Tenant-Id",
  "X-GSMS-Client-Id",
  "X-GSMS-Site-Id",
  "X-GSMS-Engagement-Id",
  "X-GSMS-Workspace-Id",
  "X-GSMS-Mission-Id",
] as const;
