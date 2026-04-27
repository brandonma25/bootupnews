# signal_posts Schema Preflight Remediation

Date: 2026-04-27
Change type: Remediation
Source of truth: PR #115 why-it-matters quality gate remediation, `docs/engineering/SIGNAL_POSTS_OPERATIONAL_CONTRACT.md`

## Summary

PR #115 added validation columns to `public.signal_posts`. The branch code correctly referenced those columns, but a missed production migration can cause Supabase reads and writes to fail before any rows are returned. Without a preflight, those failures can look like legitimate empty editorial/homepage states.

This remediation adds a cached server-side `signal_posts` schema preflight before the existing editorial/public read and write paths use the table.

## Behavior

- Checks the expected `signal_posts` Surface Placement/Card-copy read-model columns once per server module lifecycle.
- Logs a clear server error with missing column names when the preflight fails.
- Returns visible editorial storage warnings instead of silently returning an empty editorial queue.
- Blocks `signal_posts` insertion with a clear message when the schema is missing required columns.
- Surfaces homepage schema failures through the existing freshness/empty-state notice path instead of showing a generic prepared state.

## Scope Boundaries

- Does not modify quality gate validation rules.
- Does not modify ranking, generation, clustering, or template generation logic.
- Does not change the `signal_posts` schema.
- Does not treat `signal_posts` as canonical Signal identity.
- Does not reactivate `PersonalizedDashboard`, `ManualRefreshTrigger`, or any legacy dashboard path.
- Does not create a new canonical PRD.

## Validation

- `npm run lint`
- `npm run test`
- `npm run build`
