# Controlled User Exposure Active Day 0 Readback

Date prepared: 2026-05-02
Baseline captured: 2026-05-02 14:46:39 CST
Branch: `codex/controlled-user-exposure-active-day-0-readback`
Readiness label: `controlled_user_exposure_active_day_0`

## Effective Change Type

Operations validation / controlled launch execution.

This packet records the operator-confirmed Day 0 invite send and monitoring readback for the first controlled Boot Up exposure cohort. It does not add a feature, create a PRD, implement a visible prompt, add a public analytics dashboard, run cron, publish, run `draft_only`, run pipeline write-mode, mutate Signal rows, run direct SQL, apply schema changes, change source governance, change ranking or WITM thresholds, start Phase 2 architecture, start personalization, or use measurement events to change ranking.

## Source Of Truth

Primary:

- Product Position - MVP target user, product experience, and MVP success criteria
  - target user: ambitious early-stage knowledge builders
  - public experience: Top 5 Core Signals + Next 2 Context Signals
  - success criteria: day-7 retention, depth engagement, comprehension confidence

Secondary:

- `docs/operations/launch-readiness/2026-05-02-controlled-user-exposure-active-day-0.md`
- `docs/operations/tracker-sync/2026-05-02-controlled-user-exposure-active-day-0.md`
- `docs/operations/launch-readiness/2026-05-02-controlled-user-exposure-day-0.md`
- `docs/operations/tracker-sync/2026-05-02-controlled-user-exposure-day-0.md`
- `docs/engineering/change-records/mvp-measurement-instrumentation.md`
- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

## Readiness State

Merged readiness chain:

- PR #183 created the Day 0 exposure plan.
- PR #184 created the Day 0 ready packet and was merged.
- PR #184 production verification passed on merge commit `9fec0c7a6889b8a419a34ce2252c856acf954263`.
- The operator has now manually sent invites outside the repo.

Current state:

- controlled exposure is active for Day 0 monitoring
- production public routes are healthy
- measurement summary is readable with authenticated admin access
- cron remains protected
- no tester PII is committed
- invite count, exact send timestamp, and generic channel were not provided in this prompt and remain a non-PII Day 1 readback item

## Production Baseline

Production URL:

- `https://daily-intelligence-aggregator-ybs9.vercel.app`

Current branch and commit:

- branch: `codex/controlled-user-exposure-active-day-0-readback`
- commit: `9fec0c7a6889b8a419a34ce2252c856acf954263`
- commit summary: `docs: prepare active controlled exposure day 0 (#184)`

Deployment:

- Vercel deployment ID: `dpl_3nh98Khewm4taSG85UQG9gjGumUY`
- target: production
- status: Ready
- deployment URL: `https://bootup-dka9lij8m-brandonma25s-projects.vercel.app`
- production alias: `https://daily-intelligence-aggregator-ybs9.vercel.app`

Production verification:

- GitHub Production Verification passed for `9fec0c7a6889b8a419a34ce2252c856acf954263`.
- `vercel inspect https://daily-intelligence-aggregator-ybs9.vercel.app` showed production Ready.

Route checks:

| Check | Result |
| --- | --- |
| `/` | HTTP 200 |
| `/signals` | HTTP 200 |
| `/briefing/2026-05-01` | HTTP 200 by direct fetch and fresh/incognito Chrome context |
| `/api/cron/fetch-news` without auth | HTTP 401 |
| `/api/internal/mvp-measurement/summary?days=7` without auth | HTTP 401 |
| `/dashboard/signals/editorial-review` without auth | rendered safely with sign-in/admin-gated state |

Public safety:

- no public route returned 5xx
- no raw schema-preflight error observed
- no missing-column text observed
- no measurement-storage error text observed
- no unpublished/non-live row exposure observed
- no accidental public visibility issue observed
- normal Chrome profile may still hold stale local state for `/briefing/2026-05-01`; fresh/incognito context loads the correct May 1 briefing and remains the first-tester baseline

Vercel logs:

- error logs for deployment `dpl_3nh98Khewm4taSG85UQG9gjGumUY` over the checked 30-minute window: no logs found

## Invite Send Readback

Operator confirmation:

- `OPERATOR_INVITES_SENT=true`
- operator confirmed invites were sent manually outside the repo
- Codex did not send messages
- no communication tool was used by Codex
- no tester names, email addresses, phone numbers, social handles, school identifiers, employer identifiers, or private communication screenshots were committed

Invite send fields:

