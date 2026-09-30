# Installation Guide for AI Agents

## Recommended: Remote Connection (No Installation Required)

The LexSocket MCP Server is hosted remotely. No local installation is needed.

Add this to your MCP client configuration:

```json
{
  "mcpServers": {
    "lexsocket": {
      "url": "https://mcp.lexsocket.ai/"
    }
  }
}
```

That's it. No API keys required — free tier available with 25 requests/hour.

## Alternative: stdio Proxy Mode

If your MCP client requires a local stdio process:

```json
{
  "mcpServers": {
    "lexsocket": {
      "command": "npx",
      "args": ["-y", "@lexsocket/mcp-tenders", "--transport", "stdio"]
    }
  }
}
```

This will start a local proxy that forwards requests to the remote server.

**Requirements for stdio mode:**
- Node.js >= 18
- npm / npx available in PATH

## Available Tools (23 total)

### TED (EU above-threshold, 12 tools)

| Tool | Description |
|------|-------------|
| `search_ted` | Hybrid keyword + semantic search across EU tenders |
| `search_ted_fts` | Full-text keyword search (BM25) |
| `search_ted_semantic` | Semantic vector search by concept |
| `get_ted_notice` | Get full tender notice by ID |
| `get_ted_stats` | Database statistics |
| `find_similar_ted_tenders` | Find similar TED tenders |
| `browse_ted_by_deadline` | Browse by submission deadline |
| `search_ted_by_buyer` | Search by contracting authority name |
| `search_ted_by_cpv` | Search by CPV procurement code |
| `search_ted_by_nuts` | Search by NUTS region code |
| `search_ted_by_value_range` | Search by estimated contract value |
| `get_ted_statistics` | Aggregated statistics by country/type |

### National Tenders (below-threshold, 11 tools)

| Tool | Description |
|------|-------------|
| `search_tenders` | Hybrid search across 11 countries (FR, GB, DE, ES, IT, NL, IE, PT, DK, PL, AT) |
| `get_tender` | Get full tender by ID |
| `get_open_opportunities` | Active tenders for bid/no-bid analysis |
| `get_stats` | Database statistics |
| `find_similar_tenders` | Find similar national tenders |
| `browse_by_deadline` | Browse by submission deadline |
| `search_by_buyer` | Search by contracting authority name |
| `search_by_cpv` | Search by CPV procurement code |
| `search_by_nuts` | Search by NUTS region code |
| `search_by_value_range` | Search by estimated contract value |
| `get_tender_statistics` | Aggregated statistics by country/status/source |

## Quick Test

After connecting, try:
```
Search for hospital construction tenders in France
```

This will use the `search_ted` tool with appropriate filters.
