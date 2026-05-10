# Controlled User Exposure Day 1 Monitoring

Date prepared: 2026-05-03
Baseline captured: 2026-05-02 15:37:48 CST
Branch: `codex/controlled-user-exposure-day-1-monitoring`
Readiness label: `controlled_user_exposure_day_1_no_tester_readback_yet`

## Effective Change Type

Operations validation / controlled launch monitoring.

This packet records Day 1 monitoring for the first controlled Boot Up exposure cohort. It does not add a feature, create a PRD, implement a visible prompt, add a public analytics dashboard, run cron, publish, run `draft_only`, run pipeline write-mode, mutate Signal rows, run direct SQL, apply schema changes, change source governance, change ranking or WITM thresholds, start Phase 2 architecture, start personalization, or use measurement events to change ranking.

## Source Of Truth

Primary:

- Product Position - MVP target user, product experience, and MVP success criteria
  - target user: ambitious early-stage knowledge builders
  - public experience: Top 5 Core Signals + Next 2 Context Signals
  - success criteria: day-7 retention, depth engagement, comprehension confidence

Secondary:

- `docs/operations/launch-readiness/2026-05-02-controlled-user-exposure-active-day-0-readback.md`
- `docs/operations/tracker-sync/2026-05-02-controlled-user-exposure-active-day-0-readback.md`
- `docs/operations/launch-readiness/2026-05-02-controlled-user-exposure-active-day-0.md`
- `docs/operations/launch-readiness/2026-05-02-controlled-user-exposure-day-0.md`
- `docs/engineering/change-records/mvp-measurement-instrumentation.md`
- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

## Production Baseline

Production URL:

- `https://bootupnews.vercel.app`

Current branch and commit:

- branch: `codex/controlled-user-exposure-day-1-monitoring`
- commit: `0fb0b727bbf72453e13a2afac343f19fe4897483`
- commit summary: `docs: record active controlled exposure day 0 readback`

PR #185 state:

- PR #185 is merged.
- Merge commit: `0fb0b727bbf72453e13a2afac343f19fe4897483`
- Merged at: `2026-05-02T07:06:24Z`

Deployment:

- Vercel deployment ID: `dpl_E1kJvoeJu7mTMG39PAd7RC8K3YPt`
- target: production
- status: Ready
- deployment URL: `https://bootup-dyk4n8a4t-brandonma25s-projects.vercel.app`
- production alias: `https://bootupnews.vercel.app`

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

- error logs for deployment `dpl_E1kJvoeJu7mTMG39PAd7RC8K3YPt` over the checked one-hour window: no logs found
- HTTP 500 logs for deployment `dpl_E1kJvoeJu7mTMG39PAd7RC8K3YPt` over the checked one-hour window: no logs found
- measurement-summary error query for deployment `dpl_E1kJvoeJu7mTMG39PAd7RC8K3YPt` over the checked one-hour window: no logs found

## Measurement Summary Readback

Unauthenticated internal summary access remains protected:

- `/api/internal/mvp-measurement/summary?days=7` returned HTTP 401 without auth.

Authenticated summary readback was available through the existing admin browser session:

- `ok:true`
- window: 7 days
- since: `2026-04-25T07:37:48.419Z`
- event count: 54
- unique visitors: 16
- unique sessions: 22

Event count by date:

| Date | Events |
| --- | ---: |
| 2026-05-02 | 54 |

Event count by event name:

| Event | Count |
| --- | ---: |
| `homepage_view` | 31 |
| `signals_page_view` | 17 |
| `signal_full_expansion_proxy` | 4 |
| `signal_details_click` | 1 |
| `source_click` | 1 |

Event count by route:

| Route | Events |
| --- | ---: |
| `/` | 34 |
| `/signals` | 18 |
| `/briefing/2026-05-01` | 2 |

Change from Day 0 readback:

| Metric | Day 0 | Day 1 | Delta |
| --- | ---: | ---: | ---: |
| total events | 45 | 54 | +9 |
| unique visitors | 15 | 16 | +1 |
| unique sessions | 20 | 22 | +2 |
| `homepage_view` | 24 | 31 | +7 |
| `signals_page_view` | 15 | 17 | +2 |
| `signal_full_expansion_proxy` | 4 | 4 | 0 |
| `signal_details_click` | 1 | 1 | 0 |
| `source_click` | 1 | 1 | 0 |

Measurement interpretation:

- event counts are increasing after controlled exposure became active
- Day 1 counts are operational monitoring, not product validation
- current counts may include QA/browser monitoring traffic and cannot yet be attributed to testers
- no malformed event attempts were observed in the summary readback

