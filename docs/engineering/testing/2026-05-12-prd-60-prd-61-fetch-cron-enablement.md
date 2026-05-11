# PRD-60 / PRD-61 Fetch Cron Enablement Validation

## Summary

- Branch: `ops/prd-61-enable-fetch-crons`
- Scope: schedule the protected combined editorial input fetch route for the approved 6:15 PM and 7:45 PM Taipei windows.
- Object level: Article ingestion automation, Signal Card editorial snapshot persistence, and non-live Surface Placement review-candidate creation.
- Routes changed:
  - `/api/cron/fetch-editorial-inputs` added as the scheduled combined route.
  - Existing `/api/cron/fetch-news` and `/api/cron/newsletter-ingestion` remain protected diagnostic routes.

## Safety Boundary

- No cron route was executed against production during implementation.
- No RSS pipeline, `draft_only`, publish path, direct SQL mutation, or production database write was run from this branch.
- No credential values, Gmail message IDs, raw email content, snippets, or newsletter context material were added to docs.
- Vercel env names were inspected without printing values. Missing production write gate: `ALLOW_PRODUCTION_NEWSLETTER_INGESTION`.

## Schedule

| Taipei time | UTC cron | Route |
| --- | --- | --- |
| 6:15 PM daily | `15 10 * * *` | `/api/cron/fetch-editorial-inputs` |
| 7:45 PM daily | `45 11 * * *` | `/api/cron/fetch-editorial-inputs` |

## Expected Production Behavior

- Vercel sends `Authorization: Bearer <CRON_SECRET>` to the combined route.
- The route runs RSS first, then PRD-61 newsletter ingestion with candidate writes still controlled by env gates.
- RSS seed fallback remains blocked from editorial persistence.
- Newsletter candidates remain non-live review candidates with no publish side effect.
- Public pages continue to require live published rows.

## Validation

Completed branch validation:
- `npm install` passed. npm reported 3 dependency audit findings already present in the dependency tree.
- `git diff --check` passed.
- `npx vitest run src/app/api/cron/fetch-editorial-inputs/route.test.ts src/app/api/cron/fetch-news/route.test.ts src/app/api/cron/newsletter-ingestion/route.test.ts` passed: 3 files, 14 tests.
- `npm run lint` passed.
- `python3 scripts/validate-feature-system-csv.py` passed. It reported existing slug warnings, including the unchanged PRD-60 file slug after the feature-name update.
- `python3 scripts/release-governance-gate.py --diff-mode local --branch-name ops/prd-61-enable-fetch-crons --pr-title "Enable PRD-60 and PRD-61 editorial input fetch crons"` passed after adding the change-record lane.
- `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name ops/prd-61-enable-fetch-crons --pr-title "Enable PRD-60 and PRD-61 editorial input fetch crons"` passed after adding the change-record lane.
- `npm run test` initially hit a timeout in an existing cron test during the first full-suite attempt. After hardening the new route test module isolation, the rerun passed: 91 files, 669 tests.
- `npm run build` passed. Next.js reported existing workspace-root and package module-type warnings.
- Local dev server started at `http://localhost:3000`.
- `GET /` returned HTTP 200.
- `GET /signals` returned HTTP 200.
- `GET /api/cron/fetch-editorial-inputs` without auth returned HTTP 401 and did not run either fetch path.

Production verification after merge:
- Confirm `/` HTTP 200.
- Confirm `/signals` HTTP 200.
- Confirm `/api/cron/fetch-editorial-inputs` without auth returns HTTP 401.
- Confirm Vercel cron logs after the first scheduled run.

## Remaining Human / External Gate

- Explicit BM permission is still required before Codex changes Vercel Production env values.
- Production newsletter writes require `ALLOW_PRODUCTION_NEWSLETTER_INGESTION=true` in addition to the already listed newsletter env names.
