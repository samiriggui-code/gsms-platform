import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";

const __dirname = dirname(fileURLToPath(import.meta.url));
const openapiPath = join(__dirname, "../../openapi/openapi.json");

let cached: unknown | null = null;

function loadSpec() {
  if (!cached) {
    cached = JSON.parse(readFileSync(openapiPath, "utf8"));
  }
  return cached;
}

export const docsRoutes = new Hono();

docsRoutes.get("/openapi.json", (c) => c.json(loadSpec()));

docsRoutes.get("/docs", (c) =>
  c.html(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GSMS Tenant Core — OpenAPI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>body{margin:0} .topbar{display:none}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout',
      withCredentials: true
    });
  </script>
</body>
</html>`),
);
