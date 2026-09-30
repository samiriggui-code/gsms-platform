import { Hono } from "hono";
import { requireAuth } from "../auth.js";
import { legacyMockEnabled, prestationsSource } from "../lib/config.js";
import {
  mockDashboard,
  mockDocuments,
  mockEchanges,
  mockFinance,
  mockFinanceDetail,
  mockFinancePdfBytes,
  mockSignFinance,
  mockUploadDocument,
} from "../lib/mock-data.js";
import {
  getPrestation,
  isOpenPrestation,
  listPrestations,
} from "../lib/prestations.js";

/**
 * BFF portail — P0 prestations via CRM ; docs/échanges/finance mock optionnel (BFF_LEGACY_MOCK).
 * Toujours scopé sur session.workspace_id.
 */
export const bffRoutes = new Hono();

bffRoutes.use("*", requireAuth);

bffRoutes.get("/dashboard", async (c) => {
  const session = c.get("session");
  const workspaceId = session.workspace_id;

  if (prestationsSource() === "mock") {
    return c.json(mockDashboard(workspaceId));
  }

  const { items, warning } = await listPrestations(workspaceId);
  const open = items.filter(isOpenPrestation);

  const legacy = legacyMockEnabled() ? mockDashboard(workspaceId) : null;

  return c.json({
    workspaceId,
    source: "crm",
    warning: warning ?? null,
    counts: {
      prestationsOpen: open.length,
      piecesPending: legacy?.counts.piecesPending ?? 0,
      devisPending: legacy?.counts.devisPending ?? 0,
      livrablesUnread: legacy?.counts.livrablesUnread ?? 0,
    },
    prestations: open.map((p) => ({
      id: p.id,
      title: p.title,
      kind: p.kind,
      status: p.status,
      workspaceId: p.workspaceId,
    })),
  });
});

bffRoutes.get("/prestations", async (c) => {
  const session = c.get("session");
  const result = await listPrestations(session.workspace_id);
  return c.json({
    items: result.items,
    source: result.source,
    warning: result.warning ?? null,
  });
});

bffRoutes.get("/prestations/:id", async (c) => {
  const session = c.get("session");
  const id = c.req.param("id");
  const { prestation, warning } = await getPrestation(
    session.workspace_id,
    id,
  );
  if (!prestation) {
    return c.json(
      { error: warning ?? "Prestation introuvable" },
      warning?.includes("indisponible") || warning?.includes("CRM")
        ? 502
        : 404,
    );
  }

  const legacy = legacyMockEnabled();
  return c.json({
    prestation,
    source: prestationsSource(),
    documents: legacy
      ? mockDocuments(session.workspace_id, id)
      : [],
    echanges: legacy ? mockEchanges(session.workspace_id, id) : [],
    finance: legacy ? mockFinance(session.workspace_id, id) : [],
  });
});

bffRoutes.get("/documents", async (c) => {
  const session = c.get("session");
  if (!legacyMockEnabled()) {
    return c.json({
      items: [],
      source: "unset",
      warning: "Documents : Desk non branché (P1).",
    });
  }
  return c.json({ items: mockDocuments(session.workspace_id), source: "mock" });
});

bffRoutes.post("/documents/upload", async (c) => {
  const session = c.get("session");
  if (!legacyMockEnabled()) {
    return c.json(
      { error: "Dépôt document : Desk non branché (P1)." },
      501,
    );
  }
  const body = await c.req.parseBody();
  const file = body["file"];
  const prestationId =
    typeof body["prestationId"] === "string" && body["prestationId"]
      ? body["prestationId"]
      : null;
  const demandeId =
    typeof body["demandeId"] === "string" && body["demandeId"]
      ? body["demandeId"]
      : null;

  const title =
    file instanceof File
      ? file.name
      : typeof file === "string"
        ? file
        : "Document déposé";

  if (!title) return c.json({ error: "Fichier manquant" }, 400);

  const document = mockUploadDocument(session.workspace_id, {
    title,
    prestationId,
    demandeId,
  });

  return c.json({ document }, 201);
});

bffRoutes.get("/echanges", async (c) => {
  const session = c.get("session");
  if (!legacyMockEnabled()) {
    return c.json({
      items: [],
      source: "unset",
      warning: "Échanges : source non branchée (P1).",
    });
  }
  return c.json({ items: mockEchanges(session.workspace_id), source: "mock" });
});

bffRoutes.get("/finance", async (c) => {
  const session = c.get("session");
  if (!legacyMockEnabled()) {
    return c.json({
      items: [],
      source: "unset",
      warning: "Finance : Quote/Invoice CRM non branchés (P2).",
    });
  }
  return c.json({ items: mockFinance(session.workspace_id), source: "mock" });
});

bffRoutes.get("/finance/:id", async (c) => {
  const session = c.get("session");
  if (!legacyMockEnabled()) {
    return c.json({ error: "Finance : non branché (P2)." }, 501);
  }
  const detail = mockFinanceDetail(session.workspace_id, c.req.param("id"));
  if (!detail) return c.json({ error: "Document commercial introuvable" }, 404);
  return c.json(detail);
});

bffRoutes.get("/finance/:id/pdf", async (c) => {
  const session = c.get("session");
  if (!legacyMockEnabled()) {
    return c.json({ error: "Finance : non branché (P2)." }, 501);
  }
  const id = c.req.param("id");
  const bytes = mockFinancePdfBytes(session.workspace_id, id);
  if (!bytes) return c.json({ error: "PDF introuvable" }, 404);
  const detail = mockFinanceDetail(session.workspace_id, id);
  const filename = `${detail?.item.reference ?? id}.pdf`;
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});

bffRoutes.post("/finance/:id/sign", async (c) => {
  const session = c.get("session");
  if (!legacyMockEnabled()) {
    return c.json({ error: "Signature : non branchée (P2)." }, 501);
  }
  const result = mockSignFinance(session.workspace_id, c.req.param("id"));
  if ("error" in result) {
    if (result.error === "NOT_FOUND") {
      return c.json({ error: "Document commercial introuvable" }, 404);
    }
    if (result.error === "NOT_DEVIS") {
      return c.json({ error: "Seuls les devis peuvent être signés ici" }, 400);
    }
    return c.json({ error: "Ce devis n’est plus signable" }, 409);
  }
  return c.json(result);
});
