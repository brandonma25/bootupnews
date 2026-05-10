# Controlled User Exposure Day 0

Date prepared: 2026-05-02
Baseline captured: 2026-05-02 13:23:34 CST
Branch: `codex/controlled-user-exposure-execution-day-0`
Readiness label: `controlled_user_exposure_blocked_tester_list_missing`

## Effective Change Type

Operations validation / controlled launch execution.

This packet moves Boot Up from launch-readiness planning into Day 0 controlled exposure preparation and monitoring. It does not send tester outreach, commit tester PII, create a new product surface, create a new PRD, run cron, publish, run `draft_only`, run pipeline write-mode, mutate Signal rows, run direct SQL, apply schema changes, change sources, change ranking or WITM thresholds, start Phase 2 architecture, start personalization, or use measurement events to change ranking.

Object levels affected:

- operational exposure of existing public Surface Placements
- aggregate measurement interpretation for published Signal/Card interactions
- controlled tester communication planning

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

- `docs/operations/launch-readiness/2026-05-01-controlled-user-exposure-plan.md`
- `docs/operations/tracker-sync/2026-05-01-controlled-user-exposure-plan.md`
- `docs/operations/controlled-cycles/2026-05-01-final-launch-readiness-qa-rerun.md`
- `docs/operations/controlled-cycles/2026-05-01-mvp-measurement-summary-readiness.md`
- `docs/engineering/change-records/mvp-measurement-instrumentation.md`
- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

## Readiness State

Known merged baseline:

- PR #179 established `ready_for_controlled_user_exposure`.
- PR #181 merged at `cc8e3140c8f511ea3acd591bf613e4d96e9a2c50`.
- PR #182 merged at `bf42e88c6dfd7743688540ebedf9bac6bb535bac`.
- Production deployment `dpl_AWqcyHeHAa4ie3E43dBZuiLx8P4b` is ready.
- GitHub Production Verification passed for `bf42e88c6dfd7743688540ebedf9bac6bb535bac`.
- Fresh-user browser context loaded the May 1 briefing correctly after PR #181/#182.

## Production Baseline

Production URL:

- `https://bootupnews.vercel.app`

Current branch and commit:

- branch: `codex/controlled-user-exposure-execution-day-0`
- commit: `bf42e88c6dfd7743688540ebedf9bac6bb535bac`

Deployment:

- Vercel deployment ID: `dpl_AWqcyHeHAa4ie3E43dBZuiLx8P4b`
- target: production
- status: Ready
- production alias: `https://bootupnews.vercel.app`

Production route checks:

| Check | Result |
| --- | --- |
| `/` | HTTP 200 |
| `/signals` | HTTP 200 |
| `/briefing/2026-05-01` | HTTP 200 |
| `/api/cron/fetch-news` without auth | HTTP 401 |
| `/api/internal/mvp-measurement/summary?days=7` without auth | HTTP 401 |
| `node scripts/prod-check.js https://bootupnews.vercel.app` | PASS: `/` and `/dashboard` returned HTTP 200 |

Public safety:

- no public route returned 5xx
- no raw schema-preflight error observed
- no missing-column text observed
- no measurement-storage error text observed in browser-facing QA
- `/briefing/2026-05-01` loaded correctly in a clean browser context
- existing normal Chrome profile may retain stale local state for the detail route; fresh-user/incognito context is the baseline for first-tester behavior

Vercel logs:

- `vercel logs dpl_AWqcyHeHAa4ie3E43dBZuiLx8P4b --level error --since 30m` returned no logs.
- `vercel logs dpl_AWqcyHeHAa4ie3E43dBZuiLx8P4b --status-code 500 --since 30m` returned no logs.

## Measurement Baseline

Unauthenticated internal summary access remains protected:

- `/api/internal/mvp-measurement/summary?days=7` returned HTTP 401 without auth.

Authenticated summary readback was available through the existing admin browser session:

- `ok:true`
- window: 7 days
- since: `2026-04-25T05:23:13.725Z`
- event count: 38
- unique visitors: 13
- unique sessions: 17

Event count by date:

| Date | Events |
| --- | ---: |
| 2026-05-02 | 38 |

Event count by event name:

| Event | Count |
| --- | ---: |
| `homepage_view` | 21 |
| `signals_page_view` | 11 |
| `signal_full_expansion_proxy` | 4 |
| `signal_details_click` | 1 |
| `source_click` | 1 |

Event count by route:

| Route | Count |
| --- | ---: |
| `/` | 24 |
| `/signals` | 12 |
| `/briefing/2026-05-01` | 2 |

