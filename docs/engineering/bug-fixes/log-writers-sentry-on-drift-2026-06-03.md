# Log Writers Dark Without Sentry Signal — Bug-Fix Record

## Summary
- **Problem addressed:** `src/lib/observability/pipeline-log.ts` and `src/lib/observability/source-health-log.ts` emit only `logServerEvent("warn", ...)` when env vars drift off the Vercel Production scope, returning `{ written: false, reason }` and continuing. A `warn`-level log is not pageable; observability degrading to silence is invisible until the next manual review. Notion Pipeline Log + Source Health Log were both empty across the 2026-05-22 → 2026-06-03 audit window with no Sentry signal.
- **Root cause:** Missing pageable signal on writer no-op. Writers are correct code; their failure contract was too quiet for an observability surface.
- **Affected object level:** Observability infrastructure.
- **Related issue:** #291. Track 2 P2.

## Fix
Both writers now also call `Sentry.captureMessage(...)` (or `captureException` on a thrown error) at `warning` level on EVERY no-op path:
- env missing (DB ID or token)
- Notion HTTP non-2xx
- Notion response missing `id`
- thrown error

Each call carries a stable `fingerprint: [<writer-tag>, <reason>]` so Sentry groups all 38 per-source no-ops in a single day into ONE issue, not 38. Tags include `observability_surface` (`"pipeline_log"` / `"source_health_log"`) and `writer_noop_reason` for fast filtering.

Successful writes do NOT capture (no false alarms).

## Tests
- `src/lib/observability/pipeline-log.test.ts` (NEW): 5 tests — env-missing, token-missing, HTTP non-2xx, fetch throws, success path captures nothing.
- `src/lib/observability/source-health-log.test.ts` (NEW): 3 tests — env-missing, fingerprint-dedup across 3 sources, success path captures nothing.

Full suite: 850/850 passed across 105 files (+8 from previous baseline). `npm run build` green.

## Why production didn't catch this earlier
The writers themselves were correct — they returned the right `{ written: false }` result and a `warn` log. But a `warn` log is the wrong tier for an observability surface going dark. By the time we noticed, multiple weeks of operational history were missing.

## Operator follow-up (post-deploy)
- Verify next cron run produces:
  - One Pipeline Log row in Notion (after BM confirms `NOTION_PIPELINE_LOG_DB_ID` + `NOTION_TOKEN` are set on Vercel Production scope).
  - 38 Source Health Log rows (or PATCHes), one per RSS source (after BM confirms `NOTION_SOURCE_HEALTH_LOG_DB_ID` is set).
- If env drifts again in the future, a Sentry `warning` issue grouped by reason fires within minutes of the next cron tick.

## Not addressed by this fix
- Setting / verifying the env vars on Vercel Production — BM action.
- The P1 cron success boolean fix (separate PR #290).
- P3 per-call timeout on Gmail fetch (separate PR).
- Renaming `NOTION_SOURCE_HEALTH_LOG_DB_ID` if BM prefers a different convention; the code reads what it reads.
