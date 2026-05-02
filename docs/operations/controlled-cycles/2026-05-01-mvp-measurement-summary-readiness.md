# MVP Measurement Summary Readiness

Date checked: 2026-05-02
Branch: `codex/mvp-measurement-summary-readiness`
Readiness label: `measurement_summary_ready_via_configured_environment_only`

## Effective Change Type

Remediation / alignment.

This packet records the measurement-summary readiness pass after PR #178 found final launch-readiness partially limited by unavailable local production summary readback. It does not create a public analytics product, create a new PRD, change product scope, run cron, run `draft_only`, run pipeline write-mode, publish, mutate Signal rows, run direct SQL row surgery, change source/ranking/WITM thresholds, start Phase 2 architecture, start personalization, or implement visible comprehension prompt UI.

Object levels affected:

- Signal/Card/Surface Placement measurement summary only

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

- `docs/operations/controlled-cycles/2026-05-01-final-launch-readiness-qa-rerun.md`
- `docs/operations/tracker-sync/2026-05-01-final-launch-readiness-qa-rerun.md`
- `docs/operations/controlled-cycles/2026-05-01-mvp-measurement-storage-alignment.md`
- `docs/operations/tracker-sync/2026-05-01-mvp-measurement-storage-alignment.md`
- `docs/engineering/change-records/mvp-measurement-instrumentation.md`
- `docs/operations/controlled-cycles/2026-05-01-final-launch-readiness-qa.md`
- `docs/operations/tracker-sync/2026-05-01-final-launch-readiness-qa.md`

## PR #178 Blocker Summary

PR #178 confirmed:

- public homepage `/` passed
- `/signals` passed
- `/briefing/2026-05-01` passed
- production measurement event writes returned `stored:true`
- cron remained protected with HTTP 401
- no publish, cron, `draft_only`, Signal row mutation, direct SQL row surgery, ranking/WITM/source change, Phase 2 architecture, or personalization occurred

Remaining limitation:

```text
local measurement summary helper cannot read production rows because the worktree has no Supabase server config exposed
```

PR #178 readiness:

```text
launch_readiness_partial_measurement_summary_limited
```

## Authorization

Prompt-level authorization present:

- `CONTROLLED_PRODUCTION_MEASUREMENT_SUMMARY_READ_APPROVED=true`
- `CONTROLLED_PRODUCTION_SCHEMA_READONLY_INSPECTION_APPROVED=true`

Prompt-level authorization absent:

- controlled user exposure authorization
- public/user-facing analytics dashboard authorization
- visible comprehension prompt UI authorization
- event schema change authorization
- signal-row mutation authorization
- direct SQL row-surgery authorization
- ad hoc DDL authorization
- ad hoc DML authorization
- publish authorization
- `draft_only` authorization
- pipeline write-mode authorization
- cron authorization
- source/ranking/WITM threshold authorization
- Phase 2 architecture authorization
- personalization authorization

Shell environment note:

- The authorization variables were present in the user prompt, not exported as shell variables.
- No `SUPABASE`, `DATABASE`, `POSTGRES`, `VERCEL`, or `ADMIN_EMAILS` environment variables were exposed to this worktree during the local check.
- No secrets, database passwords, connection strings, service-role keys, browser cookies, auth headers, or production credentials were printed or persisted.

## Baseline Inspection

Files and conventions inspected:

- `scripts/mvp-measurement-summary.ts`
- `src/lib/mvp-measurement-summary.ts`
- `src/lib/mvp-measurement.ts`
- `src/app/api/mvp-measurement/events/route.ts`
- `src/lib/supabase/server.ts`
- `src/lib/admin-auth.ts`
- `supabase/migrations/20260501100000_mvp_measurement_events.sql`
- `docs/engineering/change-records/mvp-measurement-instrumentation.md`
- `docs/operations/controlled-cycles/2026-05-01-final-launch-readiness-qa-rerun.md`
- `docs/operations/controlled-cycles/2026-05-01-mvp-measurement-storage-alignment.md`

Findings:

- The existing summary helper requires server-only Supabase configuration.
- The helper reads `mvp_measurement_events` through service-role access and does not mutate data.
- The production schema includes service-role read/write policies for `mvp_measurement_events`.
- The existing event API writes only validated measurement events and soft-fails without blocking public UX.
- Admin authorization convention exists through `safeGetUser` plus `ADMIN_EMAILS`.
- The existing helper did not report event counts by event name, which made event-specific readback less direct.

## Existing Helper Attempt

Command:

```bash
npx tsx scripts/mvp-measurement-summary.ts --days 1
```

Result:

```text
Supabase server configuration is required to summarize MVP measurement events.
```

Interpretation:

- The helper is present and runnable after dependencies are installed.
- This local worktree intentionally does not have server-only production credentials exposed.
- No unsafe workaround was attempted.
- Secrets were not pulled from Vercel or Supabase into local files.

## Minimal Read-Only Summary Path Added

Added:

- `GET /api/internal/mvp-measurement/summary?days=30`

Supporting changes:

- `summarizeMvpMeasurementEvents` now includes `eventCountByEventName`.
- `readMvpMeasurementSummary` centralizes the service-role read query for both the script and internal route.
- `scripts/mvp-measurement-summary.ts` now uses the shared summary read helper.

Protection:

