/**
 * "Se connecter avec GSMS" (OpenID Connect via the GSMS Core).
 *
 * Flow: the login button navigates to /api/auth/sso/login; after the Core
 * authenticates the user, the API redirects to `/#sso_token=<one-time code>`
 * (or `/login?sso_error=<message>`). On boot we trade that code for a regular
 * GRACE session — same shape as a password login — before the router renders.
 */
import { api } from './api';
import { useAuthStore } from '../stores/auth';

export interface SsoConfig {
  enabled: boolean;
  providerName: string;
}

export const SSO_LOGIN_URL = '/api/auth/sso/login';

export async function fetchSsoConfig(): Promise<SsoConfig> {
  try {
    return await api.get('auth/sso/config', { timeout: 5000 }).json<SsoConfig>();
  } catch {
    return { enabled: false, providerName: 'GSMS' };
  }
}

let pending: Promise<boolean> | null = null;

/**
 * If the URL fragment carries `sso_token`, exchange it and clean the URL.
 * Returns true when an SSO redirect was handled (success or failure).
 * Memoized: React StrictMode runs effects twice and the code is single-use.
 */
export function consumeSsoRedirect(): Promise<boolean> {
  if (pending) return pending;
  pending = (async () => {
    if (typeof window === 'undefined') return false;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const ssoToken = hash.get('sso_token');
    if (!ssoToken) return false;

    // Drop the code from the address bar / history right away.
    window.history.replaceState(null, '', '/');
    try {
      await useAuthStore.getState().loginWithSsoToken(ssoToken);
      // Lands on the dashboard (route "/").
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connexion GSMS impossible.';
      window.history.replaceState(null, '', `/login?sso_error=${encodeURIComponent(message)}`);
    }
    return true;
  })();
  return pending;
}

/** The `sso_error` message set by the SSO callback, if any. */
export function readSsoErrorFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('sso_error');
}

/** Removes `sso_error` from the address bar (so a reload does not show it again). */
export function clearSsoErrorFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('sso_error')) return;
  url.searchParams.delete('sso_error');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}
