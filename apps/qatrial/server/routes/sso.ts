import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { signAccessToken, signRefreshToken, VALID_ROLES, type JwtPayload } from '../middleware/auth.js';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import {
  buildExistingUserUpdate,
  codeChallengeS256,
  findOrCreateSsoOrg,
  generateCodeVerifier,
  isRegistrationEnabled,
  mapIdpError,
  normalizeEmail,
  resolveSsoRole,
} from '../lib/sso-mapping.js';

const sso = new Hono();

// ── SSO Configuration from environment ─────────────────────────────────────

function getSsoConfig() {
  return {
    enabled: process.env.SSO_ENABLED === 'true',
    type: process.env.SSO_TYPE || 'oidc',
    issuerUrl: process.env.SSO_ISSUER_URL || '',
    clientId: process.env.SSO_CLIENT_ID || '',
    clientSecret: process.env.SSO_CLIENT_SECRET || '',
    callbackUrl: process.env.SSO_CALLBACK_URL || 'http://localhost:3001/api/auth/sso/callback',
    defaultRole: process.env.SSO_DEFAULT_ROLE || 'qa_engineer',
    autoProvision: process.env.SSO_AUTO_PROVISION !== 'false',
    // Claim carrying the QAtrial role (GSMS Core: `gsms_role`, already translated).
    roleClaim: process.env.SSO_ROLE_CLAIM ?? 'gsms_role',
    // All SSO users are attached to this organisation (created if absent).
    orgName: process.env.SSO_ORG_NAME || 'GSMS',
    providerName: process.env.SSO_PROVIDER_NAME || 'GSMS',
  };
}

// ── OIDC Discovery cache ───────────────────────────────────────────────────

interface OidcDiscovery {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  issuer: string;
}

let discoveryCache: OidcDiscovery | null = null;
let discoveryCacheTime = 0;
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
const DISCOVERY_TTL = 3600_000; // 1 hour

