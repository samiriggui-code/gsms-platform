import type { AuthResponse, RoleDefinition, UserProfile } from '../api/types';

export interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  personas: string[];
  roles: Record<string, RoleDefinition>;
  login: (email: string, password: string) => Promise<AuthResponse>;
  /** Retour du portail GSMS (mode Core) : ouvre la session et renvoie la page à afficher. */
  loginWithGsms: (code: string, state: string) => Promise<string>;
  logout: () => void;
}
