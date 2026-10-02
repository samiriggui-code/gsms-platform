import { cache } from "react";
import { coreFetch, getWorkspaceContext } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";

export type TenderSummary = {
  id?: string;
  title?: string;
  reference?: string;
  buyer?: string | { name?: string };
  status?: string;
  amount?: number;
  lots?: { id?: string; title?: string; amount?: number }[];
  submission_deadline?: string;
  next_deadlines?: { id?: string; title?: string; due_at?: string }[];
};

/** Synthèse du dossier, dédupliquée entre layout et page dans une même requête. */
export const getTenderSummary = cache(async (missionId: string) => {
  const { workspaceId, failure } = await getWorkspaceContext();
  if (!workspaceId) return { workspaceId: null, result: failure };
  const result = await coreFetch<TenderSummary>(ENDPOINTS.tenders.summary(workspaceId, missionId), { workspaceId, missionId });
  return { workspaceId, result };
});
