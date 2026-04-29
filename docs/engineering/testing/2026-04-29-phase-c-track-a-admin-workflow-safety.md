# Phase C Track A Admin Workflow Safety Validation

## Change Type

remediation / controlled operations validation

## Canonical PRD

No new canonical PRD is required. This remediation validates and tightens the existing PRD-53 signals admin editorial workflow. It does not add Batch 2 sources, source ingestion, new public surfaces, card-level editorial authority, historical snapshot schema, or publishing capability.

## Scope

- Tighten public `signal_posts` reads to require `is_live = true`, `editorial_status = 'published'`, and non-null `published_at`.
- Align homepage editorial override reads with the same public eligibility predicate.
- Block the row-level publish bypass and remove the per-card Publish control from the admin editor.
- Keep save and approve actions from setting `is_live` or `published_at`.
- Surface WITM validation status and failure reasons in the admin review UI when the data exists.
- Add regression coverage for draft isolation, publish gating, save/approve safety, row-level publish blocking, and WITM rewrite-required display through a local fixture.

## P1 Compatibility Check

Before deploy, the production read-only `published_at` compatibility check cleared:

- `published_or_live_total = 30`
- `published_or_live_missing_published_at = 0`
- `published_status_missing_published_at = 0`
- `live_rows_excluded_by_new_predicate = 0`

No backfill was needed. No production SQL writes were performed.

## Local Validation

- `git diff --check` passed.
- `npm run lint` passed.
- `npm run test -- src/lib/signals-editorial.test.ts src/app/dashboard/signals/editorial-review/page.test.tsx` passed: 2 files, 49 tests.
- `npm run test -- src/app/dashboard/signals/editorial-review/StructuredEditorialFields.test.tsx src/app/dashboard/signals/editorial-review/ApproveAllButton.test.tsx src/app/signals/page.test.tsx src/lib/homepage-editorial-overrides.test.ts src/lib/data.test.ts` passed: 5 files, 15 tests.
- `npm run build` passed.
- `npm run test` passed: 72 files, 492 tests.
- `PLAYWRIGHT_MANAGED_WEBSERVER=1 npx playwright test --project=chromium` passed: 33 tests.
- `PLAYWRIGHT_MANAGED_WEBSERVER=1 npx playwright test --project=webkit` passed: 33 tests.

## Non-Validated Items

- Manual Track A production admin write-side actions remain unvalidated: rewrite/save, approve, and reject/dismiss if non-destructive and implemented.
- Manual publish remains unvalidated and out of scope.
- WITM failure UI is validated only by local fixture, not by a real failed production row.
- Representative editorial quality, daily slate quality, and candidate-pool sufficiency remain unvalidated.
- Batch 2/source expansion remains future work.
- A full controlled publish requires a representative five-row slate and separate explicit approval.
