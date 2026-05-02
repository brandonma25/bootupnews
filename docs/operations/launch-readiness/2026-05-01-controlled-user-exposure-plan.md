# Controlled User Exposure Plan

Date prepared: 2026-05-02
Slate date: 2026-05-01
Branch: `codex/controlled-user-exposure-plan`
Readiness label: `ready_for_controlled_user_exposure_execution`

## Effective Change Type

Operations validation / controlled launch planning.

This packet defines how to expose Boot Up to a small first tester group while preserving scope discipline, measurement integrity, and product trust. It does not create a new feature, create a new PRD, change product scope, implement a new prompt UI, implement a public analytics dashboard, add sources, change source/ranking/WITM thresholds, change URL/domain/env/Vercel settings, run cron, run `draft_only`, run pipeline write-mode, publish, mutate Signal rows, start Phase 2 architecture, start personalization, or use measurement events to change ranking.

Object levels affected:

- operational exposure of existing public Surface Placements
- measurement interpretation for published Signal/Card interactions
- controlled tester communication

Object levels not changed:

- Article
- Story Cluster
- conceptual Signal identity
- public Card copy
- public Surface Placement / visibility

## Source Of Truth

Primary:

- Product Position - MVP target user, MVP product experience, and MVP success criteria
  - target user: ambitious early-stage knowledge builders
  - public experience: Top 5 Core Signals + Next 2 Context Signals
  - success criteria: day-7 retention, depth engagement, comprehension confidence

Secondary:

- `docs/operations/controlled-cycles/2026-05-01-final-launch-readiness-qa-rerun.md`
- `docs/operations/controlled-cycles/2026-05-01-mvp-measurement-summary-readiness.md`
- `docs/engineering/change-records/mvp-measurement-instrumentation.md`
- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

## Readiness State From PR #179

PR #179 production audit result:

```text
ready_for_controlled_user_exposure
```

Production-readiness evidence from the post-merge audit:

- PR #179 merged into `main`.
- Production deploy completed and was ready.
- GitHub production verification passed.
- Public `/`, `/signals`, and `/briefing/2026-05-01` returned HTTP 200.
- Admin route was protected and operational.
- Internal measurement summary endpoint returned authenticated aggregate data with `ok:true`.
- Measurement summary included visible events, visitors, sessions, and expected event names:
  - `homepage_view`
  - `signals_page_view`
  - `signal_full_expansion_proxy`
  - `signal_details_click`
  - `source_click`
- Cron remained protected and was not run.
- No Phase 2 architecture or personalization work started.

## Exposure Scope

Initial group:

- 5-15 testers.

Target profile:

- ambitious early-stage knowledge builders
- students at competitive universities
- early-career professionals in consulting, banking, tech, policy, or similar fields
- graduate students in business, law, or policy
- ambitious self-improvers already trying to stay informed

Exposure window:

- Minimum 7 days.
- Day 1 begins when the invite is sent and testers first receive the production URL.
- Earliest day-7 return signal is available after the seventh calendar day from a tester's first recorded visit.

Purpose:

- validate product behavior under real use
- confirm measurement capture under real use
- gather early comprehension and qualitative feedback
- learn whether testers treat Boot Up like a briefing rather than a headline feed

Not the purpose:

- claim product-market fit
- broad launch
- growth optimization
- automate publishing
- test Phase 2 architecture
- test personalization
- re-enable cron

## Controlled Exposure Checklist

### Before Invites

- Confirm production `/` returns HTTP 200.
- Confirm `/signals` returns HTTP 200.
- Confirm `/briefing/2026-05-01` returns HTTP 200.
- Confirm `/api/cron/fetch-news` returns HTTP 401 without auth.
- Confirm `/api/internal/mvp-measurement/summary?days=7` returns `ok:true` with authenticated admin access.
- Record the exposure start date and time.
- Prepare a 5-15 tester list with name, target profile category, invite date, and expected observation window.
- Confirm no tester is being asked to debug, inspect internal systems, or perform unnatural tasks.
- Confirm no claims are made that the product is validated, personalized, comprehensive, or fully launched.

### Tester Selection

