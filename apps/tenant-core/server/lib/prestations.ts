import { db } from "../db.js";
import { prestationsSource } from "./config.js";
import {
  CrmHttpError,
  crmCompanyDeals,
  crmDealById,
  crmSearchDeals,
} from "./crm/client.js";
import { dealToPrestation, type PortalPrestation } from "./crm/map-deal.js";
import { mockPrestation, mockPrestations } from "./mock-data.js";

async function workspaceCrmCompanyId(workspaceId: string) {
  const ws = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, label: true, crmCompanyId: true },
  });
  return ws;
}

/**
 * Liste prestations du workspace actif.
 * P0 : CRM deals de la Company liée (crmCompanyId), sinon mock si source=mock.
 */
export async function listPrestations(
  workspaceId: string,
): Promise<{ items: PortalPrestation[]; source: "crm" | "mock"; warning?: string }> {
  if (prestationsSource() === "mock") {
    return { items: mockPrestations(workspaceId), source: "mock" };
  }

  const ws = await workspaceCrmCompanyId(workspaceId);
  if (!ws) {
    return { items: [], source: "crm", warning: "Workspace introuvable" };
  }

  try {
    if (ws.crmCompanyId) {
      const company = await crmCompanyDeals(ws.crmCompanyId);
      const rows = company.deals ?? [];
      // Company deals nested are light — enrich via byId would be N+1; map light rows
      const items = rows.map((d) =>
        dealToPrestation(
          {
            id: d.id,
            name: d.name,
            stage: d.stage,
            amountCents: d.amountCents,
            createdAt: d.createdAt ?? d.expectedCloseDate ?? "",
            company: { id: company.id, name: company.name },
            owner: d.owner ?? null,
          },
          workspaceId,
        ),
      );
      return { items, source: "crm" };
    }

    // Fallback : recherche par nom de site
    const q = ws.label || ws.name;
    const found = await crmSearchDeals(q);
    const items = found.items
      .filter((d) =>
        d.company?.name
          ? d.company.name.toLowerCase().includes(ws.name.toLowerCase()) ||
            (ws.label
              ? d.company.name.toLowerCase().includes(ws.label.toLowerCase())
              : false) ||
            d.name.toLowerCase().includes(ws.name.toLowerCase())
          : true,
      )
      .map((d) => dealToPrestation(d, workspaceId));

    return {
      items,
      source: "crm",
      warning: items.length
        ? undefined
        : `Aucun crmCompanyId sur le workspace « ${ws.name} » — renseignez Workspace.crmCompanyId (seed / SQL).`,
    };
  } catch (e) {
    const msg =
      e instanceof CrmHttpError
        ? e.message
        : e instanceof Error
          ? e.message
          : "CRM indisponible";
    console.error("[bff] CRM prestations list failed:", msg);
    return { items: [], source: "crm", warning: msg };
  }
}

export async function getPrestation(
  workspaceId: string,
  id: string,
): Promise<{
  prestation: PortalPrestation | null;
  source: "crm" | "mock";
  warning?: string;
}> {
  if (prestationsSource() === "mock") {
    return {
      prestation: mockPrestation(workspaceId, id),
      source: "mock",
    };
  }

  try {
    const deal = await crmDealById(id);
    // Vérifie rattachement workspace si crmCompanyId connu
    const ws = await workspaceCrmCompanyId(workspaceId);
    if (ws?.crmCompanyId && deal.company?.id && deal.company.id !== ws.crmCompanyId) {
      return {
        prestation: null,
        source: "crm",
        warning: "Affaire hors établissement actif",
      };
    }
    return {
      prestation: dealToPrestation(deal, workspaceId),
      source: "crm",
    };
  } catch (e) {
    if (e instanceof CrmHttpError && e.status === 404) {
      return { prestation: null, source: "crm" };
    }
    const msg =
      e instanceof Error ? e.message : "CRM indisponible";
    console.error("[bff] CRM prestation detail failed:", msg);
    return { prestation: null, source: "crm", warning: msg };
  }
}

export function isOpenPrestation(p: PortalPrestation) {
  return p.status === "EN_COURS" || p.status === "PIECES_MANQUANTES";
}
