/**
 * "Se connecter avec GSMS" — OpenID Connect relying party (authorization code
 * flow + PKCE S256) against the GSMS Core.
 *
 * Contract: docs/architecture/IDENTITE-SSO.md (platform root).
 *
 *   GET  /api/auth/sso/config    → { enabled, providerName }        (public)
 *   GET  /api/auth/sso/login     → 302 to the Core's authorization endpoint
 *   GET  /api/auth/sso/callback  → Core redirects here; provisions the user,
 *                                  then 302 to `/#sso_token=<one-time code>`
 *                                  (or `/login?sso_error=<message>`)
 *   POST /api/auth/sso/token     → { token } one-time code → same payload as
 *                                  POST /api/auth/login ({ token, user, organization })
 *
 * Security notes:
 *  - `state` is single-use (10 min) and also bound to the browser through an
 *    HttpOnly cookie, so a callback URL crafted by someone else cannot log the
 *    victim into the attacker's account (login CSRF).
 *  - `nonce` is checked against the verified id_token; PKCE `code_verifier`
 *    never leaves the server until the back-channel token exchange.
 *  - The id_token signature (RS256, Core JWKS), issuer, audience and expiry
 *    are verified before any claim is trusted.
 *  - The GRACE JWT is never put in a URL: the browser receives a 60-second,
 *    single-use exchange code in the fragment, which it trades via POST.
 *
 * State is kept in memory: fine for the single-instance GRACE API. A restart
 * between /login and /callback simply asks the user to click again.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { getInstanceOrg, getInstanceOrgOrNull } from '../../lib/instance-org.js';
import type { JwtPayload } from '../../lib/jwt.js';
import { publicUser } from '../auth/routes.js';
import { authResponseSchema } from '../auth/schema.js';
import { assertValidSsoConfig, loadSsoConfig, type SsoConfig } from './config.js';

export const GRACE_ROLES = [
  'ADMIN',
  'LEAD_ASSESSOR',
  'ASSESSOR',
  'REVIEWER',
  'STAKEHOLDER',
] as const satisfies readonly UserRole[];

const DISCOVERY_TTL_MS = 60 * 60 * 1000; // 1 h
const STATE_TTL_MS = 10 * 60 * 1000; // 10 min
const EXCHANGE_CODE_TTL_MS = 60 * 1000; // 60 s
const MAX_PENDING = 5_000; // cap memory use of the unauthenticated /login endpoint
const HTTP_TIMEOUT_MS = 10_000;
const STATE_COOKIE = 'grace_sso_state';

/** Messages shown to the user on the login page (French UI). */
export const SSO_MESSAGES = {
  accessDenied: 'Accès refusé par GSMS',
  disabled: 'La connexion GSMS n’est pas activée sur cette instance.',
  providerError: 'Connexion GSMS impossible. Réessayez dans quelques instants.',
  idpUnreachable: 'Le service de connexion GSMS est injoignable. Réessayez dans quelques instants.',
  invalidState: 'Session de connexion GSMS expirée ou invalide. Veuillez réessayer.',
  invalidToken: 'Réponse de GSMS invalide : connexion refusée.',
  missingEmail: 'Votre compte GSMS ne transmet pas d’adresse e-mail vérifiée.',
  missingRole:
    'Aucun rôle GRACE n’est attribué à votre compte GSMS. Contactez un administrateur GSMS.',
  notBootstrapped:
    'GRACE n’est pas encore initialisé : un administrateur doit d’abord créer l’organisation.',
} as const;

// ── Small helpers ─────────────────────────────────────────────────────────

/** Single-use entries with a TTL and a hard size cap. */
export class TtlStore<T> {
  private readonly map = new Map<string, { value: T; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
    private readonly now: () => number = Date.now,
  ) {}