| Field | Readback |
| --- | --- |
| Invite send date/time | Operator-confirmed sent before this 2026-05-02 14:46:39 CST readback; exact timestamp not provided |
| Number of testers invited | Not provided in this prompt; controlled exposure scope remains 5-15 testers |
| Generic channel type | Not provided in this prompt; recorded only as manual external outreach |
| Operator-confirmed send status | Sent manually outside repo |
| Known tester opens | Not directly attributable yet; measurement events are visible, but current counts include QA/browser monitoring traffic |

Day 1 non-PII readback should add:

- number sent
- generic channel, such as manual DM, manual email, text message, or other generic channel
- whether any tester opened the product, if known without identifying them

## Anonymized Tester Scope

The tester list is finalized and managed outside the repo. This packet records only anonymized operating slots.

Planned cohort:

- 5-15 testers

Target profile:

- ambitious early-stage knowledge builders
- students at competitive universities
- early-career professionals in consulting, banking, tech, policy, or adjacent fields
- graduate students in business, law, or policy
- ambitious self-improvers already trying to stay informed

Anonymized tracker:

| Tester ID | Profile category | Invite status | Start date | Day-1 check date | Day-3 check date | Day-7 check date | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T01 | Operator-held target profile | Operator sent outside repo if included in final cohort | 2026-05-02 | 2026-05-03 | 2026-05-05 | 2026-05-09 | No PII in repo |
| T02 | Operator-held target profile | Operator sent outside repo if included in final cohort | 2026-05-02 | 2026-05-03 | 2026-05-05 | 2026-05-09 | No PII in repo |
| T03 | Operator-held target profile | Operator sent outside repo if included in final cohort | 2026-05-02 | 2026-05-03 | 2026-05-05 | 2026-05-09 | No PII in repo |
| T04 | Operator-held target profile | Operator sent outside repo if included in final cohort | 2026-05-02 | 2026-05-03 | 2026-05-05 | 2026-05-09 | No PII in repo |
| T05 | Operator-held target profile | Operator sent outside repo if included in final cohort | 2026-05-02 | 2026-05-03 | 2026-05-05 | 2026-05-09 | No PII in repo |
| T06-T15 | Optional cohort expansion | Operator sent outside repo if included in final cohort | 2026-05-02 | 2026-05-03 | 2026-05-05 | 2026-05-09 | Use only if cohort remains within 5-15 testers |

Tester PII handling:

- no names committed
- no email addresses committed
- no phone numbers committed
- no exact social handles committed
- no school or employer identifiers committed when individually identifying
- no private communication screenshots committed

## Measurement Baseline

Unauthenticated internal summary access remains protected:

- `/api/internal/mvp-measurement/summary?days=7` returned HTTP 401 without auth.

Authenticated summary readback was available through the existing admin browser session:

- `ok:true`
- window: 7 days
- since: `2026-04-25T06:45:47.156Z`
- event count: 45
- unique visitors: 15
- unique sessions: 20

Event count by date:

| Date | Events |
| --- | ---: |
| 2026-05-02 | 45 |

Event count by event name:

| Event | Count |
| --- | ---: |
| `homepage_view` | 24 |
| `signals_page_view` | 15 |
| `signal_full_expansion_proxy` | 4 |
| `signal_details_click` | 1 |
| `source_click` | 1 |

Event count by route:

| Route | Events |
| --- | ---: |
| `/` | 27 |
| `/signals` | 16 |
| `/briefing/2026-05-01` | 2 |

Day-7 retention:

- denominator: 15
- numerator: 0
- rate: 0
- interpretation: not enough elapsed time; this is not a product failure

Depth engagement:

- strict full-expansion sessions: 0
- proxy expansion sessions: 4
- denominator: 20
- strict rate: 0
- proxy rate: 0.2

First-three-sessions expansion:

- denominator: 15
- numerator: 4
- rate: 0.26666666666666666

Comprehension:

- prompt shown count: 0
- answered count: 0
- agree count: 0
- agreement rate: null
- interpretation: visible comprehension prompt UI remains deferred; manual qualitative follow-up is required

Measurement interpretation:

- day-7 retention cannot be evaluated until the seven-day window elapses
- early event counts are operational monitoring, not product validation
- current event counts include QA/browser monitoring and cannot yet be attributed to tester behavior
- full four-layer expansion remains represented by proxy events unless the product later exposes a strict four-layer expansion action

## Day 0 Active Monitoring Result

| Check | Result |
| --- | --- |
| `/` returns 200 | Passed |
| `/signals` returns 200 | Passed |
| `/briefing/2026-05-01` returns 200 | Passed by direct fetch and fresh/incognito Chrome context |
| Event API stores events | Passed indirectly through visible stored event counts; no synthetic POST was sent in this run |
| Internal summary endpoint returns `ok:true` when authenticated | Passed |
| Event counts visible | Passed |
| Visitor/session counts visible | Passed |
| No raw schema or measurement errors visible publicly | Passed |
| Cron endpoint remains protected / not run | Passed; unauthenticated HTTP 401 |
| Admin route remains protected | Passed; unauthenticated route rendered sign-in/admin gate |
| Vercel logs show no 5xx or measurement-summary failures | Passed; no error logs found in checked window |
| No accidental public visibility issue | Passed |

