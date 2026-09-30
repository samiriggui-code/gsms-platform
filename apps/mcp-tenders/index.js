#!/usr/bin/env node

/**
 * TED MCP Server - EU Public Procurement Tenders
 *
 * This is a thin client that connects to the hosted TED MCP server at
 * https://mcp.lexsocket.ai/ted
 *
 * The server provides access to the EU's Tenders Electronic Daily (TED)
 * database, enabling search and exploration of public procurement
 * opportunities across Europe.
 *
 * Transport modes:
 *   --transport sse    → Connect via SSE to the remote server (default)
 *   --transport stdio  → Run as a local stdio proxy for Claude Desktop / Cline
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const REMOTE_URL = "https://mcp.lexsocket.ai/ted";

const transportArg = process.argv.find((arg) => arg === "--transport");
const transportIdx = process.argv.indexOf("--transport");
const transport =
  transportIdx !== -1 ? process.argv[transportIdx + 1] : "sse";

async function main() {
  if (transport === "stdio") {
    // stdio proxy mode: expose remote tools over local stdio
    const remoteTransport = new SSEClientTransport(new URL(`${REMOTE_URL}/sse`));
    const remoteClient = new Client(
      { name: "mcp-ted-proxy", version: "1.0.0" },
      { capabilities: {} }
    );

    await remoteClient.connect(remoteTransport);

    const { tools } = await remoteClient.listTools();

    const server = new McpServer(
      { name: "mcp-ted", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    // Register each remote tool as a local passthrough
    for (const tool of tools) {
      server.tool(tool.name, tool.description, tool.inputSchema?.properties || {}, async (params) => {
        const result = await remoteClient.callTool({
          name: tool.name,
          arguments: params,
        });
        return result;
      });
    }

    const stdioTransport = new StdioServerTransport();
    await server.connect(stdioTransport);

    console.error(`[mcp-ted] stdio proxy running — ${tools.length} tools loaded from ${REMOTE_URL}`);
  } else {
    // SSE mode: just print connection info
    console.log(`TED MCP Server (Remote)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Endpoint: ${REMOTE_URL}`);
    console.log(`Transport: SSE`);
    console.log(``);
    console.log(`To connect, add this to your MCP client configuration:`);
    console.log(``);
    console.log(JSON.stringify({
      mcpServers: {
        ted: {
          url: `${REMOTE_URL}/sse`,
        },
      },
    }, null, 2));
    console.log(``);
    console.log(`Or use stdio mode for Claude Desktop:`);
    console.log(`  npx @lexsocket/mcp-ted --transport stdio`);
  }
}

main().catch((error) => {
  console.error("[mcp-ted] Fatal error:", error.message);
  process.exit(1);
});
