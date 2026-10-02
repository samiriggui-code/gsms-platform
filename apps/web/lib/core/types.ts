/**
 * Types minimaux des ressources Core consommées par l'UI.
 * Volontairement permissifs (champs optionnels) tant que le schéma OpenAPI
 * du Core n'est pas publié ; à remplacer par des types générés.
 */

export type Id = string;

export type Workspace = {
  id: Id;
  name: string;
  label?: string | null;
  organization_name?: string | null;
  address?: string | null;
};

/** Miroir de `MeOut` (apps/core/gsms_core/identity/schemas.py). */
export type Me = {
  id: Id;
  email: string;
  name: string;
  locale: string;
  org_id: Id;
  organization_name?: string | null;
  workspace_id: Id | null;
  role: string;
  workspaces: Workspace[];
};

export type LoginResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  workspace_id?: string | null;
};

/** Ligne générique : les vues liste affichent des colonnes connues avec repli. */
export type Row = Record<string, unknown> & { id?: Id };
