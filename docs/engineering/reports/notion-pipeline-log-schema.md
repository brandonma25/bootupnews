# Notion Pipeline Log — Database Schema

The Pipeline Log is a Notion database that captures one row per operational
event for the ingestion pipeline (one row per `ingestion` run, one row per
`health_check` run). It is the long-term operational history that survives
beyond cron-job.org's per-job execution retention and is queryable in Notion
for spot checks and trend review.

## Who creates it

**BM creates this database manually in Notion.** The endpoint code reads its
ID from the `NOTION_PIPELINE_LOG_DB_ID` environment variable and writes to it
on every ingestion run and every health check. If the env var is missing or
empty, both endpoints log a warning and continue without failing — the
ingestion and health-check happy paths remain intact even when the log DB is
not yet configured.

## Schema

| Property | Notion type | Required | Notes |
| --- | --- | --- | --- |
| `Timestamp` | Created time | Yes (primary) | Notion's built-in `Created time` field. No code-side writes — Notion sets this on row creation. Use as the database's primary sort key, descending. |
| `Run Type` | Select | Yes | Options: `ingestion`, `health_check`. |
| `Status` | Select | Yes | Options: `ok`, `warn`, `fail`. See "Status semantics" below. |
| `Row Count` | Number | Yes | For ingestion runs: total number of Editorial Queue rows that exist for the day after the run completes. For health checks: same — the row count observed at health-check time. |
| `Message` | Text | Yes | Human-readable summary of the run. Includes branch-level errors when present. Cap at ~500 chars; do not paste full stack traces. |
| `Briefing Date` | Date | Yes | The Taipei briefing day this run pertains to (YYYY-MM-DD). For ingestion runs, this is the day the run is staging rows for. For health checks, this is the day the check is asserting against. |
| `Source Health` | Text | Yes | JSON-encoded snapshot of per-source contribution for this run. Schema below. |

### `Source Health` JSON shape

The `Source Health` text column contains a JSON string with this shape:

```json
{
  "contributed": ["Reuters", "Bloomberg", "TechCrunch"],
  "expected": ["Reuters", "Bloomberg", "TechCrunch", "Wired"],
  "missing": ["Wired"],
  "distinctSourceCount": 3
}
```

- `contributed` — distinct `Source` values observed across the day's Editorial Queue rows.
- `expected` — the source list returned by `getRequiredSourcesForPublicSurface("public.home")` at run time.
- `missing` — expected sources that did not contribute any row.
- `distinctSourceCount` — `contributed.length`.

Phase 4.5 extends this with per-source success/fail counts from the new
Source Health Log database (see [`notion-source-health-schema.md`](notion-source-health-schema.md)).

## Status semantics

| `Status` | When emitted |
| --- | --- |
| `ok` | Run completed normally. For ingestion: every branch returned `success`. For health check: `Row Count` ≥ 7 and every expected source is in `contributed`. |
| `warn` | Run nominally succeeded but is degraded. For health check: `Row Count` ≥ 7 but one or more expected sources contributed zero articles. For ingestion: any non-fatal branch warning (e.g. editorial staging surfaced row-level Notion errors but the cron still returned 200). |
| `fail` | Run did not produce a usable result. For ingestion: any branch's `success` flag was `false`. For health check: `Row Count` < 7 (the editorial queue is not viable for review). |

HTTP-status-code mapping for the health endpoint: `ok` and `warn` → HTTP 200;
`fail` → HTTP 500 (so cron-job.org's email alert fires).

## Operational notes

- The endpoint code never reads from this database — it only writes. Notion
  is the single source of truth for log entries; no shadow store exists in
  Supabase.
- Notion API rate limits: ~3 requests/sec/integration. The endpoint emits at
  most one log entry per cron invocation, so contention is not a concern at
  the current schedule (two ingestion runs + one health check per day).
- A failed Pipeline Log write **must not** fail the endpoint that produced
  it. The writer catches and logs internally and returns a `written: false`
  result. The cron's pass/fail status is determined by the underlying work,
  not by whether the log entry persisted.