## Manual Comprehension Follow-Up Plan

Visible comprehension prompt UI remains deferred. Use manual qualitative follow-up without committing identifiable responses.

Day 3 or Day 7 question:

```text
Could you explain at least one signal from Boot Up to someone else?
```

Response buckets:

- agree
- neutral
- disagree
- no response

Handling:

- record only aggregate counts or anonymized tester IDs
- do not commit names, messages, screenshots, school/employer details, handles, or other identifying details
- do not implement prompt UI
- do not add a survey product surface

## Stop Conditions

Stop controlled exposure and investigate if any of the following occurs:

- public page returns 5xx
- public page exposes raw schema/internal error
- event API fails persistently
- measurement summary fails persistently
- incorrect slate appears
- stale/freshness mislabeling appears
- non-live/unpublished rows appear publicly
- cron accidentally runs
- source/ranking/WITM behavior changes unexpectedly
- tester feedback indicates severe comprehension failure
- privacy issue with tracking or invite handling

## Known Limitations

- Exact tester count, generic channel type, and exact invite send timestamp were not supplied in this prompt; capture those as non-PII Day 1 readback if available.
- Normal Chrome profile may still show stale local state for `/briefing/2026-05-01`; fresh/incognito context loaded the correct May 1 briefing and is the relevant first-tester baseline.
- Day-7 retention cannot be evaluated until 2026-05-09 at the earliest for this Day 0 cohort.
- Event counts include QA/browser monitoring traffic and are not yet a clean tester-only product signal.
- Visible comprehension prompt UI remains deferred; comprehension confidence requires manual qualitative follow-up.
- Strict four-layer depth engagement remains limited by current UI affordances and is reported separately from proxy expansion.

## Explicit Non-Goals

- no new feature
- no new PRD
- no prompt UI
- no public analytics dashboard
- no added sources
- no source governance change
- no ranking threshold change
- no WITM threshold change
- no URL/domain/env/Vercel setting change
- no secrets exposure
- no tester PII committed
- no removal of `newsweb2026@gmail.com` from Production `ADMIN_EMAILS`
- no cron
- no cron re-enable
- no automatic publish
- no `draft_only`
- no pipeline write-mode
- no production publish
- no Signal row mutation
- no direct SQL
- no schema migration
- no Phase 2 architecture
- no personalization
- no measurement-driven ranking

## Validation

Commands to run before PR:

```bash
git diff --check
python3 scripts/validate-feature-system-csv.py
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/controlled-user-exposure-active-day-0-readback --pr-title "Controlled user exposure active Day 0 readback"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/controlled-user-exposure-active-day-0-readback --pr-title "Controlled user exposure active Day 0 readback"
npm run lint
npm run test
npm run build
```

Results:

- `git diff --check` passed.
- `python3 scripts/validate-feature-system-csv.py` passed with existing PRD slug warnings for PRD-32, PRD-37, and PRD-38.
- `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/controlled-user-exposure-active-day-0-readback --pr-title "Controlled user exposure active Day 0 readback"` passed.
- `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/controlled-user-exposure-active-day-0-readback --pr-title "Controlled user exposure active Day 0 readback"` passed.
- `npm install` passed; npm reported 2 dependency audit findings, 1 moderate and 1 high, with no package file changes in this branch.
- `npm run lint` passed.
- Initial `npm run test` hit one timeout in `src/app/dashboard/signals/editorial-review/page.test.tsx`; rerunning the full suite passed.
- Final `npm run test` passed: 78 test files and 591 tests.
- `npm run build` passed.
- Production route probes passed for `/`, `/signals`, `/briefing/2026-05-01`, `/api/cron/fetch-news`, `/api/internal/mvp-measurement/summary?days=7`, and `/dashboard/signals/editorial-review`.
- Authenticated Chrome measurement summary returned `ok:true` with 45 events, 15 visitors, and 20 sessions.
- Fresh/incognito Chrome loaded `/briefing/2026-05-01` correctly.
- Vercel error-log check returned no logs in the checked 30-minute window.

## Exact Next Task

Run Day 1 monitoring on 2026-05-03.

Day 1 should capture:

- non-PII invite count and generic channel, if operator can provide them
- public route health
- authenticated measurement summary counts
- whether any tester opened the product, if known without PII
- any early qualitative confusion or severe comprehension issue

Cron remains a later staged operations task and is not part of controlled exposure Day 0.
