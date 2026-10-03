/**
 * "Se connecter avec GSMS" — end-to-end test of the OIDC relying party against
 * a local fake GSMS Core (discovery + JWKS + token endpoint, RS256 keys
 * generated with jose). Prisma is mocked in memory.
 */

import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { SignJWT, exportJWK, generateKeyPair, type JWK, type KeyLike } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ── In-memory Prisma ────────────────────────────────────────────────────────

type FakeUser = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  avatarPath: string | null;
  createdAt: Date;
};

const db = vi.hoisted(() => ({
  users: [] as FakeUser[],
  org: { id: '11111111-1111-4111-8111-111111111111', name: 'GSMS', slug: 'gsms' } as {
    id: string;
    name: string;
    slug: string;
  } | null,
}));

vi.mock('../../lib/prisma.js', () => {
  let seq = 0;
  const user = {
    findFirst: vi.fn(async ({ where }: { where: { email: { equals: string } } }) =>
      db.users.find((u) => u.email.toLowerCase() === where.email.equals.toLowerCase()) ?? null,
    ),
    findUnique: vi.fn(
      async ({ where }: { where: { id: string } }) => db.users.find((u) => u.id === where.id) ?? null,
    ),
    create: vi.fn(async ({ data }: { data: Partial<FakeUser> }) => {
      seq += 1;
      const u = {
        id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
        avatarPath: null,
        lastLoginAt: null,
        createdAt: new Date(),
        ...data,
      } as FakeUser;
      db.users.push(u);
      return u;
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<FakeUser> }) => {
      const u = db.users.find((x) => x.id === where.id);
      if (!u) throw new Error('not found');
      Object.assign(u, data);
      return u;
    }),
  };
  return { prisma: { user } };
});

vi.mock('../../lib/instance-org.js', () => ({
  getInstanceOrg: vi.fn(async () => {
    if (!db.org) throw new Error('not bootstrapped');
    return db.org;
  }),
  getInstanceOrgOrNull: vi.fn(async () => db.org),
  invalidateInstanceOrg: vi.fn(),
}));

const { default: ssoRoutes, TtlStore, SSO_MESSAGES } = await import('./routes.js');
const { loadSsoConfig, validateSsoConfig } = await import('./config.js');

// ── Fake GSMS Core (OIDC provider) ──────────────────────────────────────────

const CLIENT_ID = 'grace';
const CLIENT_SECRET = 's3cret';
const CALLBACK = 'https://grace.example.test/api/auth/sso/callback';

let idp: Server;
let issuer: string;
let privateKey: KeyLike;
let publicJwk: JWK;
/** Pending authorizations: code → what the authorize request carried. */
const codes = new Map<string, { nonce: string; challenge: string }>();
/** Claims the next id_token will carry (merged over defaults). */
let nextClaims: Record<string, unknown> = {};
let lastTokenRequest: URLSearchParams | null = null;

