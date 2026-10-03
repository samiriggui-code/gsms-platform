import { describe, expect, it, vi } from 'vitest';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import {
  buildExistingUserUpdate,
  codeChallengeS256,
  findOrCreateSsoOrg,
  generateCodeVerifier,
  isRegistrationEnabled,
  mapIdpError,
  normalizeEmail,
  resolveSsoRole,
  type SsoOrgDb,
} from './sso-mapping';

const ROLES = ['admin', 'qa_manager', 'qa_engineer', 'auditor', 'reviewer'] as const;

describe('resolveSsoRole', () => {
  const base = { roleClaim: 'gsms_role', validRoles: ROLES, defaultRole: 'qa_engineer' };

  it('applies the Core role to a new user', () => {
    expect(resolveSsoRole({ ...base, claims: { gsms_role: 'qa_manager' }, isNewUser: true })).toEqual({
      ok: true,
      role: 'qa_manager',
    });
  });

  it('syncs the Core role on every login of an existing user', () => {
    expect(resolveSsoRole({ ...base, claims: { gsms_role: 'auditor' }, isNewUser: false })).toEqual({
      ok: true,
      role: 'auditor',
    });
  });

  it('rejects a role outside VALID_ROLES', () => {
    const r = resolveSsoRole({ ...base, claims: { gsms_role: 'owner' }, isNewUser: true });
    expect(r.ok).toBe(false);
  });

  it('rejects a non-string role claim', () => {
    const r = resolveSsoRole({ ...base, claims: { gsms_role: ['admin'] }, isNewUser: false });
    expect(r.ok).toBe(false);
  });

  it('falls back to the default role for new users when the claim is absent (generic IdP)', () => {
    expect(resolveSsoRole({ ...base, claims: {}, isNewUser: true })).toEqual({ ok: true, role: 'qa_engineer' });
  });

  it('keeps the existing role when the claim is absent', () => {
    expect(resolveSsoRole({ ...base, claims: {}, isNewUser: false })).toEqual({ ok: true, role: null });
  });

  it('ignores the claim when SSO_ROLE_CLAIM is empty', () => {
    expect(
      resolveSsoRole({ ...base, roleClaim: '', claims: { gsms_role: 'admin' }, isNewUser: false }),
    ).toEqual({ ok: true, role: null });
  });
});

function mockDb(existing: { id: string } | null) {
  const db = {
    organization: {
      findFirst: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue({ id: 'org-new' }),
    },
    workspace: { create: vi.fn().mockResolvedValue({ id: 'ws-1' }) },
  };
  return db as typeof db & SsoOrgDb;
}

describe('findOrCreateSsoOrg', () => {
  it('reuses the organisation with the configured name', async () => {
    const db = mockDb({ id: 'org-gsms' });
    await expect(findOrCreateSsoOrg(db, 'GSMS')).resolves.toBe('org-gsms');
    expect(db.organization.findFirst).toHaveBeenCalledWith({ where: { name: 'GSMS' }, orderBy: { createdAt: 'asc' } });
    expect(db.organization.create).not.toHaveBeenCalled();
    expect(db.workspace.create).not.toHaveBeenCalled();
  });

  it('creates the organisation with a Default Workspace when absent', async () => {
    const db = mockDb(null);
    await expect(findOrCreateSsoOrg(db, 'GSMS')).resolves.toBe('org-new');
    expect(db.organization.create).toHaveBeenCalledWith({ data: { name: 'GSMS' } });
    expect(db.workspace.create).toHaveBeenCalledWith({ data: { name: 'Default Workspace', orgId: 'org-new' } });
  });
});

describe('buildExistingUserUpdate', () => {
  it('updates name and role, keeps an existing orgId', async () => {
    const orgId = vi.fn().mockResolvedValue('org-gsms');
    const data = await buildExistingUserUpdate(
      { name: 'Old', role: 'qa_engineer', orgId: 'org-own' },
      { name: 'New Name', role: 'admin' },
      orgId,
    );
    expect(data).toEqual({ name: 'New Name', role: 'admin' });
    expect(orgId).not.toHaveBeenCalled();
  });

  it('sets orgId only when null', async () => {
    const data = await buildExistingUserUpdate(
      { name: 'Same', role: 'admin', orgId: null },
      { name: 'Same', role: null },
      async () => 'org-gsms',
    );
    expect(data).toEqual({ orgId: 'org-gsms' });
  });

  it('returns no change when nothing differs', async () => {
    const data = await buildExistingUserUpdate(
      { name: 'Same', role: 'admin', orgId: 'o' },
      { name: '', role: 'admin' },
      async () => 'x',
    );
    expect(data).toEqual({});
  });
});

describe('misc helpers', () => {
  it('normalizes e-mails', () => {
    expect(normalizeEmail('  Jane.Doe@GSMS-Security.com ')).toBe('jane.doe@gsms-security.com');
    expect(normalizeEmail(undefined)).toBe('');
  });

  it('maps access_denied to a French message', () => {
    expect(mapIdpError('access_denied', 'inactive', 'GSMS')).toBe('Accès refusé par GSMS');
    expect(mapIdpError('server_error', 'boom', 'GSMS')).toBe('boom');
    expect(mapIdpError('server_error', undefined, 'GSMS')).toBe('server_error');
  });

  it('computes an RFC 7636 S256 challenge', () => {
    // Test vector from RFC 7636 appendix B.
    expect(codeChallengeS256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
    const v = generateCodeVerifier();
    expect(v).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('registration is enabled unless REGISTRATION_ENABLED=false', () => {
    expect(isRegistrationEnabled({})).toBe(true);
    expect(isRegistrationEnabled({ REGISTRATION_ENABLED: 'true' })).toBe(true);
    expect(isRegistrationEnabled({ REGISTRATION_ENABLED: 'false' })).toBe(false);
  });

  it('bcrypt.compare against an SSO random password hash returns false without throwing', async () => {
    const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 4);
    await expect(bcrypt.compare('password123', hash)).resolves.toBe(false);
    // Legacy SSO users were created with a plain random hex string.
    await expect(bcrypt.compare('password123', crypto.randomBytes(64).toString('hex'))).resolves.toBe(false);
  });
});
