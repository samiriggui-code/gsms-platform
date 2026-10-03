/**
 * "Se connecter avec GSMS" — OpenID Connect configuration.
 *
 * The GSMS Core is the OIDC provider (see docs/architecture/IDENTITE-SSO.md at
 * the platform root). GRACE is a confidential client (`grace`).
 */

export interface SsoConfig {
  enabled: boolean;
  /** Issuer URL without trailing slash, e.g. https://gsms-security.com */
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  /** Must match, character for character, a redirect_uri registered in the Core. */
  callbackUrl: string;
  /** id_token claim carrying the GRACE role (already translated by the Core). */
  roleClaim: string;
  /** Label shown on the login button ("Se connecter avec …"). */
  providerName: string;
}

export function loadSsoConfig(env: NodeJS.ProcessEnv = process.env): SsoConfig {
  return {
    enabled: (env.SSO_ENABLED ?? '').trim().toLowerCase() === 'true',
    issuerUrl: (env.SSO_ISSUER_URL ?? '').trim().replace(/\/+$/, ''),
    clientId: (env.SSO_CLIENT_ID ?? '').trim(),
    clientSecret: (env.SSO_CLIENT_SECRET ?? '').trim(),
    callbackUrl: (env.SSO_CALLBACK_URL ?? '').trim(),
    roleClaim: (env.SSO_ROLE_CLAIM ?? '').trim() || 'gsms_role',
    providerName: (env.SSO_PROVIDER_NAME ?? '').trim() || 'GSMS',
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Fail fast: when SSO is enabled, every required variable must be present and
 * well-formed. Returns the list of problems (empty = OK).
 */
export function validateSsoConfig(config: SsoConfig): string[] {
  if (!config.enabled) return [];
  const problems: string[] = [];
  if (!config.issuerUrl) problems.push('SSO_ISSUER_URL is required');
  else if (!isHttpUrl(config.issuerUrl)) problems.push('SSO_ISSUER_URL must be an http(s) URL');
  if (!config.clientId) problems.push('SSO_CLIENT_ID is required');
  if (!config.clientSecret) problems.push('SSO_CLIENT_SECRET is required');
  if (!config.callbackUrl) problems.push('SSO_CALLBACK_URL is required');
  else if (!isHttpUrl(config.callbackUrl)) problems.push('SSO_CALLBACK_URL must be an http(s) URL');
  return problems;
}

export function assertValidSsoConfig(config: SsoConfig): void {
  const problems = validateSsoConfig(config);
  if (problems.length > 0) {
    throw new Error(
      `SSO_ENABLED=true but the GSMS SSO configuration is invalid: ${problems.join('; ')}. ` +
        'Fix the SSO_* environment variables or set SSO_ENABLED=false.',
    );
  }
}
