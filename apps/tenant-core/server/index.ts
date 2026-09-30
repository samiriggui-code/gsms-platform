import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { authRoutes } from "./routes/auth.js";
import { workspaceRoutes } from "./routes/workspaces.js";
import { memberRoutes } from "./routes/members.js";
import { bffRoutes } from "./routes/bff.js";
import { docsRoutes } from "./routes/docs.js";

const app = new Hono();

const origin = process.env.CORS_ORIGIN ?? "http://localhost:5190";

app.use(
  "*",
  cors({
    origin,
    credentials: true,
  }),
);

app.get("/api/health", (c) => c.json({ ok: true, service: "tenant-core" }));

app.route("/api", docsRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/workspaces", workspaceRoutes);
app.route("/api/members", memberRoutes);
app.route("/api/bff", bffRoutes);

const port = Number(process.env.PORT ?? 3090);

serve({ fetch: app.fetch, port }, () => {
  console.log(`[tenant-core] API http://localhost:${port}`);
  console.log(`[tenant-core] OpenAPI http://localhost:${port}/api/docs`);
});
