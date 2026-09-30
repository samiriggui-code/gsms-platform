import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db.js";
import { requireAuth, setSessionCookie, signSession, type SessionClaims } from "../auth.js";

export const workspaceRoutes = new Hono();

workspaceRoutes.use("*", requireAuth);

workspaceRoutes.get("/", async (c) => {
  const session = c.get("session");
  const workspaces = await db.workspace.findMany({
    where: { organizationId: session.org_id },
    orderBy: { name: "asc" },
  });
  return c.json({
    activeWorkspaceId: session.workspace_id,
    workspaces: workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      label: w.label,
    })),
  });
});

const switchSchema = z.object({
  workspaceId: z.string().uuid(),
});

workspaceRoutes.post("/switch", async (c) => {
  const session = c.get("session");
  const body = switchSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: "INVALID_BODY" }, 400);

  const workspace = await db.workspace.findFirst({
    where: { id: body.data.workspaceId, organizationId: session.org_id },
  });
  if (!workspace) return c.json({ error: "WORKSPACE_NOT_FOUND" }, 404);

  const claims: SessionClaims = {
    ...session,
    workspace_id: workspace.id,
  };
  const token = await signSession(claims);
  setSessionCookie(c, token);

  return c.json({
    workspace: { id: workspace.id, name: workspace.name, label: workspace.label },
  });
});
