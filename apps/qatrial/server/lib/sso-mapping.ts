/**
 * Pure helpers for the OIDC SSO flow (GSMS Core as identity provider).
 * See docs/architecture/IDENTITE-SSO.md at the monorepo root.
 *
 * Kept free of Prisma / JWT_SECRET imports so they can be unit-tested.
 */
import * as crypto from 'crypto';

/** Self-service sign-up (POST /api/auth/register). Default true for backward compatibility. */
export function isRegistrationEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.REGISTRATION_ENABLED !== 'false';
}

// ── PKCE (RFC 7636, S256) ───────────────────────────────────────────────────

export function generateCodeVerifier(): string {
  // 32 random bytes → 43 base64url chars (within the 43..128 range required).
  return crypto.randomBytes(32).toString('base64url');
}

export function codeChallengeS256(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// ── E-mail ──────────────────────────────────────────────────────────────────

export function normalizeEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

// ── IdP error → user-facing message ─────────────────────────────────────────

export function mapIdpError(error: string, description: string | undefined, providerName: string): string {
  if (error === 'access_denied') return `Accès refusé par ${providerName}`;
  return description || error;
}

// ── Role ────────────────────────────────────────────────────────────────────

export type RoleResolution =
  | { ok: true; role: string | null } // null = keep the existing role unchanged
  | { ok: false; error: string };

/**
 * Decide which role the user gets on this SSO login.
 *
 * - Role claim configured and present → must be a valid QAtrial role; it is applied on
 *   every login (the Core is the source of truth). Invalid value → refused.
 * - Claim absent (generic IdP) → new users get `defaultRole`, existing users keep theirs.
 */
export function resolveSsoRole(opts: {
  claims: Record<string, unknown>;
  roleClaim: string;
  validRoles: readonly string[];
  defaultRole: string;
  isNewUser: boolean;
}): RoleResolution {
  const { claims, roleClaim, validRoles, defaultRole, isNewUser } = opts;
  const raw = roleClaim ? claims[roleClaim] : undefined;
  const present = raw !== undefined && raw !== null && raw !== '';

  if (present) {
    if (typeof raw !== 'string' || !validRoles.includes(raw)) {
      return { ok: false, error: `Rôle SSO invalide : ${String(raw)}` };
    }
    return { ok: true, role: raw };
  }

  if (isNewUser) {
    if (!validRoles.includes(defaultRole)) {
      return { ok: false, error: `Rôle SSO par défaut invalide : ${defaultRole}` };
    }
    return { ok: true, role: defaultRole };
  }
  return { ok: true, role: null };
}

// ── Organisation ────────────────────────────────────────────────────────────

/** Minimal Prisma-like surface needed to resolve the shared SSO organisation. */
export interface SsoOrgDb {
  organization: {
    findFirst(args: { where: { name: string }; orderBy?: { createdAt: 'asc' } }): Promise<{ id: string } | null>;
    create(args: { data: { name: string } }): Promise<{ id: string }>;
  };
  workspace: {
    create(args: { data: { name: string; orgId: string } }): Promise<unknown>;
  };
}

/** Find the organisation named `orgName` (first created), or create it with a default workspace. */
export async function findOrCreateSsoOrg(db: SsoOrgDb, orgName: string): Promise<string> {
  const existing = await db.organization.findFirst({ where: { name: orgName }, orderBy: { createdAt: 'asc' } });
  if (existing) return existing.id;
  const org = await db.organization.create({ data: { name: orgName } });
  await db.workspace.create({ data: { name: 'Default Workspace', orgId: org.id } });
  return org.id;
}

/**
 * Compute the update to apply to an existing user on SSO login.
 * Name is refreshed, role synced when the IdP provided one, orgId only set when missing.
 */
export async function buildExistingUserUpdate(
  user: { name: string; role: string; orgId: string | null },
  incoming: { name: string; role: string | null },
  ssoOrgId: () => Promise<string>,
): Promise<{ name?: string; role?: string; orgId?: string }> {
  const data: { name?: string; role?: string; orgId?: string } = {};
  if (incoming.name && incoming.name !== user.name) data.name = incoming.name;
  if (incoming.role && incoming.role !== user.role) data.role = incoming.role;
  if (!user.orgId) data.orgId = await ssoOrgId();
  return data;
}
