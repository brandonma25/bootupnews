/**
 * Call one tool on the editorial MCP server over real stdio, the same way
 * Claude Desktop does. Usage:
 *   npm run mcp:call -- held_stories '{"days":7,"end_date":"2026-09-20"}'
 */
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const [tool, rawArgs = "{}"] = process.argv.slice(2);
if (!tool) {
  console.error("usage: npm run mcp:call -- <tool> '<json args>'");
  process.exit(1);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", fileURLToPath(new URL("./server.ts", import.meta.url))],
  env: process.env as Record<string, string>,
  stderr: "inherit",
});
const client = new Client({ name: "bootup-editorial-cli", version: "0.1.0" });

await client.connect(transport);
const result = await client.callTool({ name: tool, arguments: JSON.parse(rawArgs) });
for (const part of result.content as Array<{ type: string; text?: string }>) {
  if (part.type === "text") console.log(part.text);
}
await client.close();
process.exit(result.isError ? 1 : 0);
