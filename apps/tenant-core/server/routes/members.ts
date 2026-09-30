import { Hono } from "hono";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";

export const memberRoutes = new Hono();

memberRoutes.use("*", requireAuth);

/** Membres de l'organisation de la session courante. */
memberRoutes.get("/", async (c) => {
  const session = c.get("session");
  const members = await db.membership.findMany({
    where: { organizationId: session.org_id },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return c.json({
    organizationId: session.org_id,
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      user: m.user,
    })),
  });
});
