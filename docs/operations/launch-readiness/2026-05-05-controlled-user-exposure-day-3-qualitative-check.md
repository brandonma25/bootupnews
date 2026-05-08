# Controlled User Exposure Day 3 Qualitative Check

Date prepared: 2026-05-05
Baseline captured: 2026-05-02 16:19:32 CST
Branch: `codex/controlled-user-exposure-day-3-qualitative-check`
Readiness label: `controlled_user_exposure_day_3_no_tester_readback_yet`

## Effective Change Type

Operations validation / controlled launch monitoring.

This packet records the scheduled Day 3 qualitative/comprehension monitoring checkpoint for the first controlled Boot Up exposure cohort. It does not add a feature, create a PRD, implement a visible prompt, add a public analytics dashboard, run cron, publish, run `draft_only`, run pipeline write-mode, mutate Signal rows, run direct SQL, apply schema changes, change source governance, change ranking or WITM thresholds, start Phase 2 architecture, start personalization, implement a stale-profile fix, or use measurement events to change ranking.

## Source Of Truth

Primary:

- Product Position - MVP target user, product experience, and MVP success criteria
  - target user: ambitious early-stage knowledge builders
  - public experience: Top 5 Core Signals + Next 2 Context Signals
  - success criteria: day-7 retention, depth engagement, comprehension confidence

Secondary:

- `docs/operations/launch-readiness/2026-05-03-controlled-user-exposure-day-1-monitoring.md`
- `docs/operations/tracker-sync/2026-05-03-controlled-user-exposure-day-1-monitoring.md`
- `docs/operations/launch-readiness/2026-05-02-controlled-user-exposure-active-day-0-readback.md`
- `docs/operations/launch-readiness/2026-05-02-controlled-user-exposure-active-day-0.md`
- `docs/operations/launch-readiness/2026-05-02-controlled-user-exposure-day-0.md`
- `docs/engineering/change-records/mvp-measurement-instrumentation.md`
- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

## Production Baseline

Production URL:

- `https://daily-intelligence-aggregator-ybs9.vercel.app`

Current branch and commit:

- branch: `codex/controlled-user-exposure-day-3-qualitative-check`
- commit: `0a13d83add876d09e727967ebd174e73a8e188c5`
- commit summary: `docs: record controlled exposure day 1 monitoring`

PR #186 state:

- PR #186 is merged.
- Merge commit: `0a13d83add876d09e727967ebd174e73a8e188c5`
- Merged at: `2026-05-02T08:18:00Z`

Deployment:

- Vercel deployment ID: `dpl_AMHhySqrfCEyEw2YEagx6Gsene3W`
- target: production
- status: Ready
- deployment URL: `https://bootup-bpp47bhus-brandonma25s-projects.vercel.app`
- production alias: `https://daily-intelligence-aggregator-ybs9.vercel.app`
- deployment created: 2026-05-02 16:18:03 CST

Route checks:

| Check | Result |
| --- | --- |
| `/` | HTTP 200 |
| `/signals` | HTTP 200 |
| `/briefing/2026-05-01` by direct production fetch | HTTP 200 |
| `/briefing/2026-05-01` in fresh/incognito Chrome context | loaded the May 1 briefing correctly |
| `/briefing/2026-05-01` in normal signed-in Chrome profile | still showed `This briefing is not available` |
| `/briefing/2026-05-01` after hard refresh in normal signed-in Chrome profile | still showed `This briefing is not available` |
| `/api/cron/fetch-news` without auth | HTTP 401 |
| `/api/internal/mvp-measurement/summary?days=7` without auth | HTTP 401 |
| `/dashboard/signals/editorial-review` without auth | rendered safely with sign-in/admin-gated state |

Public route content checks:

- homepage showed Friday, May 1, 2026 and `Showing the most recently published briefing`
- homepage showed 5 visible ranked Top Events
- homepage showed 5 visible `Why it matters` blocks
- `/signals` showed `Published Signals`, `7 signals`, `Top 5 Core Signals`, and `Next 2 Context Signals`
- `/briefing/2026-05-01` showed `Daily Executive Briefing`, Friday, May 1, 2026, 5 `What happened` blocks, and 5 `Why it matters` blocks
- no direct public fetch contained `This briefing is not available`
- no direct public fetch contained `0 signals`
- no direct public fetch contained `measurement_insert_failed`
- no direct public fetch contained `schema-preflight`
- no direct public fetch contained `raw schema`
- no direct public fetch contained `missing column`

Vercel log checks:

- error logs for deployment `dpl_AMHhySqrfCEyEw2YEagx6Gsene3W` over the checked one-hour window: no logs found
- HTTP 500 logs for deployment `dpl_AMHhySqrfCEyEw2YEagx6Gsene3W` over the checked one-hour window: no logs found
- measurement-summary error query for deployment `dpl_AMHhySqrfCEyEw2YEagx6Gsene3W` over the checked one-hour window: no logs found

