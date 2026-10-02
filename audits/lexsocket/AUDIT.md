# Audit — LexSocket MCP Tenders (`apps/mcp-tenders`)

**Date :** 2026-10-02 · **Décision V2 :** KEEP comme configuration de service distant (veille AO), appelé uniquement par la passerelle MCP du Core

## Identité
- `@lexsocket/mcp-tenders` v2.0.0, **MIT** © 2025 LexSocket.
- **Contenu :** client léger Node ≥ 18 (`@modelcontextprotocol/sdk`). `index.js` (88 lignes) relaie `mcp.lexsocket.ai` en stdio.
- **Aucun code métier, aucune donnée locale.**
- **Incohérences :**
  - `package.json` pointe `src/index.js`, alors que le fichier est à la racine ;
  - `index.js` vise SSE `/ted`, alors que README / `mcp.json` visent streamable-http `/`.
- **Accès :** anonyme 25 requêtes / h, au-delà abonnement.

## Outils (23, distants)
- **TED, au-dessus des seuils :** `search_ted`, `search_ted_fts`, `search_ted_semantic`, `get_ted_notice`, `get_ted_stats`, `get_ted_statistics`, `find_similar_ted_tenders`, `browse_ted_by_deadline`, `search_ted_by_{buyer,cpv,nuts,value_range}`.
- **National (11 pays dont FR) :** `search_tenders`, `get_tender`, `get_open_opportunities`, `get_stats`, `get_tender_statistics`, `find_similar_tenders`, `browse_by_deadline`, `search_by_{buyer,cpv,nuts,value_range}`.
- **BOAMP non nommé explicitement** → test de fumée FR obligatoire avant production.

## Actions V2
1. Le Core appelle `https://mcp.lexsocket.ai/` (streamable-http) via `mcp_gateway`, avec la liste blanche des outils ci-dessus.
2. Les opportunités suivies deviennent des `external_ref` `lexsocket://…` sur une Mission APPEL_OFFRES ; pas de copie du catalogue.
3. Clé d'abonnement en secret Core si le quota anonyme ne suffit pas.