Current measurement interpretation:

| Metric | Baseline |
| --- | --- |
| Day-7 retention | denominator 13, numerator 0, rate 0; not enough elapsed controlled-exposure data yet |
| Depth engagement proxy | 4 proxy-engaged sessions / 17 sessions, rate 0.2352941176 |
| Strict full expansion | 0 strict full-expansion sessions / 17 sessions |
| First-three-session expansion | 4 visitors with proxy expansion / 13 visitors, rate 0.3076923077 |
| Comprehension prompt | 0 shown, 0 answered; visible prompt UI remains deferred |

No synthetic measurement event was sent during this Day 0 packet. The measurement baseline above reflects existing stored production events visible through the authenticated aggregate summary endpoint.

Local summary helper status:

- `npx tsx scripts/mvp-measurement-summary.ts --days 7` reached the expected server-config boundary: `Supabase server configuration is required to summarize MVP measurement events.`
- The safe production read path for this run was the authenticated internal summary endpoint in the browser, not local secret exposure.

## Tester Scope

Initial target:

- 5-15 testers

Target profile:

- ambitious early-stage knowledge builders
- students at competitive universities
- early-career professionals in consulting, banking, tech, policy, or adjacent fields
- graduate students in business, law, or policy
- ambitious self-improvers already trying to stay informed

Tester list status:

- no tester list was provided to Codex for this Day 0 run
- no tester names, emails, or private identifiers are committed
- outreach is not sent from this branch

Anonymized tester tracker placeholder:

| Tester ID | Profile category | Invite status | Start date | Day-7 check date | Notes |
| --- | --- | --- | --- | --- | --- |
| T01 | TBD | Not sent | TBD | TBD | Placeholder only |
| T02 | TBD | Not sent | TBD | TBD | Placeholder only |
| T03 | TBD | Not sent | TBD | TBD | Placeholder only |
| T04 | TBD | Not sent | TBD | TBD | Placeholder only |
| T05 | TBD | Not sent | TBD | TBD | Placeholder only |
| T06-T15 | Optional expansion | Not sent | TBD | TBD | Use only if cohort remains within 5-15 testers |

## Invite Copy

Do not send these messages from automation without explicit operator authorization.

Short text / DM:

```text
Hey - I am testing an early MVP called Boot Up.

It is a short intelligence briefing: five core signals, plus two extra context items if you want to go deeper.

Would you try it for a week? Use it like a morning briefing: scan what matters, and expand anything you actually want to understand better.

It is early, so I am mainly looking for whether it feels useful, clear, and worth coming back to. No need to use it in any artificial way.

Link: https://bootupnews.vercel.app
```

Longer email:

```text
Subject: Quick ask - try an early briefing MVP for a week?

Hey [Name],

I am testing an early MVP called Boot Up.

It is meant to be a short intelligence briefing: five core signals, plus two extra context items if you want more depth. The goal is not to be a full news feed or real-time wire. It is meant to help you quickly understand what matters and why.

Would you try it for one week? The ideal use is simple: open it the way you might open a morning briefing, scan the main signals, and expand anything you actually want to understand better.

It is still early, so I am mostly looking for whether it feels useful, clear, and worth returning to. Please use it naturally. If something feels confusing, stale, too shallow, or surprisingly useful, I would appreciate hearing that.

Link: https://bootupnews.vercel.app

Thanks.
```

Optional Day 3 / Day 4 reminder:

```text
Quick reminder: if you have a minute this week, open Boot Up the way you would a morning briefing and expand anything you actually want to understand better.

No need to force usage. Natural reactions are more useful than artificial testing.
```

Day 7 follow-up:

```text
Thanks for trying Boot Up this week.

Two quick questions:

1. Did it feel worth returning to as a short briefing?
2. After using it, could you explain at least one signal from the briefing to someone else?

For the second one, reply with one:
- agree
- neutral
- disagree
- no response

Optional: which signal stood out, and why?
```

## Measurement Mapping

### Day-7 Retention

Visit events:

- `homepage_view`
- `signals_page_view`

Denominator:

- unique anonymous visitors whose first recorded visit occurs during the controlled exposure start window.

Numerator:

- denominator visitors with at least one qualifying visit event on calendar day 7 after first recorded visit.

Earliest check date:

- seven elapsed calendar days after each tester's first recorded visit.

Returning anonymous visitors:

- detected through the first-party anonymous visitor identifier used by MVP measurement instrumentation.

Limitations:

