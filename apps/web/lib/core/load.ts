import { type CoreRequest, type CoreResult, coreFetch, getWorkspaceContext } from "./client";

export type WorkspaceLoad<T> = { workspaceId: string | null; result: CoreResult<T> | null };

/**
 * Charge une ressource scoped au site courant.
 * `result` vaut null si aucun site n'est sélectionné (état « choisir un site »),
 * ou l'échec Core si le profil n'a pas pu être chargé.
 */
export async function loadForWorkspace<T>(
  path: (workspaceId: string) => string,
  req: Omit<CoreRequest, "workspaceId"> = {},
): Promise<WorkspaceLoad<T>> {
  const { workspaceId, failure } = await getWorkspaceContext();
  if (!workspaceId) return { workspaceId: null, result: failure };
  const result = await coreFetch<T>(path(workspaceId), { ...req, workspaceId });
  return { workspaceId, result };
}
