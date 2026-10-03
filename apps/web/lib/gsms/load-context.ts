/**
 * Charge le contexte métier GSMS depuis le Core (ContextResolver).
 * Aucune invention d'ID côté front.
 */
import { cache } from "react";
import { coreFetch, getWorkspaceContext } from "@/lib/core/client";
import { ENDPOINTS } from "@/lib/core/endpoints";
import { mapContextPayload, type GsmsContext, type GsmsContextPayload } from "@/lib/gsms/context";

export const loadGsmsContext = cache(async (): Promise<
  | { ok: true; context: GsmsContext }
  | { ok: false; reason: "no_workspace" | "core_error"; message: string }
> => {
  const { workspaceId, failure } = await getWorkspaceContext();
  if (failure) {
    return { ok: false, reason: "core_error", message: failure.message };
  }
  if (!workspaceId) {
    return {
      ok: false,
      reason: "no_workspace",
      message: "Aucun workspace sélectionné. Choisissez un site / une prestation.",
    };
  }
  const result = await coreFetch<GsmsContextPayload>(ENDPOINTS.workspaces.context(workspaceId), {
    workspaceId,
  });
  if (!result.ok) {
    return { ok: false, reason: "core_error", message: result.message };
  }
  return { ok: true, context: mapContextPayload(result.data) };
});
