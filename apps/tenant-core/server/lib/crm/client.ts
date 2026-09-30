import { crmConfig } from "../config.js";

export class CrmHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CrmHttpError";
  }
}

async function crmFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl, apiKey, enabled } = crmConfig();
  if (!enabled) {
    throw new CrmHttpError("CRM_API_KEY manquant", 503);
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new CrmHttpError(
      `CRM ${res.status} ${path}${body ? `: ${body.slice(0, 200)}` : ""}`,
      res.status,
    );
  }

  return res.json() as Promise<T>;
}

export type CrmDealListRow = {
  id: string;
  name: string;
  stage: string;
  amountCents: number | null;
  createdAt?: string;
  company?: { id: string; name: string } | null;
  owner?: { id: string; name: string | null } | null;
};

export type CrmDealDetail = CrmDealListRow & {
  description: string | null;
  contacts?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    title: string | null;
    role: string | null;
  }[];
  stageChangedAt?: string | null;
};

export type CrmCompanyDetail = {
  id: string;
  name: string;
  deals?: {
    id: string;
    name: string;
    stage: string;
    amountCents: number | null;
    expectedCloseDate: string | null;
    createdAt?: string;
    owner?: { id: string; name: string | null } | null;
  }[];
};

/** Deals rattachés à une Company CRM. */
export async function crmCompanyDeals(companyId: string) {
  return crmFetch<CrmCompanyDetail>(
    `/rest/companies/${encodeURIComponent(companyId)}`,
  );
}

export async function crmDealById(dealId: string) {
  return crmFetch<CrmDealDetail>(
    `/rest/deals/${encodeURIComponent(dealId)}`,
  );
}

/** Recherche deals (fallback si pas de companyId). */
export async function crmSearchDeals(q: string) {
  return crmFetch<{
    items: CrmDealListRow[];
    page: number;
    pageSize: number;
    total: number;
  }>("/rest/deals/search", {
    method: "POST",
    body: JSON.stringify({
      q,
      status: "all",
      page: 1,
      pageSize: 100,
      archived: false,
    }),
  });
}