## Measurement Summary Readback

Unauthenticated internal summary access remains protected:

- `/api/internal/mvp-measurement/summary?days=7` returned HTTP 401 without auth.

Authenticated summary readback was available through the existing admin browser session:

- `ok:true`
- window: 7 days
- since: `2026-04-25T08:22:20.515Z`
- event count: 55
- unique visitors: 17
- unique sessions: 23

Event count by date:

| Date | Events |
| --- | ---: |
| 2026-05-02 | 55 |

Event count by event name:

| Event | Count |
| --- | ---: |
| `homepage_view` | 32 |
| `signals_page_view` | 17 |
| `signal_full_expansion_proxy` | 4 |
| `signal_details_click` | 1 |
| `source_click` | 1 |

Event count by route:

| Route | Events |
| --- | ---: |
| `/` | 35 |
| `/signals` | 18 |
| `/briefing/2026-05-01` | 2 |

Change from Day 1 readback:

| Metric | Day 1 | Day 3 | Delta |
| --- | ---: | ---: | ---: |
| total events | 54 | 55 | +1 |
| unique visitors | 16 | 17 | +1 |
| unique sessions | 22 | 23 | +1 |
| `homepage_view` | 31 | 32 | +1 |
| `signals_page_view` | 17 | 17 | 0 |
| `signal_full_expansion_proxy` | 4 | 4 | 0 |
| `signal_details_click` | 1 | 1 | 0 |
| `source_click` | 1 | 1 | 0 |

Measurement interpretation:

- event counts increased slightly from Day 1
- Day 3 counts remain directional operational telemetry, not product validation
- current counts may include QA/browser monitoring traffic and cannot yet be attributed to testers
- event names in the summary remain recognized and expected
- no malformed event attempts were observed in the summary readback

Day-7 retention:

- denominator: 17
- numerator: 0
- rate: 0
- interpretation: not enough elapsed time; absence of Day-7 returns at the Day 3 checkpoint is not a product failure

Depth engagement:

- strict full-expansion sessions: 0
- proxy expansion sessions: 4
- denominator: 23
- strict rate: 0
- proxy rate: 0.17391304347826086

First-three-sessions expansion:

- denominator: 17
- numerator: 4
- rate: 0.23529411764705882

Comprehension:

- prompt shown count: 0
- answered count: 0
- agree count: 0
- agreement rate: null
- interpretation: visible comprehension prompt UI remains deferred; manual qualitative follow-up remains required

## Tester Status

No new non-PII tester readback was supplied in this prompt.

Known from prior packets:

- operator confirmed invites were manually sent outside the repo
- Codex did not send messages
- no communication tool was used by Codex
- no tester PII was committed

Day 3 fields still unavailable:

| Field | Status |
| --- | --- |
| number invited | not provided |
| number known to have opened product | not provided |
| number with any response | not provided |
| generic channel type | not provided |

This packet does not infer tester engagement from missing operator readback. Measurement counts are visible, but they are not attributed to named or identifiable testers.

## Day 3 Comprehension Readback

Manual question:

```text
Could you explain at least one signal from Boot Up to someone else?
```

Allowed response buckets:

- agree
- neutral
- disagree
- no response

Current readback:

- no Day 3 qualitative readback was supplied
- no anonymized response buckets were supplied
- no non-identifying qualitative themes were supplied
- comprehension confidence is pending and must not be marked passed or failed

If the operator collects Day 3 or Day 7 qualitative feedback, commit only anonymized IDs and non-identifying buckets/themes. Do not commit names, emails, phone numbers, school or employer identifiers, social handles, screenshots, or direct quotes that identify testers.

## Public UX Verification

Homepage:

- returned HTTP 200
- rendered the May 1 briefing as the most recently published briefing
- rendered safely without raw schema/internal errors
- did not show measurement errors
- did not show missing-column names
- did not show false freshness
- did not expose unpublished/non-live rows in the direct public readback
- rendered category tabs safely

`/signals`:

- returned HTTP 200
- showed `Published Signals`
- showed `7 signals`
- showed `Top 5 Core Signals`
- showed `Next 2 Context Signals`
- showed explicit `Why it matters` reasoning
- did not show `0 signals`
- did not show measurement errors
- did not show missing-column names
- did not expose unpublished/non-live rows in the direct public readback

`/briefing/2026-05-01`:

- returned HTTP 200 by direct production fetch
- loaded correctly in fresh/incognito Chrome context
- showed `Daily Executive Briefing`
- showed Friday, May 1, 2026
- showed 5 `What happened` blocks
- showed 5 `Why it matters` blocks
- did not show raw schema/internal errors
- did not show measurement errors
- did not show missing-column names