Day-7 retention:

- denominator: 16
- numerator: 0
- rate: 0
- interpretation: not enough elapsed time; absence of Day-7 returns on Day 1 is not a product failure

Depth engagement:

- strict full-expansion sessions: 0
- proxy expansion sessions: 4
- denominator: 22
- strict rate: 0
- proxy rate: 0.18181818181818182

First-three-sessions expansion:

- denominator: 16
- numerator: 4
- rate: 0.25

Comprehension:

- prompt shown count: 0
- answered count: 0
- agree count: 0
- agreement rate: null
- interpretation: visible comprehension prompt UI remains deferred; manual qualitative follow-up remains required

## Tester Status

No new non-PII tester readback was supplied in this prompt.

Known from Day 0:

- operator confirmed invites were manually sent outside the repo
- Codex did not send messages
- no communication tool was used by Codex
- no tester PII was committed

Day 1 fields still unavailable:

| Field | Status |
| --- | --- |
| number invited | not provided |
| number known to have opened product | not provided |
| number with any response | not provided |
| generic channel type | not provided |

This packet does not infer tester engagement from missing operator readback. Measurement counts are visible, but they are not attributed to named or identifiable testers.

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

Residual issue tracked from PR #185:

- normal signed-in Chrome profile still shows `This briefing is not available` on `/briefing/2026-05-01`
- hard refresh did not clear the stale unavailable state
- fresh/incognito Chrome context loads the correct May 1 briefing
- direct production fetch returns HTTP 200 and the correct May 1 briefing
- no tester reports were supplied that reproduce this issue
- current evidence still suggests the issue is isolated to one known local signed-in browser profile

Decision:

- keep the stale signed-in profile behavior as a monitored caveat
- do not mark Day 1 blocked unless a tester or fresh-user context reproduces it
- if any tester report matches this behavior, stop controlled exposure monitoring and open a scoped bug-fix prompt before Day 3

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

Result:

- no stop condition is met
- production and measurement remain operationally healthy
- Day 1 cannot be called a product-learning pass because no non-PII tester readback was supplied yet

## Known Limitations

- Day-7 retention cannot be evaluated until the seven-day window elapses.
- Day 1 measurement counts are directional operational telemetry, not product validation.
- Current counts may include QA/browser monitoring traffic.
- Visible comprehension prompt UI remains deferred; comprehension confidence requires manual qualitative follow-up.
- Full four-layer expansion remains represented by proxy events unless the product later exposes a strict four-layer expansion action.
- Exact tester count, generic channel, known opens, and response count were not provided.
- Normal signed-in Chrome profile still shows a stale unavailable briefing state, while fresh/incognito and direct fetch remain healthy.
- Local app dependencies were not installed in this fresh worktree, so `npm run lint`, `npm run test`, and `npm run build` could not start; docs/governance validation did run.

## Validation

Run from branch `codex/controlled-user-exposure-day-1-monitoring`:

```bash
git diff --check
python3 scripts/validate-feature-system-csv.py
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/controlled-user-exposure-day-1-monitoring --pr-title "Controlled user exposure Day 1 monitoring"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/controlled-user-exposure-day-1-monitoring --pr-title "Controlled user exposure Day 1 monitoring"
npm run lint
npm run test
npm run build
```

Results:

- `git diff --check` passed.
- `python3 scripts/validate-feature-system-csv.py` passed with existing PRD slug warnings for PRD-32, PRD-37, and PRD-38.
- `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/controlled-user-exposure-day-1-monitoring --pr-title "Controlled user exposure Day 1 monitoring"` passed.
- `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/controlled-user-exposure-day-1-monitoring --pr-title "Controlled user exposure Day 1 monitoring"` passed.
- `npm run lint` could not start because `eslint` was unavailable in the worktree.
- `npm run test` could not start because `vitest` was unavailable in the worktree.
- `npm run build` could not start because `next` was unavailable in the worktree.
- `node_modules` was not present in this fresh worktree.

## Exact Next Task

Proceed to Day 3 qualitative/comprehension check on 2026-05-05, while continuing daily public-route and measurement-summary monitoring. If the stale `/briefing/2026-05-01` unavailable state is reported by any tester or reproduced in a fresh-user context, stop and run a scoped bug-fix prompt before Day 3.

Do not run cron, publish, `draft_only`, pipeline write-mode, production publish, direct SQL, schema migration, signal row mutation, Phase 2 architecture, personalization, public analytics dashboard work, or visible comprehension prompt UI work during the monitoring window.
