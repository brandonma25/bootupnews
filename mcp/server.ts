import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { createReadOnlyDb } from "./db";
import { brief, DATE_PATTERN, gateFailures, heldStories, storyTrace, UUID_PATTERN } from "./tools";

// stdio transport: stdout carries the protocol, so diagnostics go to stderr only.

const db = createReadOnlyDb();
const server = new McpServer({ name: "bootup-editorial", version: "0.1.0" });
const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const date = z.string().regex(DATE_PATTERN, "Use YYYY-MM-DD");

async function respond(run: () => Promise<unknown>) {
  try {
    return { content: [{ type: "text" as const, text: JSON.stringify(await run()) }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { isError: true, content: [{ type: "text" as const, text: JSON.stringify({ summary: `Error: ${message}` }) }] };
  }
}

server.registerTool(
  "held_stories",
  {
    title: "Held and folded stories",
    description:
      "Candidates the editor held or folded (folded = removed_from_slate with a 'Folded…' note) over the last N briefing days: date, title, source, score, gate status, decision, decision note. Briefing days are Asia/Taipei dates.",
    inputSchema: {
      days: z.number().int().min(1).max(60).default(7).describe("Window length in briefing days"),
      end_date: date.optional().describe("Last day of the window (YYYY-MM-DD). Defaults to today in Asia/Taipei."),
    },
    annotations: readOnly,
  },
  (args) => respond(() => heldStories(db, args)),
);

server.registerTool(
  "brief",
  {
    title: "Published brief for a date",
    description:
      "The published cards for a briefing date in rank order: title, card type (Core/Context), Signal / Before This / Ripple text, source. Uses the same rule as the public homepage.",
    inputSchema: { date: date.describe("Briefing date, YYYY-MM-DD") },
    annotations: readOnly,
  },
  (args) => respond(() => brief(db, args)),
);

server.registerTool(
  "gate_failures",
  {
    title: "Quality-gate failures for a date",
    description:
      "Rows whose why-it-matters validation status is requires_human_rewrite on a briefing date, with failure codes, the field that failed, and the validator's detail messages.",
    inputSchema: { date: date.describe("Briefing date, YYYY-MM-DD") },
    annotations: readOnly,
  },
  (args) => respond(() => gateFailures(db, args)),
);

server.registerTool(
  "story_trace",
  {
    title: "Trace one story end to end",
    description:
      "One candidate (signal_posts id) end to end: ingestion source (RSS candidate or newsletter), score and scoring features, gate result, editorial decision and note, publish state.",
    inputSchema: { id: z.string().regex(UUID_PATTERN, "Use a signal_posts UUID").describe("signal_posts.id") },
    annotations: readOnly,
  },
  (args) => respond(() => storyTrace(db, args)),
);

await server.connect(new StdioServerTransport());
console.error("bootup-editorial MCP server running on stdio (read-only)");