## Stale-Profile Issue Status

Residual issue tracked from PR #185 and PR #186:

- normal signed-in Chrome profile still shows `This briefing is not available` on `/briefing/2026-05-01`
- hard refresh did not clear the stale unavailable state
- fresh/incognito Chrome context loads the correct May 1 briefing
- direct production fetch returns HTTP 200 and the correct May 1 briefing
- no tester reports were supplied that reproduce this issue
- current evidence still suggests the issue is isolated to one known local signed-in browser profile

Decision:

- keep the stale signed-in profile behavior as a monitored caveat
- do not mark Day 3 blocked unless a tester or fresh-user context reproduces it
- if any tester report matches this behavior, stop controlled exposure monitoring and open a scoped bug-fix prompt before Day 7

## Cron And Admin Safety

Cron and automation:

- `/api/cron/fetch-news` returned HTTP 401 without auth
- cron was not run
- no scheduled automatic public publish was enabled by this task
- no publish or pipeline action occurred

Admin/editorial route:

- `/dashboard/signals/editorial-review` without auth rendered a sign-in/admin-gated state
- publish controls were not exposed to unauthenticated users
- no admin state was mutated

Data safety:

- no Signal rows were mutated
- no direct SQL was run
- no schema migration was run
- no `draft_only` or pipeline write-mode was run

## Stop-Condition Review

| Stop condition | Status |
| --- | --- |
| public page returns 5xx | not met |
| public page exposes raw schema/internal error | not met |
| persistent event API failure | not met |
| persistent summary failure | not met |
| incorrect slate appears in fresh/direct public context | not met |
| false freshness appears | not met |
| non-live/unpublished row visible | not observed in direct public readback |
| cron accidentally runs | not met |
| severe tester comprehension issue | no tester readback yet |
| privacy issue with tester handling | not met; no PII committed |
| stale-profile issue reproduced by tester/fresh context | not met |

Result:

- no stop condition is met
- production and measurement remain operationally healthy
- Day 3 cannot be called a qualitative/comprehension pass because no non-PII tester or qualitative readback was supplied yet

## Known Limitations

- This packet is scheduled for the Day 3 checkpoint date, 2026-05-05, while the execution environment captured evidence on 2026-05-02 16:19:32 CST.
- Day-7 retention cannot be evaluated until the seven-day window elapses.
- Day 3 measurement counts are directional operational telemetry, not product validation.
- Current counts may include QA/browser monitoring traffic.
- Visible comprehension prompt UI remains deferred; comprehension confidence requires manual qualitative follow-up.
- Full four-layer expansion remains represented by proxy events unless the product later exposes a strict four-layer expansion action.
- Exact tester count, generic channel, known opens, response count, and qualitative response buckets were not provided.
- Normal signed-in Chrome profile still shows a stale unavailable briefing state, while fresh/incognito and direct fetch remain healthy.

## Validation

Run from branch `codex/controlled-user-exposure-day-3-qualitative-check`:

```bash
git diff --check
python3 scripts/validate-feature-system-csv.py
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/controlled-user-exposure-day-3-qualitative-check --pr-title "Controlled user exposure Day 3 qualitative check"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/controlled-user-exposure-day-3-qualitative-check --pr-title "Controlled user exposure Day 3 qualitative check"
npm run lint
npm run test
npm run build
```

Results:

- `git diff --check` passed.
- `python3 scripts/validate-feature-system-csv.py` passed with existing PRD slug warnings for PRD-32, PRD-37, and PRD-38.
- `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/controlled-user-exposure-day-3-qualitative-check --pr-title "Controlled user exposure Day 3 qualitative check"` passed.
- `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/controlled-user-exposure-day-3-qualitative-check --pr-title "Controlled user exposure Day 3 qualitative check"` passed.
- `npm run lint` could not start because `eslint` was unavailable in the worktree.
- `npm run test` could not start because `vitest` was unavailable in the worktree.
- `npm run build` could not start because `next` was unavailable in the worktree.
- `node_modules` was not present in this fresh worktree.

## Exact Next Task

Proceed to Day 7 retention/comprehension readback on 2026-05-09, while continuing daily public-route and measurement-summary monitoring. If the stale `/briefing/2026-05-01` unavailable state is reported by any tester or reproduced in a fresh-user context, stop and run a scoped bug-fix prompt before Day 7.

Do not run cron, publish, `draft_only`, pipeline write-mode, production publish, direct SQL, schema migration, signal row mutation, Phase 2 architecture, personalization, public analytics dashboard work, visible comprehension prompt UI work, or stale-profile bug-fix work during this monitoring window unless separately authorized.
