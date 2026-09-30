import { SignJWT, jwtVerify } from "jose";
import type { Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

const COOKIE = "gsms_session";

export type SessionClaims = {
  sub: string;
  email: string;
  name: string;
  org_id: string;
  workspace_id: string;
  role: string;
};

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET missing");
  return new TextEncoder().encode(s);
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionClaims;
  } catch {
    return null;
  }
}

export function setSessionCookie(c: Context, token: string) {
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, COOKIE, { path: "/" });
}

export async function requireAuth(c: Context, next: Next) {
  const token = getCookie(c, COOKIE);
  if (!token) return c.json({ error: "UNAUTHORIZED" }, 401);
  const session = await verifySession(token);
  if (!session) return c.json({ error: "UNAUTHORIZED" }, 401);
  c.set("session", session);
  await next();
}

declare module "hono" {
  interface ContextVariableMap {
    session: SessionClaims;
  }
}
