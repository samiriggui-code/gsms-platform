# LexSocket MCP Server

The LexSocket MCP Server provides access to European public procurement tenders — both EU above-threshold (TED) and below-threshold from 18 national sources.

## What You Can Do

### Find Procurement Opportunities

- **Search EU tenders** from TED (Tenders Electronic Daily)
- **Search national tenders** from 11 countries (FR, GB, DE, ES, IT, NL, IE, PT, DK, PL, AT)
- **Discover open opportunities** ready for bidding
- **Analyze procurement trends** by country, sector, and value

### Key Features

- **Single URL**: One MCP endpoint for all European procurement data
- **23 Tools**: 12 TED tools + 11 National Tenders tools
- **Hybrid Search**: Full-text (BM25) + semantic (BGE-M3) with Reciprocal Rank Fusion
- **Powerful Filtering**: CPV codes, NUTS regions, buyer name, value range, dates, and status
- **Free Tier**: 25 requests/hour without authentication

## Quick Start

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

No API keys required. Free tier available with 25 requests/hour. Subscribe at [lexsocket.ai](https://lexsocket.ai) for unlimited access.

## Quick Example

**Find construction projects in Poland:**

```json
{
    "method": "search_ted",
    "params": {
        "query": "hospital construction",
        "country": "POL",
        "limit": 5
    }
}
```

**Find IT services tenders in France:**

```json
{
    "method": "search_tenders",
    "params": {
        "query": "services informatiques",
        "country": "FR",
        "status": "active",
        "limit": 5
    }
}
```

## Available Tools

### TED (EU above-threshold, 12 tools)

| # | Tool | Description |
|---|------|-------------|
| 1 | `search_ted` | Hybrid search with full filter support |
| 2 | `search_ted_fts` | Full-text keyword search (BM25) |
| 3 | `search_ted_semantic` | Semantic vector search |
| 4 | `get_ted_notice` | Get notice by ID (includes XML) |
| 5 | `get_ted_stats` | Database statistics |
| 6 | `find_similar_ted_tenders` | Find similar tenders |
| 7 | `browse_ted_by_deadline` | Browse by deadline |
| 8 | `search_ted_by_buyer` | Search by buyer name |
| 9 | `search_ted_by_cpv` | Search by CPV code |
| 10 | `search_ted_by_nuts` | Search by NUTS region |
| 11 | `search_ted_by_value_range` | Search by contract value |
| 12 | `get_ted_statistics` | Aggregated statistics |

### National Tenders (below-threshold, 11 tools)

| # | Tool | Description |
|---|------|-------------|
| 1 | `search_tenders` | Hybrid search across 11 countries |
| 2 | `get_tender` | Get tender by ID (includes JSON) |
| 3 | `get_open_opportunities` | Active tenders for bid/no-bid |
| 4 | `get_stats` | Database statistics |
| 5 | `find_similar_tenders` | Find similar tenders |
| 6 | `browse_by_deadline` | Browse by deadline |
| 7 | `search_by_buyer` | Search by buyer name |
| 8 | `search_by_cpv` | Search by CPV code |
| 9 | `search_by_nuts` | Search by NUTS region |
| 10 | `search_by_value_range` | Search by contract value |
| 11 | `get_tender_statistics` | Aggregated statistics |

## Supported Countries

### National Tenders

| Country | Source |
|---------|--------|
| France | BOAMP |
| United Kingdom | Contracts Finder |
| Germany | oeffentlichevergabe.de |
| Spain | PLACSP |
| Italy | ANAC |
| Netherlands | TenderNed |
| Ireland | eTenders |
| Portugal | BASE |
| Denmark | udbud.dk |
| Poland | ezamowienia.gov.pl |
| Austria | ausschreibungen.usp.gv.at |

### TED

All EU/EEA countries — above-threshold procurement published on Tenders Electronic Daily.

## Support

- Website: [lexsocket.ai](https://lexsocket.ai)
- Email: support@lexsocket.ai