async function signIdToken(nonce: string, overrides: Record<string, unknown> = {}) {
  const claims = {
    nonce,
    email: 'Jane.Doe@GSMS-Security.com',
    email_verified: true,
    name: 'Jane Doe',
    given_name: 'Jane',
    family_name: 'Doe',
    gsms_role: 'LEAD_ASSESSOR',
    gsms_core_role: 'manager',
    ...overrides,
  };
  const jwt = new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setIssuer(issuer);
  if (!('aud' in overrides)) jwt.setAudience(CLIENT_ID);
  return jwt
    .setSubject('core-user-42')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

beforeAll(async () => {
  const keys = await generateKeyPair('RS256');
  privateKey = keys.privateKey;
  publicJwk = { ...(await exportJWK(keys.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };

  idp = createServer((req, res) => {
    const url = new URL(req.url ?? '/', issuer);
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === '/.well-known/openid-configuration') {
      return json(200, {
        issuer,
        authorization_endpoint: `${issuer}/oidc/authorize`,
        token_endpoint: `${issuer}/oidc/token`,
        jwks_uri: `${issuer}/oidc/jwks`,
        userinfo_endpoint: `${issuer}/oidc/userinfo`,
      });
    }
    if (url.pathname === '/oidc/jwks') return json(200, { keys: [publicJwk] });
    if (url.pathname === '/oidc/token' && req.method === 'POST') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', async () => {
        const form = new URLSearchParams(raw);
        lastTokenRequest = form;
        const pending = codes.get(form.get('code') ?? '');
        codes.delete(form.get('code') ?? '');
        const verifier = form.get('code_verifier') ?? '';
        const ok =
          pending &&
          form.get('grant_type') === 'authorization_code' &&
          form.get('client_id') === CLIENT_ID &&
          form.get('client_secret') === CLIENT_SECRET &&
          form.get('redirect_uri') === CALLBACK &&
          createHash('sha256').update(verifier).digest('base64url') === pending.challenge;
        if (!ok || !pending) return json(400, { error: 'invalid_grant' });
        return json(200, {
          access_token: 'at',
          token_type: 'Bearer',
          id_token: await signIdToken(pending.nonce, nextClaims),
        });
      });
      return;
    }
    json(404, { error: 'not_found' });
  });
  await new Promise<void>((resolve) => idp.listen(0, '127.0.0.1', resolve));
  issuer = `http://127.0.0.1:${(idp.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => idp.close(resolve));
});

// ── App under test ──────────────────────────────────────────────────────────

async function buildApp(overrides: Partial<ReturnType<typeof loadSsoConfig>> = {}) {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(jwt, { secret: 'test-secret-test-secret-test-secret!!' });
  await app.register(ssoRoutes, {
    prefix: '/api/auth/sso',
    config: {
      enabled: true,
      issuerUrl: issuer,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      callbackUrl: CALLBACK,
      roleClaim: 'gsms_role',
      providerName: 'GSMS',
      ...overrides,
    },
  });
  await app.ready();
  return app;
}

/** /login → simulate the Core approving → return the callback query + cookie. */
async function startLogin(app: FastifyInstance) {
  const res = await app.inject({ method: 'GET', url: '/api/auth/sso/login' });
  expect(res.statusCode).toBe(302);
  const authorize = new URL(res.headers.location as string);
  const setCookie = String(res.headers['set-cookie']);
  const cookie = setCookie.split(';')[0]!;
  const code = `code-${Math.random().toString(36).slice(2)}`;
  codes.set(code, {
    nonce: authorize.searchParams.get('nonce')!,
    challenge: authorize.searchParams.get('code_challenge')!,
  });
  return { authorize, setCookie, cookie, code, state: authorize.searchParams.get('state')! };
}

function callback(app: FastifyInstance, query: Record<string, string>, cookie?: string) {
  return app.inject({
    method: 'GET',
    url: `/api/auth/sso/callback?${new URLSearchParams(query)}`,
    headers: cookie ? { cookie } : {},
  });
}

function ssoError(location: string): string | null {
  return new URL(location, 'https://grace.example.test').searchParams.get('sso_error');
}

beforeEach(() => {
  db.users.length = 0;
  db.org = { id: '11111111-1111-4111-8111-111111111111', name: 'GSMS', slug: 'gsms' };
  nextClaims = {};
  lastTokenRequest = null;
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe('SSO config', () => {
  it('defaults and validation', () => {
    const cfg = loadSsoConfig({ SSO_ENABLED: 'true' });
    expect(cfg.roleClaim).toBe('gsms_role');
    expect(cfg.providerName).toBe('GSMS');
    expect(validateSsoConfig(cfg)).toEqual([
      'SSO_ISSUER_URL is required',
      'SSO_CLIENT_ID is required',
      'SSO_CLIENT_SECRET is required',
      'SSO_CALLBACK_URL is required',
    ]);
    expect(validateSsoConfig(loadSsoConfig({}))).toEqual([]);
  });

  it('refuses to start when enabled but misconfigured', async () => {
    await expect(buildApp({ clientSecret: '' })).rejects.toThrow(/SSO_CLIENT_SECRET is required/);
  });

  it('GET /config exposes only enabled + providerName', async () => {
    const app = await buildApp({ providerName: 'GSMS' });
    const res = await app.inject({ method: 'GET', url: '/api/auth/sso/config' });
    expect(res.json()).toEqual({ enabled: true, providerName: 'GSMS' });
    const off = Fastify();
    off.setValidatorCompiler(validatorCompiler);
    off.setSerializerCompiler(serializerCompiler);
    await off.register(ssoRoutes, { prefix: '/x', config: loadSsoConfig({}) });
    expect((await off.inject({ method: 'GET', url: '/x/config' })).json()).toEqual({
      enabled: false,
      providerName: 'GSMS',
    });
  });
});

describe('GET /login', () => {
  it('redirects to the Core with state, nonce and PKCE S256', async () => {
    const app = await buildApp();
    const { authorize, setCookie, state } = await startLogin(app);
    expect(`${authorize.origin}${authorize.pathname}`).toBe(`${issuer}/oidc/authorize`);
    const p = authorize.searchParams;
    expect(p.get('response_type')).toBe('code');
    expect(p.get('client_id')).toBe(CLIENT_ID);
    expect(p.get('redirect_uri')).toBe(CALLBACK);
    expect(p.get('scope')).toBe('openid profile email');
    expect(p.get('code_challenge_method')).toBe('S256');
    expect(p.get('nonce')).toBeTruthy();
    expect(setCookie).toContain(`grace_sso_state=${state}`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('Path=/api/auth/sso');
  });
});

describe('GET /callback + POST /token', () => {
  it('provisions a new user from the id_token and opens a GRACE session', async () => {
    const app = await buildApp();
    const { code, state, cookie } = await startLogin(app);

    const res = await callback(app, { code, state }, cookie);
    expect(res.statusCode).toBe(302);
    const location = res.headers.location as string;
    expect(location).toMatch(/^\/#sso_token=/);
    expect(lastTokenRequest?.get('code_verifier')).toBeTruthy();

    expect(db.users).toHaveLength(1);
    const u = db.users[0]!;
    expect(u).toMatchObject({
      email: 'jane.doe@gsms-security.com',
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'LEAD_ASSESSOR',
      isActive: true,
    });
    // Unusable password: a real bcrypt hash, so compare() just says false.
    expect(u.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(await bcrypt.compare('', u.passwordHash)).toBe(false);

    const exchange = decodeURIComponent(location.split('sso_token=')[1]!);
    const tok = await app.inject({
      method: 'POST',
      url: '/api/auth/sso/token',
      payload: { token: exchange },
    });
    expect(tok.statusCode).toBe(200);
    const body = tok.json();
    expect(body.user).toEqual({
      id: u.id,
      email: 'jane.doe@gsms-security.com',
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'LEAD_ASSESSOR',
      hasAvatar: false,
    });
    expect(body.organization).toEqual({ id: db.org!.id, name: 'GSMS', slug: 'gsms' });
    const decoded = app.jwt.verify<{ sub: string; role: string; email: string }>(body.token);
    expect(decoded).toMatchObject({ sub: u.id, role: 'LEAD_ASSESSOR', email: u.email });

    // Single use.
    const again = await app.inject({
      method: 'POST',
      url: '/api/auth/sso/token',
      payload: { token: exchange },
    });
    expect(again.statusCode).toBe(401);
  });

  it('updates an existing local account with the same e-mail (any case)', async () => {
    db.users.push({
      id: '22222222-2222-4222-8222-222222222222',
      email: 'Jane.Doe@gsms-security.com',
      passwordHash: 'local-hash',
      firstName: 'J',
      lastName: 'D',
      role: 'STAKEHOLDER',
      isActive: false,
      lastLoginAt: null,
      avatarPath: null,
      createdAt: new Date(),
    });
    nextClaims = { gsms_role: 'ADMIN', given_name: undefined, family_name: undefined };
    const app = await buildApp();
    const { code, state, cookie } = await startLogin(app);
    const res = await callback(app, { code, state }, cookie);
    expect(res.headers.location).toMatch(/^\/#sso_token=/);
    expect(db.users).toHaveLength(1);
    expect(db.users[0]).toMatchObject({
      role: 'ADMIN',
      firstName: 'Jane', // from `name`
      lastName: 'Doe',
      isActive: true,
      passwordHash: 'local-hash', // local password kept
    });
    expect(db.users[0]!.lastLoginAt).toBeInstanceOf(Date);
  });

  it.each([
    ['missing', { gsms_role: undefined }],
    ['unknown', { gsms_role: 'owner' }],
  ])('refuses a %s role claim', async (_label, claims) => {
    nextClaims = claims;
    const app = await buildApp();
    const { code, state, cookie } = await startLogin(app);
    const res = await callback(app, { code, state }, cookie);
    expect(ssoError(res.headers.location as string)).toBe(SSO_MESSAGES.missingRole);
    expect(res.headers.location).toMatch(/^\/login\?sso_error=/);
    expect(db.users).toHaveLength(0);
  });

  it('honours SSO_ROLE_CLAIM', async () => {
    nextClaims = { gsms_role: undefined, grace_role: 'REVIEWER' };
    const app = await buildApp({ roleClaim: 'grace_role' });
    const { code, state, cookie } = await startLogin(app);
    await callback(app, { code, state }, cookie);
    expect(db.users[0]?.role).toBe('REVIEWER');
  });

  it('maps access_denied from the Core to a French message', async () => {
    const app = await buildApp();
    const { state, cookie } = await startLogin(app);
    const res = await callback(app, { error: 'access_denied', state }, cookie);
    expect(ssoError(res.headers.location as string)).toBe('Accès refusé par GSMS');
  });

  it('rejects an unknown state, a replayed state and a missing state cookie', async () => {
    const app = await buildApp();
    const a = await startLogin(app);
    expect(
      ssoError((await callback(app, { code: a.code, state: 'forged' }, a.cookie)).headers.location as string),
    ).toBe(SSO_MESSAGES.invalidState);

    const b = await startLogin(app);
    // Login CSRF: valid code + state but the victim's browser has no cookie.
    expect(
      ssoError((await callback(app, { code: b.code, state: b.state })).headers.location as string),
    ).toBe(SSO_MESSAGES.invalidState);
    // …and the state is now consumed.
    expect(
      ssoError((await callback(app, { code: b.code, state: b.state }, b.cookie)).headers.location as string),
    ).toBe(SSO_MESSAGES.invalidState);
    expect(db.users).toHaveLength(0);
  });

  it('rejects an id_token with a wrong nonce or audience', async () => {
    const app = await buildApp();
    nextClaims = { nonce: 'other' };
    let s = await startLogin(app);
    expect(ssoError((await callback(app, { code: s.code, state: s.state }, s.cookie)).headers.location as string)).toBe(
      SSO_MESSAGES.invalidToken,
    );
    nextClaims = { aud: 'crm' };
    s = await startLogin(app);
    expect(ssoError((await callback(app, { code: s.code, state: s.state }, s.cookie)).headers.location as string)).toBe(
      SSO_MESSAGES.invalidToken,
    );
    expect(db.users).toHaveLength(0);
  });

  it('does not create users before the instance is bootstrapped', async () => {
    db.org = null;
    const app = await buildApp();
    const { code, state, cookie } = await startLogin(app);
    const res = await callback(app, { code, state }, cookie);
    expect(ssoError(res.headers.location as string)).toBe(SSO_MESSAGES.notBootstrapped);
    expect(db.users).toHaveLength(0);
  });

  it('rejects an unknown exchange code', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sso/token',
      payload: { token: 'nope' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('TtlStore', () => {
  it('expires entries, is single-use and capped', () => {
    let now = 0;
    const store = new TtlStore<number>(1000, 2, () => now);
    store.set('a', 1);
    expect(store.take('a')).toBe(1);
    expect(store.take('a')).toBeUndefined();
    store.set('b', 2);
    now = 1000;
    expect(store.take('b')).toBeUndefined();
    store.set('c', 3);
    store.set('d', 4);
    store.set('e', 5);
    expect(store.size).toBe(2);
    expect(store.take('c')).toBeUndefined();
  });
});
