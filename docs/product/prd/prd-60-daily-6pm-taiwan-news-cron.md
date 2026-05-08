# PRD-60 — Daily 6pm Taiwan News Cron

- PRD ID: `PRD-60`
- Canonical file: `docs/product/prd/prd-60-daily-6pm-taiwan-news-cron.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Run the existing Article ingestion, Story Cluster formation, Signal ranking, and editorial Signal Card snapshot workflow once per day at 6:00 PM Taiwan time.

## User Problem

The editor needs the generated Top 5 Signal Cards ready early enough each evening to review, edit, approve, and publish. Manual generation works, but it does not guarantee a fresh daily editorial queue at the right time.

## Scope

- Add a Vercel Cron Job for `0 10 * * *`, equivalent to 6:00 PM Taiwan time.
- Add a protected `/api/cron/fetch-news` endpoint.
- Require `Authorization: Bearer <CRON_SECRET>`.
- Reuse the existing daily briefing generation and editorial snapshot persistence logic.
- Return a sanitized JSON summary with timestamp, success state, pipeline counts, and persistence result.
- Refuse to persist deterministic seed-fallback output as editorial Signal Cards.
- Document operations, local testing, Vercel log verification, and rollback.

## Non-Goals

- No ranking, clustering, source activation, or Signal interpretation changes.
- No editorial UI changes.
- No manual generation flow changes.
- No placeholder Signal Card publishing.
- No secret values committed to the repo.

## Implementation Shape / System Impact

The scheduled route delegates to the existing `generateDailyBriefing` pipeline and `persistSignalPostsForBriefing` editorial read-model persistence. The cron wrapper adds authorization, observability, failure handling, seed-fallback protection, and a JSON run summary.

## Terminology Requirement

- Object level modified: Article ingestion automation, Signal ranking execution, and Signal Card editorial snapshot persistence.
- Article, Story Cluster, Signal, Card, and Surface Placement terminology follows `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`.
- `signal_posts` remains legacy/runtime storage for editorial and public Surface Placement plus Card copy, not canonical Signal identity.

## Dependencies / Risks

- Requires Vercel production cron execution.
- Requires `CRON_SECRET`.
- Requires existing Supabase env vars and `SUPABASE_SERVICE_ROLE_KEY` for editorial persistence.
- Feed outages can still occur; seed fallback is intentionally blocked from persistence.
- Preview validation cannot prove scheduled execution because Vercel Cron Jobs run on production deployments.

## Acceptance Criteria

- `vercel.json` schedules `/api/cron/fetch-news` at `0 10 * * *`.
- Unauthorized requests return HTTP `401` and do not call the pipeline.
- Authorized requests call the existing pipeline once.
- Successful authorized requests persist generated Top 5 Signal Cards for editorial review.
- Seed fallback output is not persisted.
- Response JSON includes `success`, `timestamp`, and `summary`.
- Existing manual briefing generation remains unchanged.

## Evidence and Confidence

- Repo evidence used: existing `generateDailyBriefing`, `persistSignalPostsForBriefing`, Vercel cron configuration rules, and editorial `signal_posts` operational contract.
- Confidence: high for route authorization, scheduling configuration, and local mocked success behavior; production scheduled execution still requires Vercel log verification after deployment.

## Closeout Checklist

- Scope completed: yes.
- Terminology check completed: yes.
- PRD clearly states object level: yes.
- PRD does not describe UI Cards as canonical Signals: yes.
- Tests run: local route tests, full unit tests, lint, build, local endpoint curl checks.
- Local validation complete: yes, with local persistence blocked by missing Supabase service-role env in this worktree.
- Preview validation complete, if applicable: production cron execution requires Vercel production logs after deployment.
- Production sanity check complete: pending merge/deploy.
- GitHub documentation closeout completed in the canonical lane: pending review.
- Google Sheet / Work Log not treated as canonical or updated for routine closeout: yes.