- requires an authenticated Supabase session
- requires `ADMIN_EMAILS` authorization through `isAdminUser`
- uses the existing server-side service-role client
- returns aggregate-only JSON
- never returns raw visitor IDs or session IDs
- does not return secrets, cookies, auth headers, connection strings, or database details
- returns generic errors to callers if the service read fails
- uses `Cache-Control: no-store`

Data read:

- `event_name`
- `visitor_id`
- `session_id`
- `occurred_at`
- `route`
- `metadata`

Data returned:

- total event count
- event counts by date
- event counts by event name
- event counts by route
- unique visitor count
- unique session count
- day-7 return denominator/numerator/rate
- strict full-expansion session count/rate
- proxy expansion session count/rate
- first-three-sessions expansion denominator/numerator/rate
- comprehension prompt shown/answered/agreement counts/rate
- explicit limitations

No mutation occurs.

## Summary Verification Result

Local focused tests passed:

```bash
npx vitest run src/lib/mvp-measurement-summary.test.ts src/app/api/internal/mvp-measurement/summary/route.test.ts
```

Result:

```text
2 files passed
6 tests passed
```

Verified by tests:

- unauthenticated requests cannot read summaries
- non-admin users cannot read summaries
- missing server config returns an unavailable status
- authorized admin requests receive aggregate-only summaries
- event counts by event name are grouped correctly
- `homepage_view`, `signal_details_click`, and `source_click` appear in aggregate output when rows are present
- raw anonymous visitor/session IDs are not returned
- query errors return generic caller-facing errors and are logged server-side

Production summary readback was not run in this branch because the internal path must be deployed first and requires authenticated admin access in a configured server environment. This is the intended safe operational boundary.

## Public Safety Verification

Production URL:

```text
https://daily-intelligence-aggregator-ybs9.vercel.app
```

Read-only checks run before code changes:

| Route | Result |
| --- | --- |
| `/` | HTTP 200 |
| `/signals` | HTTP 200 |
| `/briefing/2026-05-01` | HTTP 200 |
| `/api/cron/fetch-news` without auth | HTTP 401 |

Additional observations:

- `/` showed May 1 markers
- `/signals` showed `Published Signals`
- no schema-preflight error text was visible
- no missing-column text was visible
- no measurement-storage error text was visible
- cron remained protected

The repo production route probe also passed:

```text
PASS production route probe
/ -> HTTP 200; /dashboard -> HTTP 200
```

## Cron Status

Cron remained protected:

```text
GET /api/cron/fetch-news -> HTTP 401
```

No cron run was triggered. Cron was not re-enabled.

## What Did Not Change

- no public analytics product
- no new PRD
- no product scope change
- no public/user-facing dashboard
- no visible comprehension prompt UI
- no event schema change
- no signal-row mutation
- no direct SQL row surgery
- no ad hoc DDL
- no ad hoc DML
- no publish
- no `draft_only`
- no pipeline write-mode
- no cron
- no source governance change
- no ranking threshold change
- no WITM threshold change
- no public URL/domain/env/Vercel setting change
- no removal of `newsweb2026@gmail.com` from Production `ADMIN_EMAILS`
- no Phase 2 architecture
- no personalization
- no analytics-driven ranking or product behavior

## Validation

Commands run:

```bash
npm install
npx vitest run src/lib/mvp-measurement-summary.test.ts src/app/api/internal/mvp-measurement/summary/route.test.ts
npx tsx scripts/mvp-measurement-summary.ts --days 1
node scripts/prod-check.js https://daily-intelligence-aggregator-ybs9.vercel.app
node <read-only public route and cron probe>
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
- The local helper remained blocked by missing Supabase server configuration.
- Production route probe passed.
- Public route and cron checks passed.
- `git diff --check` passed.
- `python3 scripts/validate-feature-system-csv.py` passed with existing PRD slug warnings for PRD-32, PRD-37, and PRD-38.
- `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/mvp-measurement-summary-readiness --pr-title "MVP measurement summary readiness"` passed.
- `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/mvp-measurement-summary-readiness --pr-title "MVP measurement summary readiness"` passed.
- `npm run lint` passed.
- `npm run test` passed: 78 files, 591 tests.
- First `npm run build` attempt found a Supabase query-builder typing mismatch in the shared helper; the helper type was corrected to accept Supabase's thenable query builder.
- Final `npm run build` passed. Next.js emitted existing workspace-root and Tailwind module-type warnings.
- Initial full Chromium run with default parallel workers hit two navigation timeouts around the legacy `/sources` redirect path.
- Targeted serial rerun of the failing Chromium specs passed: 8 tests.
- Full serial Chromium rerun passed: 33 tests.
- Full serial WebKit rerun passed: 33 tests.

## Blockers Remaining

No public-safety blocker was found.

Remaining operational limitation:

- production summary readback must be verified after this internal route is merged and deployed, or the existing CLI helper must be run in a separately configured server environment

This limitation is now bounded by a concrete safe path.

## Result

Summary readiness is bounded by a configured-environment path:

```text
measurement_summary_ready_via_configured_environment_only
```

## Exact Next Task

After this PR is merged and deployed, rerun final launch-readiness QA and verify the internal summary route with authenticated admin access:

```text
GET /api/internal/mvp-measurement/summary?days=7
```

If that summary readback succeeds and public/cron safety still passes, move to controlled user exposure. Cron remains a later staged operations task.