  set(key: string, value: T): void {
    this.prune();
    while (this.map.size >= this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
    this.map.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }

  /** Returns the value and deletes it (single use). Expired → undefined. */
  take(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    this.map.delete(key);
    return entry.expiresAt > this.now() ? entry.value : undefined;
  }

  get size(): number {
    return this.map.size;
  }

  private prune(): void {
    const now = this.now();
    for (const [key, entry] of this.map) {
      if (entry.expiresAt <= now) this.map.delete(key);
    }
  }
}

class SsoError extends Error {
  constructor(
    readonly userMessage: string,
    detail?: string,
  ) {
    super(detail ?? userMessage);
  }
}

const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
const pkceChallenge = (verifier: string) =>
  createHash('sha256').update(verifier).digest('base64url');

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function readCookie(req: FastifyRequest, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function stringClaim(payload: JWTPayload, name: string): string {
  const v = payload[name];
  return typeof v === 'string' ? v.trim() : '';
}

/** Derive first/last name from OIDC profile claims, falling back to the e-mail. */
export function namesFromClaims(
  payload: JWTPayload,
  email: string,
): { firstName: string; lastName: string } {
  let firstName = stringClaim(payload, 'given_name');
  let lastName = stringClaim(payload, 'family_name');
  if (!firstName && !lastName) {
    const full = stringClaim(payload, 'name');
    if (full) {
      const [first, ...rest] = full.split(/\s+/);
      firstName = first ?? '';
      lastName = rest.join(' ');
    }
  }
  if (!firstName) firstName = email.split('@')[0] ?? email;
  return { firstName: firstName.slice(0, 100), lastName: lastName.slice(0, 100) };
}

export function roleFromClaim(value: unknown): UserRole | null {
  return typeof value === 'string' && (GRACE_ROLES as readonly string[]).includes(value)
    ? (value as UserRole)
    : null;
}

const discoverySchema = z.object({
  issuer: z.string().min(1),
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  jwks_uri: z.string().url(),
});
type OidcDiscovery = z.infer<typeof discoverySchema>;

const tokenResponseSchema = z.object({
  id_token: z.string().min(1),
  access_token: z.string().optional(),
  token_type: z.string().optional(),
});

const errorSchema = z.object({ error: z.string() });

// ── Plugin ────────────────────────────────────────────────────────────────

export interface SsoRoutesOptions {
  /** Defaults to the SSO_* environment variables. */
  config?: SsoConfig;
}

export default async function ssoRoutes(app: FastifyInstance, opts: SsoRoutesOptions) {
  const config = opts.config ?? loadSsoConfig();
  assertValidSsoConfig(config); // fail fast at startup when enabled but misconfigured

  const router = app.withTypeProvider<ZodTypeProvider>();

  const pendingLogins = new TtlStore<{ nonce: string; codeVerifier: string }>(
    STATE_TTL_MS,
    MAX_PENDING,
  );
  const exchangeCodes = new TtlStore<{ userId: string }>(EXCHANGE_CODE_TTL_MS, MAX_PENDING);

  let discoveryCache: { value: OidcDiscovery; fetchedAt: number } | null = null;
  let jwksCache: { uri: string; jwks: ReturnType<typeof createRemoteJWKSet> } | null = null;

  const secureCookie = config.enabled && config.callbackUrl.startsWith('https:');
  // Scope the state cookie to the SSO routes (…/api/auth/sso).
  const cookiePath = config.enabled
    ? new URL(config.callbackUrl).pathname.replace(/\/[^/]*$/, '') || '/'
    : '/';

  function stateCookie(value: string, maxAgeSeconds: number): string {
    return [
      `${STATE_COOKIE}=${encodeURIComponent(value)}`,
      `Path=${cookiePath}`,
      `Max-Age=${maxAgeSeconds}`,
      'HttpOnly',
      'SameSite=Lax',
      ...(secureCookie ? ['Secure'] : []),
    ].join('; ');
  }

  async function getDiscovery(): Promise<OidcDiscovery> {
    if (discoveryCache && Date.now() - discoveryCache.fetchedAt < DISCOVERY_TTL_MS) {
      return discoveryCache.value;
    }
    const url = `${config.issuerUrl}/.well-known/openid-configuration`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`OIDC discovery failed: HTTP ${res.status} on ${url}`);
    const parsed = discoverySchema.safeParse(await res.json());
    if (!parsed.success) throw new Error(`OIDC discovery document is invalid (${url})`);
    if (parsed.data.issuer.replace(/\/+$/, '') !== config.issuerUrl) {
      throw new Error(
        `OIDC issuer mismatch: discovery says "${parsed.data.issuer}", SSO_ISSUER_URL is "${config.issuerUrl}"`,
      );
    }
    discoveryCache = { value: parsed.data, fetchedAt: Date.now() };
    return parsed.data;
  }

  function getJwks(discovery: OidcDiscovery) {
    if (!jwksCache || jwksCache.uri !== discovery.jwks_uri) {
      jwksCache = {
        uri: discovery.jwks_uri,
        jwks: createRemoteJWKSet(new URL(discovery.jwks_uri), { timeoutDuration: HTTP_TIMEOUT_MS }),
      };
    }
    return jwksCache.jwks;
  }

  const redirectError = (reply: FastifyReply, message: string) =>
    reply
      .header('Cache-Control', 'no-store')
      .redirect(`/login?sso_error=${encodeURIComponent(message)}`);

  // ── GET /config ──────────────────────────────────────────────────────────
  router.get(
    '/config',
    {
      schema: {
        tags: ['auth'],
        summary: 'Public GSMS SSO status (login button)',
        response: { 200: z.object({ enabled: z.boolean(), providerName: z.string() }) },
      },
    },
    async () => ({ enabled: config.enabled, providerName: config.providerName }),
  );

  // ── GET /login ───────────────────────────────────────────────────────────
  router.get(
    '/login',
    { schema: { tags: ['auth'], summary: 'Start "Se connecter avec GSMS" (redirect)' } },
    async (req, reply) => {
      if (!config.enabled) return redirectError(reply, SSO_MESSAGES.disabled);

      let discovery: OidcDiscovery;
      try {
        discovery = await getDiscovery();
      } catch (err) {
        req.log.error({ err }, 'sso: OIDC discovery failed');
        return redirectError(reply, SSO_MESSAGES.idpUnreachable);
      }

      const state = randomToken();
      const nonce = randomToken();
      const codeVerifier = randomToken(48);
      pendingLogins.set(state, { nonce, codeVerifier });

      const authUrl = new URL(discovery.authorization_endpoint);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', config.callbackUrl);
      authUrl.searchParams.set('scope', 'openid profile email');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('nonce', nonce);
      authUrl.searchParams.set('code_challenge', pkceChallenge(codeVerifier));
      authUrl.searchParams.set('code_challenge_method', 'S256');

      return reply
        .header('Cache-Control', 'no-store')
        .header('Set-Cookie', stateCookie(state, STATE_TTL_MS / 1000))
        .redirect(authUrl.toString());
    },
  );

  // ── GET /callback ────────────────────────────────────────────────────────
  router.get(
    '/callback',
    {
      schema: {
        tags: ['auth'],
        summary: 'OIDC redirect target (registered in the GSMS Core)',
        querystring: z
          .object({
            code: z.string().optional(),
            state: z.string().optional(),
            error: z.string().optional(),
            error_description: z.string().optional(),
          })
          .passthrough(),
      },
    },
    async (req, reply) => {
      if (!config.enabled) return redirectError(reply, SSO_MESSAGES.disabled);

      const { code, state, error } = req.query;
      // Consume the pending login whatever happens next (single use).
      const pending = state ? pendingLogins.take(state) : undefined;
      const cookieState = readCookie(req, STATE_COOKIE);
      reply.header('Set-Cookie', stateCookie('', 0));

      if (error) {
        req.log.warn(
          { error, description: req.query.error_description },
          'sso: GSMS returned an error',
        );
        return redirectError(
          reply,
          error === 'access_denied' ? SSO_MESSAGES.accessDenied : SSO_MESSAGES.providerError,
        );
      }

      if (!code || !state || !pending || !cookieState || !safeEqual(cookieState, state)) {
        req.log.warn(
          { hasCode: Boolean(code), hasPending: Boolean(pending), hasCookie: Boolean(cookieState) },
          'sso: invalid or expired state',
        );
        return redirectError(reply, SSO_MESSAGES.invalidState);
      }

      try {
        const discovery = await getDiscovery();

        // Back-channel code exchange (client_secret_post + PKCE verifier).
        const tokenRes = await fetch(discovery.token_endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: config.callbackUrl,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code_verifier: pending.codeVerifier,
          }).toString(),
          signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
        });
        if (!tokenRes.ok) {
          const body = (await tokenRes.text()).slice(0, 500);
          throw new SsoError(
            SSO_MESSAGES.providerError,
            `token endpoint HTTP ${tokenRes.status}: ${body}`,
          );
        }
        const tokens = tokenResponseSchema.safeParse(await tokenRes.json());
        if (!tokens.success) {
          throw new SsoError(SSO_MESSAGES.invalidToken, 'token response has no id_token');
        }

        let payload: JWTPayload;
        try {
          ({ payload } = await jwtVerify(tokens.data.id_token, getJwks(discovery), {
            issuer: discovery.issuer,
            audience: config.clientId,
            algorithms: ['RS256'],
            clockTolerance: 30,
          }));
        } catch (err) {
          throw new SsoError(
            SSO_MESSAGES.invalidToken,
            `id_token verification failed: ${(err as Error).message}`,
          );
        }
        if (typeof payload.nonce !== 'string' || !safeEqual(payload.nonce, pending.nonce)) {
          throw new SsoError(SSO_MESSAGES.invalidToken, 'id_token nonce mismatch');
        }
        if (
          Array.isArray(payload.aud) &&
          payload.aud.length > 1 &&
          stringClaim(payload, 'azp') !== config.clientId
        ) {
          throw new SsoError(SSO_MESSAGES.invalidToken, 'id_token azp mismatch');
        }

        const email = stringClaim(payload, 'email').toLowerCase();
        if (!email || !email.includes('@') || payload.email_verified === false) {
          throw new SsoError(SSO_MESSAGES.missingEmail, 'id_token has no verified email');
        }
        const role = roleFromClaim(payload[config.roleClaim]);
        if (!role) {
          throw new SsoError(
            SSO_MESSAGES.missingRole,
            `claim ${config.roleClaim}=${JSON.stringify(payload[config.roleClaim])} is not a GRACE role`,
          );
        }
        const { firstName, lastName } = namesFromClaims(payload, email);

        // Never create users on an instance that has not been bootstrapped:
        // /api/auth/register only works while the users table is empty.
        if (!(await getInstanceOrgOrNull())) {
          throw new SsoError(SSO_MESSAGES.notBootstrapped, 'instance organization missing');
        }

        // A local account and a GSMS account with the same e-mail are the same user.
        const existing = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          orderBy: { createdAt: 'asc' },
        });
        const now = new Date();
        const user = existing
          ? await prisma.user.update({
              where: { id: existing.id },
              data: { role, firstName, lastName, isActive: true, lastLoginAt: now },
            })
          : await prisma.user.create({
              data: {
                email,
                // Real bcrypt hash of an unknown random secret: password login
                // is impossible until an admin sets a password.
                passwordHash: await bcrypt.hash(randomToken(32), 10),
                firstName,
                lastName,
                role,
                isActive: true,
                lastLoginAt: now,
              },
            });

        req.log.info(
          { userId: user.id, role, created: !existing, sub: payload.sub },
          'sso: GSMS login',
        );

        const exchangeCode = randomToken(32);
        exchangeCodes.set(exchangeCode, { userId: user.id });
        return reply
          .header('Cache-Control', 'no-store')
          .redirect(`/#sso_token=${encodeURIComponent(exchangeCode)}`);
      } catch (err) {
        if (err instanceof SsoError) {
          req.log.warn({ reason: err.message }, 'sso: login refused');
          return redirectError(reply, err.userMessage);
        }
        req.log.error({ err }, 'sso: callback failed');
        return redirectError(reply, SSO_MESSAGES.providerError);
      }
    },
  );

  // ── POST /token ──────────────────────────────────────────────────────────
  router.post(
    '/token',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        tags: ['auth'],
        summary: 'Exchange the one-time GSMS SSO code for a GRACE session',
        body: z.object({ token: z.string().min(1).max(200) }),
        response: { 200: authResponseSchema, 401: errorSchema },
      },
    },
    async (req, reply) => {
      reply.header('Cache-Control', 'no-store');
      const entry = exchangeCodes.take(req.body.token);
      if (!entry) return reply.code(401).send({ error: 'Code de connexion GSMS invalide ou expiré' });

      const user = await prisma.user.findUnique({ where: { id: entry.userId } });
      if (!user || !user.isActive) {
        return reply.code(401).send({ error: 'Compte désactivé' });
      }

      const org = await getInstanceOrg();
      const token = await reply.jwtSign({
        sub: user.id,
        role: user.role,
        email: user.email,
      } satisfies JwtPayload);

      return reply.send({
        token,
        user: publicUser(user),
        organization: { id: org.id, name: org.name, slug: org.slug },
      });
    },
  );
}