- Prefer testers who already feel information overload or try to keep up with business, tech, policy, or markets.
- Include a mix of students, early-career professionals, and graduate students if possible.
- Avoid testers who are only doing a favor and would not naturally open a morning briefing.
- Avoid broad social posting or unbounded sharing in this first window.
- Keep the initial cohort small enough that a single operator can monitor health and follow up manually.

### Invite Message

- Send one concise invite per tester.
- Provide the production URL.
- Ask them to use it like a morning briefing for one week.
- Ask them to open details or sources only when genuinely interested.
- Do not describe internal metrics, PRs, schemas, admin workflow, or event tracking mechanics.
- Do not tell testers the "right" number of times to return.
- Do not tell testers which Signals are expected to be interesting.

### What Testers Should Do

- Open Boot Up when they would normally check news or briefings.
- Scan the Top 5 Core Signals first.
- Use `/signals` if they want the full 5 Core + 2 Context slate.
- Expand or open details for Signals they want to understand better.
- Click sources only when they naturally want supporting context.
- Send short qualitative feedback at the end of the week, or earlier if something is confusing or broken.

### What Not To Tell Testers

- Do not tell them the retention target.
- Do not tell them the depth-engagement target.
- Do not tell them that expansion behavior is being measured as a success criterion.
- Do not instruct them to click every Signal.
- Do not ask them to prove the product works.
- Do not claim the product is validated.
- Do not promise personalization, full news coverage, real-time freshness, or automation.
- Do not frame this as a broad public launch.

### Measurement Window

- Start: when the first invite is sent.
- Minimum end: 7 full calendar days after first tester exposure.
- Recommended review point: morning after day 7, after the daily summary read.
- Optional extension: days 8-14 if day-7 behavior is sparse or the cohort starts asynchronously.

### Daily Monitoring Routine

- Run public route checks.
- Check measurement summary.
- Review Vercel logs for 5xx or measurement errors.
- Confirm cron remains protected.
- Confirm admin route remains protected.
- Record daily counts in an operator note.
- Do not change ranking, sources, WITM thresholds, or public Surface Placement based on early event data.

### Owner / Operator Responsibilities

- Keep the tester list bounded.
- Send invites and optional day-3/day-7 follow-up messages manually.
- Run daily monitoring.
- Record incidents and stop conditions.
- Preserve tester trust by avoiding overclaiming.
- Keep qualitative feedback separate from internal logs and credentials.
- Decide whether the window passes, remains inconclusive, or must stop.

## Tester Invite Draft

```text
Hey - I am testing an early MVP called Boot Up.

It is a short daily intelligence briefing: five core signals, plus a couple of extra context items if you want to go deeper.

Would you try it for a week? The ideal use is simple: open it the way you might open a morning briefing, scan what matters, and expand anything you actually want to understand better.

It is still early, so I am mostly looking for whether it feels useful, clear, and worth coming back to. No need to use it in any artificial way. If something feels confusing, stale, too shallow, or surprisingly useful, I would love to hear that.

Link: [production URL]
```

## Measurement Plan

### Day-7 Retention

Question:

- Are testers returning by day 7 without a re-engagement prompt?

Events that count as a visit:

- `homepage_view`
- `signals_page_view`

Denominator:

- unique anonymous visitors whose first recorded visit occurs during the controlled exposure start window.

Numerator:

- denominator visitors with at least one qualifying visit event on calendar day 7 after their first recorded visit.

Earliest signal:

- after seven elapsed calendar days from each tester's first recorded visit.

Interpretation:

- No day-7 data before seven elapsed days is "not enough elapsed data yet," not failure.
- The Product Position target remains 40%+ day-7 retention.
- The Product Position failure threshold remains below 25% day-7 retention.

### Depth Engagement

Question:

- Are testers moving from scan to deeper understanding?

Events:

- `signal_full_expansion_proxy`
- `signal_details_click`
- `source_click`

Session-level expansion:

- a session counts as depth-engaged if it includes at least one `signal_full_expansion_proxy` or `signal_details_click`.
- `source_click` is supporting evidence of deeper engagement but should be interpreted separately because it can reflect source curiosity rather than in-product understanding.

