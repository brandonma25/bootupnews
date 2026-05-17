# Notion Source Health Log — Database Schema

The Source Health Log is a Notion database that records per-source-per-day
fetch outcomes for the Branch B (RSS) ingestion path. It feeds the circuit
breaker added in PRD-65 Phase 4.5 and replaces Sentry noise for known-flaky
sources.

## Who creates it

**BM creates this database manually in Notion.** The endpoint code reads its
ID from the `NOTION_SOURCE_HEALTH_LOG_DB_ID` environment variable. If the env
var is missing or empty, the writer logs a warning and continues — Source
Health Log writes are best-effort and never fail the ingestion run.

## Schema

| Property | Notion type | Required | Notes |
| --- | --- | --- | --- |
| `Source` | Title | Yes (primary) | Display name of the source, e.g. `Reuters`, `Bloomberg`. Stable string — the circuit breaker keys on this exact value. |
| `Date` | Date | Yes | The Taipei briefing day this entry covers (YYYY-MM-DD). One row per source per day. |
| `Success Count` | Number | Yes | Number of successful feed fetches for this source on this day. Updated each run that touches the source. |
| `Fail Count` | Number | Yes | Number of failed feed fetches for this source on this day. Used by the Phase 4.5 circuit breaker — when 24-hour rolling fail count ≥ 5, the source is skipped on the next run. |
| `Last Successful Fetch` | Date (with time) | No | ISO timestamp of the last successful fetch. Updated only on success; preserves prior value on failure. |
| `Last Outcome` | Select | Yes | Options: `success`, `fail`, `skipped_circuit_breaker`. Records what happened on the most recent run for this source. |
| `Notes` | Text | No | Optional context: the error message on failure, or a brief note on a successful recovery after prior failures. Cap at ~500 chars. |

## Keying and idempotency

The natural key is `(Source, Date)`. The writer follows the same idempotency
contract used at Branch C E3:

- Query the database for an existing row matching `Source` and `Date`.
- If a match exists, PATCH it: increment `Success Count` or `Fail Count`,
  update `Last Outcome`, and update `Last Successful Fetch` on success.
- If no match exists, POST a new row.

## Status `warn` vs `fail` in the Pipeline Log

The Source Health Log is the data source for the `Source Health` JSON column
in the Pipeline Log. The health endpoint reads today's Source Health Log
rows to compute:

- `contributed` — sources whose `Success Count > 0` for the day.
- `missing` — expected sources from `getRequiredSourcesForPublicSurface("public.home")` that have no row, or have `Success Count == 0`.

A health check with `Row Count >= 7` but `missing.length > 0` returns
`status: "warn"` (HTTP 200, no alert). `Row Count < 7` is always `fail`
(HTTP 500, alert).

## Phase 4.5 — circuit breaker integration

The Branch B RSS fetch step (R2) consults this database before fetching each
source:

- Sum `Fail Count` for the source over the trailing 24 hours.
- If `>= 5`, skip the source for this run. Write a Source Health Log entry
  with `Last Outcome = skipped_circuit_breaker`. Do **not** report to Sentry.
- Auto-reset: a source skipped continuously for 24 hours is re-attempted on
  the next run regardless of past failure count.

This contract is implemented in PRD-65 Phase 4.5. Phase 4 ships the schema,
the writer, and the data flow; the consumer is wired up in 4.5.

## Operational notes

- One row per `(Source, Date)`. Day boundaries are Taipei time (UTC+8) — see
  the health endpoint's briefing-date logic.
- A write failure on Source Health Log must not fail the ingestion run. The
  writer catches internally and returns a result; the run logs a warning
  and continues.
- The database can be inspected directly in Notion to spot a source that
  has been consistently failing — useful for proactive maintenance before
  the circuit breaker trips.
