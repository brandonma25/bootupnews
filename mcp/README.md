# Boot Up editorial MCP server (read-only)

Lets Claude answer questions about Boot Up's editorial data: what was held or folded, what was published, what failed the quality gate, and how one story moved through the pipeline. It runs on your machine and talks to Claude Desktop over stdio. See [PRD-71](../docs/product/prd/prd-71-editorial-read-mcp-server.md).

**It cannot change anything.** It only reads, only from four tables (`signal_posts`, `pipeline_article_candidates`, `newsletter_story_extractions`, `newsletter_emails`), and it blocks every non-read HTTP request before it leaves your computer.

## Install

From the repo root:

```bash
npm install
```

## Environment

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | Project URL, e.g. `https://<ref>.supabase.co`. `NEXT_PUBLIC_SUPABASE_URL` works too. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key, from Supabase → Project Settings → API. |

Never commit the key. It goes in the Claude Desktop config below, which lives outside the repo, or in your shell for a terminal run.

## Run it from a terminal (optional check)

```bash
node --env-file=.env.local node_modules/.bin/tsx mcp/call.ts held_stories '{"days":7}'
```

`npm run mcp` starts the bare server (it waits silently for a client). `npm run mcp:call -- <tool> '<json>'` calls one tool the same way Claude Desktop does. Both need the two variables in your environment.

## Claude Desktop config

Open Claude Desktop → Settings → Developer → Edit Config. That opens `~/Library/Application Support/Claude/claude_desktop_config.json`. Add this block, replacing `/ABSOLUTE/PATH/TO/bootupnews` with the repo folder and filling in the key:

```json
{
  "mcpServers": {
    "bootup-editorial": {
      "command": "/opt/homebrew/bin/node",
      "args": [
        "/ABSOLUTE/PATH/TO/bootupnews/node_modules/tsx/dist/cli.mjs",
        "/ABSOLUTE/PATH/TO/bootupnews/mcp/server.ts"
      ],
      "env": {
        "SUPABASE_URL": "https://<ref>.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "<service-role key>"
      }
    }
  }
}
```

Run `which node` in Terminal if your Node lives somewhere other than `/opt/homebrew/bin/node`. Don't use `npm run mcp` here: npm prints a banner to stdout, which breaks the stdio protocol. Restart Claude Desktop after saving.

## Tools

Every tool returns compact JSON with a one-line `summary` first. Briefing dates are Asia/Taipei calendar days.

| Tool | Input | Returns |
| --- | --- | --- |
| `held_stories` | `days` (default 7), optional `end_date` | Held or folded candidates: date, title, source, score, gate status, decision, decision note |
| `brief` | `date` | Published cards in rank order: title, Core/Context, Signal / Before This / Ripple, source |
| `gate_failures` | `date` | Rows marked `requires_human_rewrite`: failure codes, the failed field, validator details |
| `story_trace` | `id` (a `signal_posts` UUID) | Ingestion source (RSS or newsletter), score and scoring features, gate, decision and note, publish state |

How it reads the data:

- **Folded** isn't a stored decision. A fold is saved as `removed_from_slate` with a note that starts "Folded …", and that's how the server spots one. Other removals are left out.
- The quality gate only checks `why_it_matters` (the Signal field), so `gate_failures` always names that field.
- `brief` uses the same rule as the public homepage: published, approved (or no decision), passed the gate, slate rank 1–7.

## Example queries

Ask Claude Desktop:

1. "Which stories did I hold or fold in the week of September 14, 2026, and why?" (`held_stories`)
2. "Show me the published brief for 2026-09-18." (`brief`)
3. "What failed the quality gate on 2026-09-18, and which field failed?" (`gate_failures`)
4. "Trace story 1a1039e0-a165-495d-b645-59fe7b06d199 end to end." (`story_trace`)
