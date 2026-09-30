import { Hono } from "hono";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import {
  clearSessionCookie,
  requireAuth,
  setSessionCookie,
  signSession,
  type SessionClaims,
} from "../auth.js";

export const authRoutes = new Hono();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  /** Optional: pick workspace at login */
  workspaceId: z.string().uuid().optional(),
});

authRoutes.post("/login", async (c) => {
  const body = loginSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "INVALID_BODY", details: body.error.flatten() }, 400);

  const user = await db.user.findUnique({ where: { email: body.data.email.toLowerCase() } });
  if (!user) return c.json({ error: "INVALID_CREDENTIALS" }, 401);

  const ok = await bcrypt.compare(body.data.password, user.passwordHash);
  if (!ok) return c.json({ error: "INVALID_CREDENTIALS" }, 401);

  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    include: { organization: { include: { workspaces: { orderBy: { name: "asc" } } } } },
  });
  if (!membership) return c.json({ error: "NO_ORGANIZATION" }, 403);

  const workspaces = membership.organization.workspaces;
  if (workspaces.length === 0) return c.json({ error: "NO_WORKSPACE" }, 403);

  let workspace = workspaces[0]!;
  if (body.data.workspaceId) {
    const found = workspaces.find((w) => w.id === body.data.workspaceId);
    if (!found) return c.json({ error: "WORKSPACE_NOT_IN_ORG" }, 403);
    workspace = found;
  }

  const claims: SessionClaims = {
    sub: user.id,
    email: user.email,
    name: user.name,
    org_id: membership.organizationId,
    workspace_id: workspace.id,
    role: membership.role,
  };
  const token = await signSession(claims);
  setSessionCookie(c, token);

  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    organization: { id: membership.organization.id, name: membership.organization.name },
    workspace: { id: workspace.id, name: workspace.name, label: workspace.label },
    workspaces: workspaces.map((w) => ({ id: w.id, name: w.name, label: w.label })),
    role: membership.role,
  });
});

authRoutes.post("/logout", async (c) => {
  clearSessionCookie(c);
  return c.json({ ok: true });
});

authRoutes.get("/me", requireAuth, async (c) => {
  const session = c.get("session");
  const membership = await db.membership.findFirst({
    where: { userId: session.sub, organizationId: session.org_id },
    include: { organization: { include: { workspaces: { orderBy: { name: "asc" } } } } },
  });
  if (!membership) return c.json({ error: "NO_ORGANIZATION" }, 403);

  const workspaces = membership.organization.workspaces;
  const active = workspaces.find((w) => w.id === session.workspace_id) ?? workspaces[0];

  return c.json({
    user: { id: session.sub, email: session.email, name: session.name },
    organization: { id: membership.organization.id, name: membership.organization.name },
    workspace: active
      ? { id: active.id, name: active.name, label: active.label }
      : null,
    workspaces: workspaces.map((w) => ({ id: w.id, name: w.name, label: w.label })),
    role: membership.role,
  });
});
