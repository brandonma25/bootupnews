# PRD-60 — Scheduled Taipei Editorial Input Fetch Cron

- PRD ID: `PRD-60`
- Canonical file: `docs/product/prd/prd-60-daily-6pm-taiwan-news-cron.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Run the established Article ingestion, Story Cluster formation, Signal ranking, editorial Signal Card snapshot workflow, and approved Gmail newsletter ingestion path twice each evening for Taipei editorial review.

## User Problem

The editor needs generated Top 5 Signal Cards and newsletter-derived review candidates ready early enough each evening to review, edit, approve, and publish. Manual generation works, but it does not guarantee a fresh daily editorial queue at the right time.

## Scope

- Add Vercel Cron Jobs for `15 10 * * *` and `45 11 * * *`, equivalent to 6:15 PM and 7:45 PM Taipei time.
- Add a protected `/api/cron/fetch-editorial-inputs` endpoint that runs the existing RSS fetch path and the PRD-61 Gmail newsletter ingestion path sequentially.
- Add a protected `/api/cron/fetch-news` endpoint.
- Require `Authorization: [REDACTED_ENV_VALUE] <CRON_SECRET>`.
- Reuse the existing daily briefing generation and editorial snapshot persistence logic.
- Persist Article candidate `published_at` metadata so cron-backed homepage category tabs can render Article dates without fetching feeds during homepage SSR.
- Reuse the existing PRD-61 newsletter label preflight, parser, idempotent storage, and non-live review-candidate promotion gates.
- Return a sanitized JSON summary with timestamp, success state, pipeline counts, and persistence result.
- Refuse to persist deterministic seed-fallback output as editorial Signal Cards.
- Document operations, local testing, Vercel log verification, and rollback.

## Non-Goals

- No ranking, clustering, source activation, parser, or Signal interpretation changes.
- No editorial UI changes.
- No manual generation flow changes.
- No placeholder Signal Card publishing.
- No secret values committed to the repo.
- No direct cron execution during implementation validation.

## Implementation Shape / System Impact

The scheduled route delegates first to the existing `generateDailyBriefing` pipeline and `persistSignalPostsForBriefing` editorial read-model persistence, then to `runNewsletterIngestion({ writeCandidates: true })`. The cron wrapper adds authorization, observability, failure handling, seed-fallback protection through the existing RSS path, PRD-61 newsletter env/write gates, and a sanitized combined JSON run summary. The RSS pipeline also writes normalized Article candidates synchronously enough for serverless cron execution to retain candidate rows for downstream persisted read models.

## Terminology Requirement

- Object level modified: Article ingestion automation, Signal ranking execution, Signal Card editorial snapshot persistence, and non-live Surface Placement review-candidate creation.
- Article, Story Cluster, Signal, Card, and Surface Placement terminology follows `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`.
- `signal_posts` remains legacy/runtime storage for editorial and public Surface Placement plus Card copy, not canonical Signal identity.

## Dependencies / Risks

- Requires Vercel production cron execution.
- Requires `CRON_SECRET`.
- Requires existing Supabase env vars and `SUPABASE_SERVICE_ROLE_KEY` for editorial persistence.
- Requires PRD-61 Gmail OAuth env vars, `NEWSLETTER_INGESTION_ENABLED=[REDACTED_ENV_VALUE]`, `NEWSLETTER_INGESTION_DRY_RUN=[REDACTED_ENV_VALUE]`, and `ALLOW_PRODUCTION_NEWSLETTER_INGESTION=[REDACTED_ENV_VALUE]` for production newsletter writes.
- Feed outages can still occur; seed fallback is intentionally blocked from persistence.
- Preview validation cannot prove scheduled execution because Vercel Cron Jobs run on production deployments.
- Exact minute execution depends on the active Vercel plan. The repo cron expressions target 6:15 PM and 7:45 PM Taipei; Vercel Hobby scheduling can be less minute-exact.

## Acceptance Criteria

- `vercel.json` schedules `/api/cron/fetch-editorial-inputs` at `15 10 * * *` and `45 11 * * *`.
- Unauthorized requests return HTTP `401` and do not call the pipeline.
- Authorized requests call the existing RSS pipeline once and the existing PRD-61 newsletter ingestion path once.
- Successful authorized requests persist generated Top 5 Signal Cards for editorial review.
- Successful authorized RSS runs persist normalized Article candidate rows with source URL, title, source name, cron ingestion time, and Article publication date when available.
- Successful authorized newsletter runs create only non-live `needs_review` review candidates.
- Seed fallback output is not persisted.
- Response JSON includes `success`, `timestamp`, and `summary`.
- Existing manual briefing generation remains unchanged.

## Evidence and Confidence

- Repo evidence used: existing `generateDailyBriefing`, `persistSignalPostsForBriefing`, `runNewsletterIngestion`, PRD-61 write gates, Vercel cron configuration rules, and editorial `signal_posts` operational contract.
- Confidence: high for route authorization, scheduling configuration, and local mocked success behavior; production scheduled execution and production newsletter write-gate values still require Vercel verification after deployment.

## Closeout Checklist

- Scope completed: yes for repo configuration; production env gate confirmation remains external.
- Terminology check completed: yes.
- PRD clearly states object level: yes.
- PRD does not describe UI Cards as canonical Signals: yes.
- Tests run: local route tests, full unit tests, lint, build, and route authorization checks.
- Local validation complete: pending this branch's validation run.
- Preview validation complete, if applicable: Vercel cron execution requires production deployment and logs.
- Production sanity check complete: pending merge/deploy.
- GitHub documentation closeout completed in the canonical lane: pending PR review.
- Google Sheet / Work Log not treated as canonical or updated for routine closeout: yes.