- day-7 retention before seven elapsed days is "not enough elapsed data yet," not failure
- asynchronous tester starts require per-tester or per-first-visit date grouping

### Depth Engagement

Depth proxy events:

- `signal_full_expansion_proxy`
- `signal_details_click`

Supporting event:

- `source_click`

Session-level expansion:

- a session counts as depth-engaged when it includes at least one `signal_full_expansion_proxy` or `signal_details_click`

First-three-session expansion:

- denominator: visitors with recorded sessions during controlled exposure
- numerator: visitors with at least one qualifying depth event in their first three sessions

Limitations:

- current UI may still proxy full four-layer expansion if the UI does not expose every layer as a separately measurable action
- `source_click` should be reviewed separately because it can signal source curiosity rather than in-product understanding

### Comprehension Confidence

Current status:

- visible comprehension prompt UI remains deferred
- productized prompt UI requires separate approval or PRD coverage if needed

Temporary manual capture:

```text
After using Boot Up, could you explain at least one signal from today to someone else?

Reply with one:
- agree
- neutral
- disagree
- no response
```

Interpretation:

- manual replies are qualitative evidence
- manual replies do not replace the productized prompt metric
- Product Position target remains 70%+ agreement among users who answer a post-session prompt

## Day 0 Monitoring Runbook

Daily checks:

| Check | Expected result |
| --- | --- |
| `/` | HTTP 200 |
| `/signals` | HTTP 200 |
| `/briefing/2026-05-01` | HTTP 200 |
| Public content safety | no raw schema, missing-column, or measurement errors visible |
| Event storage | stored production events remain visible in authenticated summary |
| Summary endpoint | authenticated `/api/internal/mvp-measurement/summary?days=7` returns `ok:true` |
| Event counts | homepage/signals/depth/source counts move only through real user interaction |
| Cron endpoint | unauthenticated `/api/cron/fetch-news` remains HTTP 401 |
| Admin/internal routes | protected from unauthenticated access |
| Vercel logs | no persistent 5xx or measurement-summary failures |
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
- event API fails persistently or stored events disappear from summary
- measurement summary endpoint fails persistently
- incorrect slate appears publicly
- stale or freshness-misleading copy appears
- non-live, unpublished, held, rejected, rewrite-requested, Depth, or rank-8 rows appear publicly
- cron accidentally runs or no longer returns HTTP 401 without auth
- source, ranking, or WITM behavior changes unexpectedly
- admin/internal route becomes publicly exposed or unsafe
- Vercel logs show persistent production 5xx
- tester feedback indicates severe comprehension failure
- privacy issue appears in invite handling, tester tracking, or measurement interpretation

If a stop condition triggers:

- stop sending invites
- capture the time, route, visible symptom, and affected tester count
- do not patch directly in production
- do not run cron, publish, `draft_only`, pipeline write-mode, direct SQL, or schema repair
- open a scoped remediation branch from latest `main`
- document whether measurement from the interrupted window is still usable

## Success And Learning Criteria

Operational pass:

- production public routes remain stable
- cron remains protected
- admin/internal routes remain protected
- measurement event writes continue through real user interaction
- measurement summary remains readable with authenticated admin access
- no public internal errors or invalid rows appear
- no forbidden scope work occurs

Early positive signal:

- testers voluntarily return during the 7-day window
- at least some sessions include details/depth/source interaction
- testers can name at least one Signal they understood or found useful
- testers describe Boot Up as a briefing or orientation aid, not another feed

Inconclusive signal:

- tester count is too small
- tester starts are too asynchronous
- several testers forget to use it but do not reject it
- day-7 data has not elapsed yet
- usage occurs but depth interactions are sparse

Negative signal:

- testers do not return
- depth events remain low after enough usage
- testers report that the briefing is confusing, stale, misleading, or not worth returning to
- comprehension replies skew neutral/disagree after enough responses

Qualitative follow-up triggers:

- depth events are low but testers still report usefulness
- retention is present but comprehension is weak
- testers use the product at times other than morning
- testers ask for more context, more sources, or different topics
- testers say the titles are interesting but the "why it matters" layer is not clear

Broader exposure blockers:

- day-7 retention below 25% after enough elapsed data exists
- fewer than 40% of users expand at least one Signal in their first three sessions after enough data exists
- repeated comprehension-confidence failures
- operational instability
- measurement unreadability
- public trust issues around stale/freshness labeling
- requests for productized prompt UI, personalization, or new surfaces that require separate approval

Long-term MVP criteria:

| Criterion | Target / threshold |
| --- | --- |
| Day-7 retention target | 40%+ of users return on day 7 without re-engagement prompt |
| Depth engagement target | 60%+ of sessions include at least one full Signal expansion or documented MVP proxy |
| Comprehension confidence target | 70%+ of users in a post-session prompt agree they could explain at least one Signal |
| Failure threshold | day-7 retention below 25%, or fewer than 40% of users expand at least one Signal in first three sessions |

Do not claim the MVP is validated on Day 0.

## Execution Log

| Field | Day 0 value |
| --- | --- |
| Exposure start date/time | Not started; tester list not provided |
| Planned group size | 5-15 testers |
| Actually invited | 0 |
| Invites sent by operator | No |
| Tester PII committed | No |
| Measurement baseline before invites | 38 events, 13 visitors, 17 sessions |
| Measurement baseline after invites | Not available; invites not sent |
| Public route status | `/`, `/signals`, and `/briefing/2026-05-01` returned HTTP 200 |
| Event storage status | Stored events visible in authenticated summary |
| Summary status | `ok:true` in authenticated browser session; unauthenticated access returns HTTP 401 |
| Cron status | Protected; unauthenticated endpoint returns HTTP 401 |
| Vercel error status | no error logs or HTTP 500 logs found in checked 30-minute window |
| Known limitation | normal Chrome profile may hold stale detail-route state; fresh/incognito context loads correctly |
| Next monitoring date | Day 1 after operator sends first invite |

## Known Limitations

- No tester list was available to Codex, so no anonymized real cohort was logged.
- No outreach was sent; this branch only prepares the execution packet.
- Day-7 retention cannot be judged until seven elapsed calendar days after first tester visit.
- Visible comprehension prompt UI is not implemented.
- Manual comprehension follow-up is qualitative until a productized prompt is separately approved.
- Strict four-layer Signal expansion is still proxied by current details/depth interactions where needed.
- Local summary helper requires server-side Supabase configuration and cannot read production rows from this worktree without secrets.
- The normal Chrome profile may retain stale local state for `/briefing/2026-05-01`; fresh-user context loads the briefing correctly.
- Cron remains disabled/protected and is not part of this exposure step.

## Explicit Non-Goals

- no new feature
- no new PRD
- no prompt UI
- no public analytics dashboard
- no source additions
- no source-governance changes
- no ranking-threshold changes
- no WITM-threshold changes
- no URL/domain/env/Vercel setting changes
- no secret exposure
- no tester PII committed
- no removal of `newsweb2026@gmail.com` from Production `ADMIN_EMAILS`
- no cron run
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

## Exact Next Task

Operator action is required before controlled exposure can become active:

1. Finalize the 5-15 tester list outside the repo.
2. Assign anonymized IDs `T01` through `T15` in the operator tracker.
3. Send the invite manually or explicitly authorize a communication tool and exact recipients.
4. Record the first invite timestamp as the exposure start.
5. Run the Day 1 monitoring routine after first tester exposure.
6. Continue Day 3 / Day 7 monitoring before deciding whether to broaden exposure, remediate, or keep testing.

## Validation

Commands run:

```bash
git diff --check
python3 scripts/validate-feature-system-csv.py
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/controlled-user-exposure-execution-day-0 --pr-title "Controlled user exposure Day 0"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/controlled-user-exposure-execution-day-0 --pr-title "Controlled user exposure Day 0"
npm run lint
npm run test
npm run build
```

Results:

- `git diff --check` passed.
- `python3 scripts/validate-feature-system-csv.py` passed with existing PRD slug warnings for PRD-32, PRD-37, and PRD-38.
- `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/controlled-user-exposure-execution-day-0 --pr-title "Controlled user exposure Day 0"` passed.
- `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/controlled-user-exposure-execution-day-0 --pr-title "Controlled user exposure Day 0"` passed.
- `npm run lint` passed.
- `npm run test` passed: 78 test files and 591 tests.
- `npm run build` passed.

Additional validation and evidence:

- `node scripts/prod-check.js https://bootupnews.vercel.app` passed for `/` and `/dashboard`.
- Production route probes for `/`, `/signals`, `/briefing/2026-05-01`, `/api/cron/fetch-news`, and `/api/internal/mvp-measurement/summary?days=7` matched expected status codes.
- Authenticated browser summary readback returned `ok:true` with aggregate production event counts.
- Vercel error-log and HTTP 500-log checks for deployment `dpl_AWqcyHeHAa4ie3E43dBZuiLx8P4b` returned no logs in the checked 30-minute window.

Readiness label:

```text
controlled_user_exposure_blocked_tester_list_missing
```