async function getOidcDiscovery(issuerUrl: string): Promise<OidcDiscovery> {
  if (discoveryCache && Date.now() - discoveryCacheTime < DISCOVERY_TTL) {
    return discoveryCache;
  }

  const url = `${issuerUrl.replace(/\/$/, '')}/.well-known/openid-configuration`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OIDC discovery failed: ${res.status} ${res.statusText}`);
  }

  discoveryCache = await res.json() as OidcDiscovery;
  discoveryCacheTime = Date.now();
  jwksCache = null; // invalidate JWKS cache when discovery refreshes
  return discoveryCache;
}

function getJwks(discovery: OidcDiscovery): ReturnType<typeof createRemoteJWKSet> {
  if (!jwksCache) {
    jwksCache = createRemoteJWKSet(new URL(discovery.jwks_uri));
  }
  return jwksCache;
}

// In-memory state store for CSRF (in production, use Redis or DB)
const stateStore = new Map<string, { nonce: string; codeVerifier: string; createdAt: number }>();

// Clean expired states (older than 10 minutes)
function cleanStates() {
  const now = Date.now();
  for (const [key, val] of stateStore.entries()) {
    if (now - val.createdAt > 600_000) {
      stateStore.delete(key);
    }
  }
}

// ── GET /config — public SSO configuration status ──────────────────────────

sso.get('/config', (c) => {
  const config = getSsoConfig();
  return c.json({
    enabled: config.enabled,
    type: config.type,
    providerName: config.enabled ? config.providerName : null,
    registrationEnabled: isRegistrationEnabled(),
  });
});

// ── GET /login — initiate SSO flow ─────────────────────────────────────────

sso.get('/login', async (c) => {
  const config = getSsoConfig();

  if (!config.enabled) {
    return c.json({ message: 'SSO is not enabled' }, 400);
  }

  try {
    const discovery = await getOidcDiscovery(config.issuerUrl);

    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');

    const codeVerifier = generateCodeVerifier();

    cleanStates();
    stateStore.set(state, { nonce, codeVerifier, createdAt: Date.now() });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      scope: 'openid profile email',
      state,
      nonce,
      code_challenge: codeChallengeS256(codeVerifier),
      code_challenge_method: 'S256',
    });

    const authUrl = `${discovery.authorization_endpoint}?${params.toString()}`;
    return c.redirect(authUrl);
  } catch (error: any) {
    console.error('SSO login initiation error:', error);
    return c.json({ message: 'Failed to initiate SSO login' }, 500);
  }
});

// ── GET /callback — IdP redirects back here ────────────────────────────────

sso.get('/callback', async (c) => {
  const config = getSsoConfig();

  if (!config.enabled) {
    return c.json({ message: 'SSO is not enabled' }, 400);
  }

  const code = c.req.query('code');
  const state = c.req.query('state');
  const errorParam = c.req.query('error');

  if (errorParam) {
    const message = mapIdpError(errorParam, c.req.query('error_description'), config.providerName);
    return c.redirect(`/?sso_error=${encodeURIComponent(message)}`);
  }

  if (!code || !state) {
    return c.redirect('/?sso_error=Missing+code+or+state');
  }

  // Validate state (CSRF protection)
  const storedState = stateStore.get(state);
  if (!storedState) {
    return c.redirect('/?sso_error=Invalid+or+expired+state');
  }
  stateStore.delete(state);
  if (Date.now() - storedState.createdAt > 600_000) {
    return c.redirect('/?sso_error=Invalid+or+expired+state');
  }

  try {
    const discovery = await getOidcDiscovery(config.issuerUrl);

    // Exchange code for tokens
    const tokenRes = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.callbackUrl,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code_verifier: storedState.codeVerifier,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('Token exchange failed:', errBody);
      return c.redirect('/?sso_error=Token+exchange+failed');
    }

    const tokenData = await tokenRes.json() as {
      access_token: string;
      id_token?: string;
      token_type: string;
    };

    // The ID token is REQUIRED and must be cryptographically verified before
    // we trust any claims. We check signature via the provider's JWKS and
    // validate issuer, audience, expiration, and nonce.
    if (!tokenData.id_token) {
      return c.redirect('/?sso_error=Missing+id_token');
    }

    let email = '';
    let name = '';
    let claims: Record<string, unknown> = {};

    try {
      const jwks = getJwks(discovery);
      const { payload } = await jwtVerify(tokenData.id_token, jwks, {
        issuer: discovery.issuer,
        audience: config.clientId,
        algorithms: ['RS256'],
      });

      if (!payload.nonce || payload.nonce !== storedState.nonce) {
        return c.redirect('/?sso_error=Nonce+mismatch');
      }

      claims = payload as Record<string, unknown>;
      email = normalizeEmail(payload.email);
      name =
        (typeof payload.name === 'string' && payload.name) ||
        (typeof payload.preferred_username === 'string' && payload.preferred_username) ||
        '';
    } catch (verifyError: any) {
      console.error('ID token verification failed:', verifyError?.message ?? verifyError);
      return c.redirect('/?sso_error=Invalid+ID+token');
    }

    // If no email from ID token, fall back to userinfo endpoint (still over
    // an access_token we just received directly from the token endpoint)
    const needsUserinfo = !email || (config.roleClaim && claims[config.roleClaim] === undefined);
    if (needsUserinfo && discovery.userinfo_endpoint) {
      const userinfoRes = await fetch(discovery.userinfo_endpoint, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userinfoRes.ok) {
        const userinfo = await userinfoRes.json() as Record<string, unknown>;
        email = email || normalizeEmail(userinfo.email);
        name =
          name ||
          (typeof userinfo.name === 'string' && userinfo.name) ||
          (typeof userinfo.preferred_username === 'string' && userinfo.preferred_username) ||
          '';
        if (config.roleClaim && claims[config.roleClaim] === undefined && userinfo[config.roleClaim] !== undefined) {
          claims = { ...claims, [config.roleClaim]: userinfo[config.roleClaim] };
        }
      }
    }

    if (!email) {
      return c.redirect('/?sso_error=No+email+in+SSO+response');
    }

    // Find or create user (an existing local account with the same e-mail is the same user)
    let user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    const roleResult = resolveSsoRole({
      claims,
      roleClaim: config.roleClaim,
      validRoles: VALID_ROLES,
      defaultRole: config.defaultRole,
      isNewUser: !user,
    });
    if (!roleResult.ok) {
      console.error('SSO role rejected:', roleResult.error);
      return c.redirect(`/?sso_error=${encodeURIComponent(roleResult.error)}`);
    }

    const ssoOrgId = () => findOrCreateSsoOrg(prisma, config.orgName);

    if (user) {
      const data = await buildExistingUserUpdate(user, { name, role: roleResult.role }, ssoOrgId);
      if (Object.keys(data).length > 0) {
        user = await prisma.user.update({ where: { id: user.id }, data });
      }
    } else if (config.autoProvision) {
      // SSO users get an unusable password (real bcrypt hash of random bytes):
      // they authenticate via SSO, and bcrypt.compare against it simply returns false.
      const randomHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

      user = await prisma.user.create({
        data: {
          email,
          passwordHash: randomHash,
          name: name || email.split('@')[0],
          role: roleResult.role ?? config.defaultRole,
          orgId: await ssoOrgId(),
        },
      });
    }

    if (!user) {
      return c.redirect('/?sso_error=User+not+found+and+auto-provision+disabled');
    }

    // Generate a short-lived SSO exchange token
    const ssoToken = crypto.randomBytes(48).toString('hex');
    // Store mapping: ssoToken -> userId (expires in 60 seconds)
    ssoTokenStore.set(ssoToken, { userId: user.id, createdAt: Date.now() });

    // Redirect to frontend with token in URL fragment
    return c.redirect(`/#sso_token=${ssoToken}`);
  } catch (error: any) {
    console.error('SSO callback error:', error);
    return c.redirect('/?sso_error=SSO+authentication+failed');
  }
});

// In-memory SSO token exchange store
const ssoTokenStore = new Map<string, { userId: string; createdAt: number }>();

// ── POST /token — exchange SSO token for JWT pair ──────────────────────────

sso.post('/token', async (c) => {
  try {
    const { token } = await c.req.json();

    if (!token) {
      return c.json({ message: 'token is required' }, 400);
    }

    const stored = ssoTokenStore.get(token);
    if (!stored) {
      return c.json({ message: 'Invalid or expired SSO token' }, 401);
    }

    // Token is single-use
    ssoTokenStore.delete(token);

    // Check expiry (60 seconds)
    if (Date.now() - stored.createdAt > 60_000) {
      return c.json({ message: 'SSO token expired' }, 401);
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
      return c.json({ message: 'User not found' }, 404);
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    console.error('SSO token exchange error:', error);
    return c.json({ message: 'SSO token exchange failed' }, 500);
  }
});

export default sso;
