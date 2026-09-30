import type {
  FinanceItem,
  FinanceLine,
  PlaquetteBrief,
  PlaquetteFinding,
} from "./finance-types";

export type {
  FinanceItem,
  FinanceLine,
  PlaquetteBrief,
  PlaquetteFinding,
};

export type MeResponse = {
  user: { id: string; email: string; name: string };
  organization: { id: string; name: string };
  workspace: { id: string; name: string; label: string | null } | null;
  workspaces: { id: string; name: string; label: string | null }[];
  role: string;
};

export type Prestation = {
  id: string;
  title: string;
  kind: string;
  status: string;
  workspaceId: string;
  startedAt: string;
  contactGsms: string;
  summary: string;
};

export type PortalDocument = {
  id: string;
  title: string;
  bucket: "A_FOURNIR" | "FOURNI" | "LIVRABLE";
  prestationId: string | null;
  workspaceId: string;
  updatedAt: string;
};

export type Echange = {
  id: string;
  subject: string;
  preview: string;
  prestationId: string | null;
  workspaceId: string;
  status: "OUVERT" | "REPONDU" | "CLOS";
  updatedAt: string;
};

export type FinanceDetail = {
  item: FinanceItem;
  prestation: Prestation | null;
  pdfUrl: string;
};

export type DashboardData = {
  workspaceId: string;
  counts: {
    prestationsOpen: number;
    piecesPending: number;
    devisPending: number;
    livrablesUnread: number;
  };
  prestations: {
    id: string;
    title: string;
    kind: string;
    status: string;
    workspaceId: string;
  }[];
  source?: "crm" | "mock";
  warning?: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP_${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<MeResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => request<MeResponse>("/api/auth/me"),
  switchWorkspace: (workspaceId: string) =>
    request<{ workspace: MeResponse["workspace"] }>("/api/workspaces/switch", {
      method: "POST",
      body: JSON.stringify({ workspaceId }),
    }),
  dashboard: () => request<DashboardData>("/api/bff/dashboard"),
  prestations: () => request<{ items: Prestation[] }>("/api/bff/prestations"),
  prestation: (id: string) =>
    request<{
      prestation: Prestation;
      documents: PortalDocument[];
      echanges: Echange[];
      finance: FinanceItem[];
    }>(`/api/bff/prestations/${id}`),
  documents: () => request<{ items: PortalDocument[] }>("/api/bff/documents"),
  echanges: () => request<{ items: Echange[] }>("/api/bff/echanges"),
  finance: () => request<{ items: FinanceItem[] }>("/api/bff/finance"),
  financeItem: (id: string) =>
    request<FinanceDetail>(`/api/bff/finance/${id}`),
  signFinance: (id: string) =>
    request<FinanceDetail>(`/api/bff/finance/${id}/sign`, { method: "POST" }),
  members: () =>
    request<{
      organizationId: string;
      members: {
        id: string;
        role: string;
        user: { id: string; email: string; name: string };
      }[];
    }>("/api/members"),
  uploadDocument: async (opts: {
    file: File;
    prestationId?: string | null;
    demandeId?: string | null;
  }) => {
    const form = new FormData();
    form.append("file", opts.file);
    if (opts.prestationId) form.append("prestationId", opts.prestationId);
    if (opts.demandeId) form.append("demandeId", opts.demandeId);
    const res = await fetch("/api/bff/documents/upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `HTTP_${res.status}`);
    }
    return res.json() as Promise<{ document: PortalDocument }>;
  },
};