First-three-session expansion check:

- denominator: visitors with at least three recorded sessions, or the available subset during early controlled exposure if fewer than three sessions exist.
- numerator: visitors who record at least one qualifying depth event in their first three sessions.

Interpretation:

- The Product Position depth target remains 60%+ of sessions with at least one full Signal expansion.
- The current UI uses a depth proxy rather than an exact four-layer Signal expansion.
- The Product Position failure threshold remains fewer than 40% of users expanding at least one Signal in their first three sessions.

### Comprehension Confidence

Question:

- Can testers say they could explain at least one Signal to someone else?

Current instrumentation:

- event support exists for `comprehension_prompt_shown` and `comprehension_prompt_answered`.
- visible comprehension prompt UI is not implemented.

Temporary manual qualitative capture:

- after the 7-day window, ask a short manual follow-up:

```text
After using Boot Up, could you explain at least one of the Signals to someone else?

Reply with one:
- agree
- neutral
- disagree

Optional: which Signal, and why?
```

Interpretation:

- Manual replies are qualitative evidence, not the productized comprehension prompt metric.
- A productized visible prompt UI requires separate approval or PRD coverage.
- The Product Position target remains 70%+ agreement among users who answer a post-session prompt.

## Monitoring Runbook

Daily checks:

| Check | Expected result |
| --- | --- |
| `/` | HTTP 200 |
| `/signals` | HTTP 200 |
| `/briefing/2026-05-01` | HTTP 200 |
| Public content safety | no raw schema, missing-column, or measurement errors visible |
| Public visibility | no non-live, unpublished, held, rejected, rewrite-requested, Depth, or rank-8 rows visible |
| Event API | measurement events continue storing through normal user interaction |
| Summary endpoint | authenticated `/api/internal/mvp-measurement/summary?days=7` returns `ok:true` |
| Event counts | homepage/signals/depth/source events increase when testers use the product |
| Admin route | remains protected and operational |
| Cron endpoint | unauthenticated `/api/cron/fetch-news` remains HTTP 401 |
| Vercel logs | no persistent 5xx, schema, or measurement-summary failures |
| Scope | no source, ranking, WITM, visibility, cron, publish, Phase 2, or personalization changes |

Suggested daily operator record:

```text
Date:
Production routes:
Cron 401:
Summary ok:true:
Total events:
Homepage views:
/signals views:
Depth proxy/details events:
Source clicks:
Unique visitors:
Unique sessions:
5xx/errors:
Tester feedback:
Stop condition triggered:
Operator notes:
```

## Stop Conditions

Stop controlled exposure and hold further invites if any of the following occur:

- public `/`, `/signals`, or `/briefing/2026-05-01` returns persistent 5xx
- public page exposes raw schema/internal error text
- public page exposes measurement-storage or measurement-summary errors
- event API fails persistently or stops storing events
- measurement summary endpoint fails persistently
- incorrect slate appears publicly
- stale or freshness-misleading copy appears
- non-live, unpublished, held, rejected, rewrite-requested, Depth, or rank-8 rows appear publicly
- cron accidentally runs or no longer returns HTTP 401 without auth
- source, ranking, or WITM behavior changes unexpectedly
- admin route becomes publicly exposed or unsafe
- Vercel logs show persistent production 5xx
- tester feedback indicates severe comprehension failure, such as multiple testers saying the briefing is actively misleading or impossible to understand

If a stop condition triggers:

- stop sending invites
- capture the time, route, visible symptom, and affected tester count
- do not patch directly in production
- do not run cron, publish, `draft_only`, pipeline write-mode, or direct SQL
- open a scoped remediation branch from latest `main`
- document whether measurement from the interrupted window is still usable

## Success And Learning Criteria

### Operational Pass

The controlled exposure window passes operationally if:

- production public routes remain stable
- cron remains protected
- admin route remains protected
- measurement event writes continue
- measurement summary stays readable with authenticated admin access
- no public internal errors or invalid rows appear
- no forbidden scope work occurs

### Early Product Signal

Early product signal is directional, not a product-market-fit claim.

Positive early signal:

