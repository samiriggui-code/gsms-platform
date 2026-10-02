import { ENDPOINTS } from "@/lib/core/endpoints";

/**
 * Onglets d'un dossier AO (/app/tenders/{missionId}) — Annexe B.
 * `endpoint` pointe vers la ressource Core correspondante (voir lib/core/endpoints.ts).
 */
export type TenderTabSlug =
  | "synthese"
  | "pieces"
  | "analyse"
  | "exigences"
  | "conformite"
  | "go-no-go"
  | "risques"
  | "questions"
  | "reponse-technique"
  | "reponse-financiere"
  | "documents"
  | "echeances"
  | "historique"
  | "agents";

export type TenderTab = {
  slug: TenderTabSlug;
  label: string;
  description: string;
  source: string;
  endpoint: (workspaceId: string, missionId: string) => string;
};

const T = ENDPOINTS.tenders;

export const TENDER_TABS: TenderTab[] = [
  { slug: "synthese", label: "Synthèse", source: "Core", endpoint: T.summary, description: "Mission AO, acheteur, lots, montant, statut et prochaines échéances." },
  { slug: "pieces", label: "DCE / Pièces", source: "Core Documents", endpoint: T.pieces, description: "Pièces typées (RC, CCTP, CCAP, AE, BPU, DPGF, annexes) : exigées et fournies." },
  { slug: "analyse", label: "Analyse", source: "Moteur AO + Core", endpoint: T.analysis, description: "Sections du dossier et critères d'évaluation extraits du règlement de consultation." },
  { slug: "exigences", label: "Exigences", source: "Moteur AO → Core", endpoint: T.requirements, description: "Exigences persistées par le Core, avec propriétaire et statut." },
  { slug: "conformite", label: "Conformité", source: "Moteur AO + décision humaine", endpoint: T.compliance, description: "Matrice de conformité. Le statut final est décidé par un humain dans le Core." },
  { slug: "go-no-go", label: "Go / No-Go", source: "Core", endpoint: T.goNoGo, description: "Grille déterministe (adéquation, capacité, géographie, marge, risques, délai), avis de l'assistant et décision humaine tracée." },
  { slug: "risques", label: "Risques", source: "Core", endpoint: T.risks, description: "Risques issus de l'analyse et de la grille Go / No-Go." },
  { slug: "questions", label: "Questions", source: "Core", endpoint: T.questions, description: "Questions à l'acheteur et date limite de questions." },
  { slug: "reponse-technique", label: "Réponse technique", source: "Moteur AO", endpoint: T.technicalResponse, description: "Sections du mémoire technique, versionnées comme documents." },
  { slug: "reponse-financiere", label: "Réponse financière", source: "Moteur AO", endpoint: T.financialResponse, description: "Devis fournisseurs, nomenclature, calcul de prix et proposition financière." },
  { slug: "documents", label: "Documents", source: "Core", endpoint: T.documents, description: "Toutes les versions générées et déposées." },
  { slug: "echeances", label: "Échéances", source: "Core", endpoint: T.deadlines, description: "Jalons : questions, visite, remise ; rappels." },
  { slug: "historique", label: "Historique", source: "Core (événements + journal d'audit)", endpoint: T.history, description: "Événements et journal d'audit du dossier." },
  { slug: "agents", label: "Agents", source: "Assistant", endpoint: T.agents, description: "Tâches proposées par l'assistant (préparer les pièces, résumer le CCTP…), à valider." },
];

export function tenderTab(slug: string): TenderTab | undefined {
  return TENDER_TABS.find((tab) => tab.slug === slug);
}

export function tenderHref(missionId: string, slug: TenderTabSlug = "synthese") {
  const base = `/app/tenders/${encodeURIComponent(missionId)}`;
  return slug === "synthese" ? base : `${base}/${slug}`;
}
