# pipeline:dry collapses to seed-fallback — unguarded Sentry calls crash under tsx — Bug-Fix Record

- **Date:** 2026-06-08
- **PR:** (pending)
- **Branch:** fix/prd-38-rss-observability-tsx-safe
- **Head SHA:** (pending)
- **Merge SHA:** (pending)
- **Related PRD:** None
- **Object level:** Infrastructure

---

## Symptom

`npm run pipeline:dry` (the blessed zero-write local validation command) was useless: every RSS feed failed with `failure_reason: "Sentry.captureMessage is not a function"` and the `needs_review` sweep failed with the same error, so the RSS stage harvested 0 real items and fell back to deterministic seed data (`candidateCount=10`, "Cron run skipped editorial persistence because live feeds fell back to deterministic seed data"). A developer could not validate any pipeline change locally — the recurrence of the "Sentry shim fails every feed in non-prod" failure mode.

## Root cause

Outside the Next.js server runtime (the `pipeline:dry` harness, any CLI/tsx process, CI), the `@sentry/nextjs` SDK is never `Sentry.init`-ed and several of its functions are undefined. Three pipeline **observability writers** called `Sentry.captureMessage` / `Sentry.captureException` / `Sentry.flush` **without a guard**, so the first invocation threw `Sentry.captureMessage is not a function`:

- `src/lib/observability/source-health-log.ts` — `captureSourceHealthNoop` fires once per source (38/day) when the source-health log env is unconfigured (the local/dry case), so it threw on the FIRST feed and aborted ingestion for every feed.
- `src/lib/observability/pipeline-log.ts` — `captureWriterNoop` + the write-failure capture.
- `src/lib/editorial-sweep/needs-review-sweep.ts` — 8 `captureMessage` calls + 6 `Sentry.flush` calls, crashing the sweep stage.

The RSS observability helpers in `src/lib/observability/rss.ts` were already guarded (`isSentryConfigured("server")` + `typeof Sentry.withScope !== "function"`); these three writers had simply never been given the same guard. The throws were swallowed as per-feed/per-stage failures, masking the cause as a generic feed/ingestion failure.

## Blast radius

**Affected:**
- `pipeline:dry` and any tsx/CLI/CI invocation of the ingestion pipeline (source-health write, pipeline-log write, needs_review sweep). Best-effort telemetry crashed the run instead of no-op'ing.

**Not affected:**
- Production (the Next.js server runtime, where Sentry is initialized and these functions exist). The prod cron always worked.
- Scoring / event_importance / the PRD-38 recalibration / feed lists / selection — untouched.

## Fix

Added three tsx-safe wrappers and routed the unguarded calls through them — the same `isSentryConfigured("server") + typeof` guard the RSS helpers already use, so best-effort telemetry can never crash the run.

- `src/lib/sentry-config.ts` — new `captureMessageSafe`, `captureExceptionSafe`, `flushSafe` (no-op unless Sentry is BOTH configured AND live).
- `src/lib/observability/source-health-log.ts`, `src/lib/observability/pipeline-log.ts`, `src/lib/editorial-sweep/needs-review-sweep.ts` — replaced bare `Sentry.*` calls with the safe wrappers; dropped the now-unused `@sentry/nextjs` import.
- Tests: `src/lib/sentry-config.tsx-safe.test.ts` (wrappers no-op when unconfigured); the three writers' existing tests now set `SENTRY_DSN` so their "telemetry fires when configured" assertions reflect the prod/server runtime.

## Prevention

The guard pattern is now centralized in three reusable wrappers; new pipeline observability code should call `captureMessageSafe` / `captureExceptionSafe` / `flushSafe` rather than `Sentry.*` directly. (Other unguarded `Sentry.*` sites outside the RSS/sweep ingestion path — `gmail.ts`, the cron route, the Next.js error boundaries — were left out of scope; they do not run under `pipeline:dry`.)
