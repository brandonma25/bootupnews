# PRD-71 — Editorial Read MCP Server

- PRD ID: `PRD-71`
- Canonical file: `docs/product/prd/prd-71-editorial-read-mcp-server.md`
- Feature system row: `docs/product/feature-system.csv`
- Status: stub — v0.1 built (read-only, stdio, local use)

## Objective

Let the editor ask Claude plain-English questions about Boot Up's editorial data ("what did I hold this week?", "why did this story fail the gate?") and get answers grounded in the live database, without opening Supabase or writing SQL.

## User Problem

Editorial decisions, gate results and published cards all live in `signal_posts` and the ingestion tables. Today, answering "which AI-risk stories did I hold on Friday and why?" means hand-written SQL against production. That is slow for a single operator and error-prone for a non-coder.

## Object Level

Reads **Signal** rows (`signal_posts`) and their upstream **Article** candidates (`pipeline_article_candidates`, `newsletter_story_extractions`). The `brief` tool reports **Cards** as they render publicly. It does not read or write Story Clusters.

## Scope

A local MCP server at `/mcp`, TypeScript + `@modelcontextprotocol/sdk`, stdio transport, started with `npm run mcp`. Four tools:

1. `held_stories({days=7, end_date?})` — held or folded candidates in a window.
2. `brief({date})` — published cards for a date in rank order (Signal / Before This / Ripple).
3. `gate_failures({date})` — rows whose validation status is `requires_human_rewrite`.
4. `story_trace({id})` — one candidate end to end: ingestion, score and features, gate, decision, publish state.

Each tool returns compact JSON with a one-line `summary` first.

## Schema notes (from live inspection, 2026-09-21)

- "Folded" is not an `editorial_decision` value. A fold is stored as `removed_from_slate` with a `decision_note` starting "Folded …"; the server classifies it that way.
- The quality gate validates only `why_it_matters` (the Signal field), so `gate_failures` always reports that field.
- `signal_posts` has no foreign key to `pipeline_article_candidates`. RSS rows join on `canonical_url = source_url`; newsletter rows join through `newsletter_story_extractions.signal_post_id`.
- `story_clusters`, `story_cluster_members`, `daily_briefings`, `events` and `published_slates` are empty or legacy, so the server ignores them.

## Guardrails

- Read-only. Only `select` is exposed, only four allowlisted tables can be read, and the HTTP layer rejects every non-GET/HEAD request, so inserts, updates, deletes and POST-based RPCs cannot leave the process.
- The service-role key comes from the environment only and is never committed.

## What Is NOT Being Built

- No write tools, no RPCs, no remote/HTTP transport (stdio for Claude Desktop only).
- No deployment. The server runs on the editor's machine.

## Success Metric

The editor can answer the four example questions in `/mcp/README.md` through Claude Desktop without writing SQL.
