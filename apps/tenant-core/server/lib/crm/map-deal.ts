import type { CrmDealDetail, CrmDealListRow } from "./client.js";

export type PortalPrestation = {
  id: string;
  title: string;
  kind: "PRECOM" | "AUDIT" | "AO";
  status: "PIECES_MANQUANTES" | "EN_COURS" | "LIVREE" | "CLOTUREE";
  workspaceId: string;
  startedAt: string;
  contactGsms: string;
  summary: string;
};

const OPEN_STAGES = new Set([
  "DEMO_BOOKED",
  "QUALIFIED_TO_BUY",
  "DECISION_MAKER_BOUGHT_IN",
  "CONTRACT_SENT",
]);

/** DealStage CRM → statut portail. */
export function mapDealStage(stage: string): PortalPrestation["status"] {
  switch (stage) {
    case "DEMO_BOOKED":
    case "QUALIFIED_TO_BUY":
      return "EN_COURS";
    case "DECISION_MAKER_BOUGHT_IN":
    case "CONTRACT_SENT":
      return "PIECES_MANQUANTES";
    case "CLOSED_WON":
      return "LIVREE";
    case "CLOSED_LOST":
    case "UNQUALIFIED_TO_BUY":
      return "CLOTUREE";
    default:
      return OPEN_STAGES.has(stage) ? "EN_COURS" : "CLOTUREE";
  }
}

/** Infère le type mission depuis le libellé deal (CRM n’a pas PRECOM/AUDIT/AO). */
export function mapDealKind(name: string, description?: string | null): PortalPrestation["kind"] {
  const hay = `${name} ${description ?? ""}`.toLowerCase();
  if (
    hay.includes("commission") ||
    hay.includes("précom") ||
    hay.includes("precom") ||
    hay.includes("incendie")
  ) {
    return "PRECOM";
  }
  if (
    hay.includes(" appel d") ||
    hay.includes("ao ") ||
    hay.includes("ao—") ||
    hay.includes("ao-") ||
    hay.includes("tender") ||
    hay.includes("marché") ||
    hay.includes("gardiennage")
  ) {
    return "AO";
  }
  return "AUDIT";
}

function contactFromDeal(deal: CrmDealDetail | CrmDealListRow): string {
  if ("contacts" in deal && deal.contacts?.length) {
    const c = deal.contacts[0]!;
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
    if (name) return `${name} — contact affaire`;
    if (c.email) return c.email;
  }
  if (deal.owner?.name) return `${deal.owner.name} — CRM`;
  return "Cabinet GSMS";
}

function startedAt(iso: string | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10);
}

export function dealToPrestation(
  deal: CrmDealDetail | CrmDealListRow,
  workspaceId: string,
): PortalPrestation {
  const description =
    "description" in deal ? (deal.description ?? null) : null;
  return {
    id: deal.id,
    title: deal.name,
    kind: mapDealKind(deal.name, description),
    status: mapDealStage(deal.stage),
    workspaceId,
    startedAt: startedAt(deal.createdAt),
    contactGsms: contactFromDeal(deal),
    summary:
      description?.trim() ||
      `Affaire CRM · stage ${deal.stage}` +
        (deal.company?.name ? ` · ${deal.company.name}` : ""),
  };
}
