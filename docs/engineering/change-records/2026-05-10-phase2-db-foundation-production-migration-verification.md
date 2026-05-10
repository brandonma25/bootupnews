# Phase 2 DB Foundation Production Migration Verification

- Date: 2026-05-10
- Effective change type: feature / Phase 2 DB foundation production migration execution and verification
- Related PR: #210
- PR #210 merge commit: `9463523c4b4658f883b321278cc02abba0304b02`
- Production URL: `https://bootupnews.vercel.app`
- Supabase project: `fwkqjeumreaznfhnlzev`
- Supabase environment: `main PRODUCTION`

## Summary

The production migration queue blocker was reconciled by applying the two pending Supabase migrations in order through the standard Supabase CLI migration workflow:

1. `20260510110000_signal_posts_public_source_url_guard`
2. `20260510130000_phase2_historical_signal_newsletter_foundation`

No manual SQL paste was used. No data backfill, seed, ingestion, cron, publish, source-governance, ranking, WITM-threshold, URL/domain, or Vercel setting change was performed.

## Preflight

The local `main` worktree was clean but could not fast-forward because it had one local-only commit and was behind `origin/main`. To avoid resetting or rebasing that worktree, verification and execution used a temporary detached worktree from `origin/main` at:

`a40d2ca9389bd3a6e455582f164c598f8c0bf0a8`

That commit contains PR #210 as an ancestor and includes both expected migration files.

Read-only production preflight for the source URL guard returned:

```json
{
  "total_signal_posts": 68,
  "invalid_source_url_rows": 0,
  "invalid_public_rows": 0
}
```

The PR #210 migration was rechecked as schema-only/additive: no `DROP TABLE`, no `DROP COLUMN`, no `UPDATE`, no `DELETE`, no seed rows, no backfill, no duplicate `briefing_snapshots`, and no duplicate `briefing_snapshot_signals`.

## Migration Execution

The Supabase CLI was linked to project `fwkqjeumreaznfhnlzev`. The push prompt showed exactly the expected queue:

```text
20260510110000_signal_posts_public_source_url_guard.sql
20260510130000_phase2_historical_signal_newsletter_foundation.sql
```

The queue was applied in that order. The dashboard migration history then showed both migrations above `20260501100000 mvp_measurement_events`.

Password handling: no database password was pasted, printed, requested in chat, stored in repo files, or committed. The CLI completed without requiring visible secret entry during the successful migration push.

## Database Verification

Production data remained valid after the source URL guard migration:

```json
{
  "total_signal_posts": 68,
  "null_source_url_rows": 0,
  "invalid_source_url_rows": 0,
  "invalid_public_rows": 0
}
```

Service-role REST verification confirmed the new Phase 2 tables exist:

- `newsletter_emails`
- `newsletter_story_extractions`
- `story_clusters`
- `story_cluster_members`
- `signal_evolution`
- `cross_event_connections`

Service-role REST verification confirmed the duplicate snapshot tables are absent:

- `briefing_snapshots`
- `briefing_snapshot_signals`

Service-role REST verification confirmed the expected extended columns are visible on:

- `signal_posts`
- `published_slates`
- `published_slate_items`

The direct catalog verification query for the exact constraint and policy rows was not repeated after the push because additional Supabase CLI catalog connections triggered the provider connection circuit breaker. Verification therefore relies on the successful CLI migration application log, dashboard migration history, REST-visible schema shape, source-row validity checks, migration SQL audit, and public-surface privacy checks.

## Privacy / RLS Verification

The applied PR #210 migration enables RLS on the new internal Phase 2 tables and creates service-role policies only. It does not add anon or authenticated public policies for newsletter tables.

Repo search found no public route selecting `signal_posts.context_material` or `newsletter_emails.raw_content`. Production public HTML checks for `/`, `/signals`, `/dashboard`, and `/briefing/2026-04-29` did not expose `raw_content` or `context_material`.

## App Smoke

Production route probe passed:

```text
/ -> HTTP 200
/dashboard -> HTTP 200
```

Additional fetch checks:

- `/` returned 200.
- `/signals` returned 200 and showed `Published Signals`.
- `/dashboard` returned 200.
- `/briefing/2026-04-29` returned 200 but still rendered `Briefing unavailable`.

Public-route follow-up: current production public content does not match the older April 29 / Top 5 Core + Next 2 Context expectation. The current public surface is showing May 6 content and `/signals` reports 3 signals. `Economic Letter Countdown` is visible in the current public HTML. This was present after the schema-only migration verification and should be handled as a separate public-surface/product follow-up, not as a Phase 2 DB migration failure.

## Non-Actions Confirmed

- No Gmail ingestion was run.
- No cron was run.
- No `draft_only` was run.
- No `dry_run` was run.
- No pipeline write-mode was run.
- No publish action was run.
- No seed rows were inserted.
- No data backfill was run.
- No source changes were made.
- No Vercel URL/domain/settings changes were made.
- No secrets were printed, pasted, committed, or stored.

## Result

The Phase 2 DB foundation production migration is applied and verified with the caveat that exact catalog policy/constraint readback was blocked by Supabase CLI connection circuit-breaker behavior after migration execution. The schema shape, migration history, data-validity, and public privacy checks passed.
