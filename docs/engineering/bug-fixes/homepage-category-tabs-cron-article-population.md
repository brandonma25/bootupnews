# Homepage Category Tabs Cron Article Population — Bug-Fix Record

## Summary
- Problem addressed: Home category tabs could render as empty even after the scheduled Taipei cron jobs fetched broader Article supply.
- Root cause: the public homepage read only the published Signal Card set from `signal_posts`, while the broader RSS cron Article candidate pool stayed in `pipeline_article_candidates` and was not available to the Tech, Finance, and Politics tab Surface Placements.
- Affected object level: Article and Surface Placement.

## Fix
- Exact change: read the latest two cron-backed `pipeline_article_candidates` runs into a homepage category Article map, cap each category at 50 Articles, exclude likely paywalled sources, exclude URL/title duplicates from the current top 5-7 Signal Cards, render date/source/title/summary rows with clickable original Article links, and await candidate persistence during the cron pipeline so serverless execution does not drop candidate writes.
- Post-deployment warning cleanup: disable Sentry release creation and sourcemap upload during builds that intentionally lack `SENTRY_AUTH_TOKEN`, and mark the package as ESM so Vercel no longer warns while loading `tailwind.config.ts`.
- Related PRD: PRD-57 and PRD-60.
- PR: #227.
- Branch: `fix/category-tabs-populate-articles-20260512`
- Head SHA: pending.
- Merge SHA: pending.
- GitHub source-of-truth status: pending PR review.
- External references reviewed, if any: Vercel cron configuration in `vercel.json`; repo PR #220 metadata.
- Google Sheet / Work Log reference, if historically relevant: not used.
- Branch cleanup status: pending merge.

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`.
- [x] Confirmed object level before coding: Article and Surface Placement.
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] Legacy `signal_posts` references remain treated as Surface Placement plus Card copy/read-model storage.

## Validation
- Automated checks:
  - `npm install` passed.
  - `npm run lint` passed.
  - `npx vitest run src/lib/homepage-category-articles.test.ts src/components/home/home-category-components.test.tsx src/lib/homepage-model.test.ts src/lib/pipeline/controlled-persistence.test.ts` passed.
  - `npx vitest run src/lib/data.test.ts` passed.
  - `npm run test` passed: 93 files, 680 tests.
  - `npm run build` passed.
  - Post-deployment warning fix validation: `npm run lint`, `npm run build`, `npm run test`, and `node scripts/preview-check.js [REDACTED_DEPLOYMENT_URL]` passed after the Sentry and ESM changes.
  - `python3 scripts/release-governance-gate.py --diff-mode local --branch-name fix/category-tabs-populate-articles-20260512 --pr-title "Fix homepage category tabs with cron Article population"` passed.
  - `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name fix/category-tabs-populate-articles-20260512 --pr-title "Fix homepage category tabs with cron Article population"` passed.
  - `python3 scripts/validate-feature-system-csv.py` passed with pre-existing slug warnings.
  - `npx tsc --noEmit` still fails on unrelated existing test fixture type drift; `npm run build` completed its TypeScript phase successfully.
- Human checks:
  - Codex Computer / Chrome QA loaded `http://localhost:3012/`, confirmed HTTP 200 in the dev server log, and verified the Tech, Finance, and Politics tabs switch without rendering errors.
  - Preview validation should confirm the deployed homepage category tabs show Article rows after the next scheduled production cron runs.
  - Production data validation should confirm the Supabase migration is applied and new `pipeline_article_candidates.published_at` values are present.

## Remaining Risks / Follow-up
- Category tab population depends on production cron execution and Supabase service-role read access.
- Existing rows created before this change may fall back to cron ingestion time until new cron runs store Article `published_at`.