- testers voluntarily return during the 7-day window
- at least some sessions include details/depth/source interaction
- testers can name at least one Signal they understood or found useful
- testers describe Boot Up as a briefing or orientation aid, not just another feed

Inconclusive signal:

- tester count is too small
- testers do not start on the same day
- several testers say they forgot to use it but do not reject the product
- day-7 data has not elapsed yet
- usage occurs but depth interactions are sparse

Qualitative follow-up trigger:

- depth events are low but testers still report usefulness
- retention is present but comprehension is weak
- testers use the product at times other than morning
- testers ask for more context, more sources, or different topics
- testers say titles are interesting but the "why it matters" layer is not clear

Broader exposure blockers:

- day-7 retention below the Product Position failure threshold after enough data exists
- fewer than 40% of users expand at least one Signal in their first three sessions after enough data exists
- repeated comprehension-confidence failures
- operational instability
- measurement unreadability
- public trust issues around stale/freshness labeling
- requests for productized prompt UI, personalization, or new surfaces that would require separate approval

Long-term MVP criteria remain:

| Criterion | Target / threshold |
| --- | --- |
| Day-7 retention target | 40%+ of users return on day 7 without re-engagement prompt |
| Depth engagement target | 60%+ of sessions include at least one full Signal expansion or documented MVP proxy |
| Comprehension confidence target | 70%+ of users in a post-session prompt agree they could explain at least one Signal |
| Failure threshold | day-7 retention below 25%, or fewer than 40% of users expand at least one Signal in first three sessions |

## Known Limitations

- The visible comprehension prompt UI is not implemented.
- Manual comprehension follow-up is qualitative until a productized prompt is separately approved.
- Strict four-layer expansion is proxied by current details/depth interactions.
- Day-7 retention cannot be judged until enough elapsed time passes.
- A 5-15 tester cohort can identify operational and directional product signal, but cannot validate broad demand.
- The currently published slate is May 1, 2026; operators must avoid false freshness if no newer controlled publish occurs.
- Cron remains disabled/protected and is not part of this exposure step.

## Explicit Non-Goals

- no new feature
- no new PRD
- no product-scope change
- no new prompt UI
- no public analytics dashboard
- no added sources
- no source-governance change
- no ranking-threshold change
- no WITM-threshold change
- no URL/domain/env/Vercel setting change
- no secret exposure
- no removal of `newsweb2026@gmail.com` from Production `ADMIN_EMAILS`
- no cron run
- no cron re-enable
- no automatic publish
- no `draft_only`
- no pipeline write-mode
- no production publish
- no Signal row mutation
- no Phase 2 architecture
- no personalization
- no measurement-driven ranking

## Exact Next Task

Execute the controlled user exposure window with 5-15 testers:

1. Finalize the tester list.
2. Send the invite.
3. Record the exposure start time.
4. Run the daily monitoring routine for at least 7 days.
5. Capture manual comprehension feedback after the window.
6. Summarize results before deciding whether to broaden exposure, run a remediation pass, or keep testing.

## Validation

Commands run:

```bash
git diff --check
python3 scripts/validate-feature-system-csv.py
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/controlled-user-exposure-plan --pr-title "Controlled user exposure plan"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/controlled-user-exposure-plan --pr-title "Controlled user exposure plan"
npm run lint
```

Results:

- `git diff --check` passed.
- `python3 scripts/validate-feature-system-csv.py` passed with existing PRD slug warnings for PRD-32, PRD-37, and PRD-38.
- `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/controlled-user-exposure-plan --pr-title "Controlled user exposure plan"` passed.
- `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/controlled-user-exposure-plan --pr-title "Controlled user exposure plan"` passed.
- `npm run lint` could not start because this fresh worktree does not have installed npm dependencies; `eslint` was not found.

Commands not run:

- `npm run test` was not run because npm dependencies are not installed in this fresh worktree.
- `npm run build` was not run because npm dependencies are not installed in this fresh worktree.
- Browser QA was not run because this is a docs-only planning change with no product code, route, UI, auth, SSR, or deployment behavior change.

Readiness label:

```text
ready_for_controlled_user_exposure_execution
```
