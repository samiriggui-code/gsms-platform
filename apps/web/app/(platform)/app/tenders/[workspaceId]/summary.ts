import { cache } from "react";
import { coreFetch } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";

export type TenderSummary = {
  id?: string;
  mission_id?: string;
  workspace_id?: string;
  title?: string;
  reference?: string;
  consultation_ref?: string;
  buyer?: string | { name?: string };
  status?: string;
  dossier_status?: string;
  dossier_status_label?: string;
  decision?: string | null;
  amount?: number;
  lots?: { id?: string; title?: string; amount?: number }[];
  submission_deadline?: string;
  next_deadlines?: { id?: string; title?: string; due_at?: string; source?: string }[];
};

export type DossierStatus = {
  status: string;
  label: string;
  decision: string;
  transitions: { to: string; label: string; comment_required: boolean; requires_go: boolean }[];
  history: { from_status: string; to_status: string; actor: string; comment?: string | null; at: string }[];
};

const UUID = /^[0-9a-f-]{36}$/i;

/** Dossier AO porté par ce workspace (une URL = un workspace AO), dédupliqué entre layout et pages. */
export const getTenderSummary = cache(async (workspaceId: string) => {
  if (!UUID.test(workspaceId)) return { workspaceId: null, missionId: null, result: null };
  const result = await coreFetch<TenderSummary>(ENDPOINTS.tenders.current(workspaceId), { workspaceId });
  const missionId = result.ok ? (result.data.mission_id ?? result.data.id ?? null) : null;
  return { workspaceId, missionId, result };
});

export const getDossierStatus = cache(async (workspaceId: string, missionId: string) =>
  coreFetch<DossierStatus>(ENDPOINTS.tenders.status(workspaceId, missionId), { workspaceId, missionId }),
);
