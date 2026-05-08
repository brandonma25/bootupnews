# MVP Measurement Summary Readiness

Date: 2026-05-01
Branch: `codex/mvp-measurement-summary-readiness`
Readiness label: `measurement_summary_ready_via_configured_environment_only`
Canonical PRD required: `No`

## Effective Change Type

Remediation / alignment.

This change aligns summary readback for the already-approved MVP measurement instrumentation. It does not create a public analytics product, create a new PRD, change product scope, mutate Signal rows, run cron, publish, change ranking/source/WITM thresholds, start Phase 2 architecture, start personalization, or add a visible comprehension prompt UI.

Object level changed:

- Signal/Card/Surface Placement measurement summary only.

Object levels not changed:

- Article
- Story Cluster
- conceptual Signal identity
- public Card copy
- public Surface Placement / visibility

## Source Of Truth

Primary:

- Product Position - MVP Success Criteria:
  - day-7 retention
  - depth engagement / Signal expansion
  - comprehension confidence

Secondary:

- PR #175 MVP measurement instrumentation
- PR #177 measurement storage alignment
- PR #178 final launch-readiness QA rerun blocker
- `docs/engineering/change-records/mvp-measurement-instrumentation.md`
- `docs/operations/controlled-cycles/2026-05-01-final-launch-readiness-qa-rerun.md`
- `docs/operations/controlled-cycles/2026-05-01-mvp-measurement-storage-alignment.md`

## What Changed

- Added aggregate event counts by event name to `summarizeMvpMeasurementEvents`.
- Moved the existing script query into a shared read helper:
  - `readMvpMeasurementSummary`
  - `normalizeMvpMeasurementSummaryWindowDays`
- Updated `scripts/mvp-measurement-summary.ts` to use the shared helper.
- Added an internal read-only JSON endpoint:
  - `GET /api/internal/mvp-measurement/summary?days=30`

## Internal Summary Path

The internal endpoint is not a public analytics dashboard and has no UI. It is intended for controlled launch-readiness readback in a configured server environment.

Protection:

- requires an authenticated Supabase session via `safeGetUser`
- requires an authorized admin email via `ADMIN_EMAILS`
- reads through the existing service-role server client
- returns aggregate counts only
- sets `Cache-Control: no-store`
- returns generic errors to callers
- does not return raw visitor IDs, session IDs, service credentials, cookies, auth headers, or connection strings

Returned summary fields include:

- total event count
- unique anonymous visitor count
- unique session count
- event counts by date
- event counts by event name
- event counts by route
- day-7 return denominator/numerator/rate
- strict full-expansion session rate
- proxy expansion session rate
- first-three-sessions expansion rate
- comprehension prompt shown/answered/agreement rate
- explicit limitations for elapsed day-7 data, deferred comprehension prompt UI, and strict full-expansion proxy status

## Existing Helper Status

The existing local helper remains server-configured only:

```bash
npx tsx scripts/mvp-measurement-summary.ts --days 1
```

In this worktree it returned:

```text
Supabase server configuration is required to summarize MVP measurement events.
```

The local shell had no `SUPABASE`, `DATABASE`, `POSTGRES`, `VERCEL`, or `ADMIN_EMAILS` variables exposed. Secrets were not printed, pulled into local files, persisted, or committed.

## What Did Not Change

- no public analytics dashboard
- no public/user-facing measurement UI
- no visible comprehension prompt UI
- no event schema change
- no signal-row mutation
- no direct SQL row surgery
- no ad hoc DDL or DML
- no publish
- no `draft_only`
- no pipeline write-mode
- no cron
- no source governance change
- no ranking threshold change
- no WITM threshold change
- no Phase 2 architecture
- no personalization
- no analytics-driven ranking or product behavior

## Validation

Commands run:

```bash
npm install
npx vitest run src/lib/mvp-measurement-summary.test.ts src/app/api/internal/mvp-measurement/summary/route.test.ts
npx tsx scripts/mvp-measurement-summary.ts --days 1
git diff --check
python3 scripts/validate-feature-system-csv.py
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/mvp-measurement-summary-readiness --pr-title "MVP measurement summary readiness"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/mvp-measurement-summary-readiness --pr-title "MVP measurement summary readiness"
npm run lint
npm run test
npm run build
PLAYWRIGHT_MANAGED_WEBSERVER=1 npm run test:e2e:chromium
PLAYWRIGHT_MANAGED_WEBSERVER=1 npx playwright test tests/routes/core-routes.spec.ts tests/audit/route-traversal.spec.ts --project=chromium --workers=1
PLAYWRIGHT_MANAGED_WEBSERVER=1 npx playwright test --project=chromium --workers=1
PLAYWRIGHT_MANAGED_WEBSERVER=1 npx playwright test --project=webkit --workers=1
```

Results:

- `npm install` passed; npm reported two audit findings.
- Focused Vitest passed: 2 files, 6 tests.
- Local summary helper remained blocked by missing Supabase server configuration, as expected.
- `git diff --check` passed.
- Governance validation passed.
- `npm run lint` passed.
- `npm run test` passed: 78 files, 591 tests.
- Final `npm run build` passed after correcting the helper query-builder type.
- Full serial Chromium passed: 33 tests.
- Full serial WebKit passed: 33 tests.

The first full Chromium run with default parallel workers hit two navigation timeouts around the legacy `/sources` redirect path. The exact failing specs passed serially, and the full Chromium suite then passed serially.

## Result

The previous limitation is now bounded with a safe configured-environment path:

```text
measurement_summary_ready_via_configured_environment_only
```

## Next Task

After this PR is merged and deployed, rerun final launch-readiness QA and verify the internal summary endpoint with an authenticated admin session in production or preview. If summary readback succeeds and public/cron safety still passes, proceed to controlled user exposure. Cron remains a later staged operations task.
