# Controlled User Exposure Active Day 0

Date prepared: 2026-05-02
Baseline captured: 2026-05-02 14:10:07 CST
Branch: `codex/controlled-user-exposure-active-day-0`
Readiness label: `controlled_user_exposure_day_0_ready`

## Effective Change Type

Operations validation / controlled launch execution.

This packet moves Boot Up from "tester list missing" to a Day 0 execution-ready state with production monitoring and anonymized tester tracking. It does not send tester outreach, commit tester PII, create a product surface, create a PRD, run cron, publish, run `draft_only`, run pipeline write-mode, mutate Signal rows, run direct SQL, apply schema changes, change sources, change ranking or WITM thresholds, start Phase 2 architecture, start personalization, or use measurement events to change ranking.

## Source Of Truth

Primary:

- Product Position - MVP target user, product experience, and MVP success criteria
  - target user: ambitious early-stage knowledge builders
  - public experience: Top 5 Core Signals + Next 2 Context Signals
  - success criteria: day-7 retention, depth engagement, comprehension confidence

Secondary:

- `docs/operations/launch-readiness/2026-05-02-controlled-user-exposure-day-0.md`
- `docs/operations/tracker-sync/2026-05-02-controlled-user-exposure-day-0.md`
- `docs/operations/launch-readiness/2026-05-01-controlled-user-exposure-plan.md`
- `docs/operations/launch-readiness/2026-05-01-mvp-measurement-summary-readiness.md`
- `docs/engineering/change-records/mvp-measurement-instrumentation.md`
- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

## Readiness State

Merged readiness chain:

- PR #179 established `ready_for_controlled_user_exposure`.
- PR #181 and PR #182 completed controlled exposure planning and production verification follow-up.
- PR #183 created the Day 0 planning packet and recorded `controlled_user_exposure_blocked_tester_list_missing`.
- The tester list is now finalized outside the repo.
- No tester names, emails, phone numbers, exact school/employer identifiers, social handles, or screenshots are committed.

Current execution state:

- Production public routes are healthy.
- Measurement summary is readable with authenticated admin access.
- Cron remains protected.
- Tester outreach was not sent by Codex because no exact recipients, exact approved send text, or communication tool authorization were supplied in this run.
- Operator invite status is recorded as pending operator send/readback.

## Production Baseline

Production URL:

- `https://daily-intelligence-aggregator-ybs9.vercel.app`

Current branch and commit:

- branch: `codex/controlled-user-exposure-active-day-0`
- commit: `c3fab6fc3d0e1a0c0e9ba8d9d0ac5896f2ce6322`
- commit summary: `docs: prepare controlled user exposure day 0 (#183)`

Deployment:

- Vercel deployment ID: `dpl_34BjkTfAie6R5QQ1tYEXDWhgcDr5`
- target: production
- status: Ready
- deployment URL: `https://bootup-d9qcqdq2j-brandonma25s-projects.vercel.app`
- production alias: `https://daily-intelligence-aggregator-ybs9.vercel.app`

Production verification:

- GitHub Production Verification passed for `c3fab6fc3d0e1a0c0e9ba8d9d0ac5896f2ce6322`.
- `node scripts/prod-check.js https://daily-intelligence-aggregator-ybs9.vercel.app` passed for `/` and `/dashboard`.

Route checks:

| Check | Result |
| --- | --- |
| `/` | HTTP 200 |
| `/signals` | HTTP 200 |
| `/briefing/2026-05-01` | HTTP 200 by direct fetch and fresh-user/incognito browser context |
| `/api/cron/fetch-news` without auth | HTTP 401 |
| `/api/internal/mvp-measurement/summary?days=7` without auth | HTTP 401 |
| `/dashboard/signals/editorial-review` without auth | rendered safely with sign-in/admin-gated state; publish controls not exposed |

Public safety:

- no public route returned 5xx
- no raw schema-preflight error observed
- no missing-column text observed
- no measurement-storage error text observed
- no unpublished/non-live row exposure observed
- no accidental public visibility issue observed
- normal Chrome profile may still hold stale local state for `/briefing/2026-05-01`; fresh-user/incognito context loads the correct briefing and is the relevant first-tester baseline

Vercel logs:

- error logs for deployment `dpl_34BjkTfAie6R5QQ1tYEXDWhgcDr5` over the checked 30-minute window: no logs found
- HTTP 500 logs for deployment `dpl_34BjkTfAie6R5QQ1tYEXDWhgcDr5` over the checked 30-minute window: no logs found
- measurement-summary log query showed expected aggregate-read behavior:
  - authenticated `GET /api/internal/mvp-measurement/summary`: HTTP 200
  - unauthenticated `GET /api/internal/mvp-measurement/summary`: HTTP 401
  - measurement event writes visible as HTTP 202 during QA/browser interaction

## Anonymized Tester Scope

The tester list is finalized outside the repo. The repo records only anonymized operating slots.

Planned cohort:

- 5-15 testers

Target profile:

- ambitious early-stage knowledge builders
- students at competitive universities
- early-career professionals in consulting, banking, tech, policy, or adjacent fields
- graduate students in business, law, or policy
- ambitious self-improvers already trying to stay informed

Anonymized tracker:

| Tester ID | Profile category | Invite status | Start date | Day-3 check date | Day-7 check date | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | Operator-held target profile | Operator invite pending | TBD | TBD | TBD | No PII in repo |
| T02 | Operator-held target profile | Operator invite pending | TBD | TBD | TBD | No PII in repo |
| T03 | Operator-held target profile | Operator invite pending | TBD | TBD | TBD | No PII in repo |
| T04 | Operator-held target profile | Operator invite pending | TBD | TBD | TBD | No PII in repo |
| T05 | Operator-held target profile | Operator invite pending | TBD | TBD | TBD | No PII in repo |
| T06-T15 | Optional cohort expansion | Operator invite pending | TBD | TBD | TBD | Use only if cohort remains within 5-15 testers |

Tester PII handling:

- no names committed
- no emails committed
- no phone numbers committed
- no exact social handles committed
- no school or employer identifiers committed when individually identifying
- no private communication screenshots committed

## Invite Status

Codex did not send invites.

Reason:

- no exact recipients were supplied to Codex
- no exact communication tool authorization was supplied
- no operator readback was supplied confirming number sent, send timestamp, or generic channel

Current invite status:

- tester list finalized outside repo
- invite copy ready
- operator invite send/readback pending

If the operator has already sent invites outside Codex, record only:

- send date/time
- number sent
- generic channel, such as manual DM, manual email, or text message
- no recipients, names, phone numbers, emails, handles, school identifiers, employer identifiers, or screenshots

## Invite Copy

Do not send these messages from automation without exact recipient, exact message, and tool authorization.

Short text / DM:

```text
Hey - I am testing an early MVP called Boot Up.

It is a short intelligence briefing: five core signals, plus two extra context items if you want to go deeper.

Would you try it for a week? Use it like a morning briefing: scan what matters, and expand anything you actually want to understand better.

It is early, so I am mainly looking for whether it feels useful, clear, and worth coming back to. No need to use it in any artificial way.

Link: https://daily-intelligence-aggregator-ybs9.vercel.app
```

Longer email:

```text
Subject: Quick ask - try an early briefing MVP for a week?

Hey [Name],

I am testing an early MVP called Boot Up.

It is meant to be a short intelligence briefing: five core signals, plus two extra context items if you want more depth. The goal is not to be a full news feed or real-time wire. It is meant to help you quickly understand what matters and why.

Would you try it for one week? The ideal use is simple: open it the way you might open a morning briefing, scan the main signals, and expand anything you actually want to understand better.

It is still early, so I am mostly looking for whether it feels useful, clear, and worth returning to. Please use it naturally. If something feels confusing, stale, too shallow, or surprisingly useful, I would appreciate hearing that.

Link: https://daily-intelligence-aggregator-ybs9.vercel.app

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

## Measurement Baseline

Unauthenticated internal summary access remains protected:

- `/api/internal/mvp-measurement/summary?days=7` returned HTTP 401 without auth.

Authenticated summary readback was available through the existing admin browser session:

- `ok:true`
- window: 7 days
- since: `2026-04-25T06:07:55.101Z`
- event count: 42
- unique visitors: 14
- unique sessions: 19

Event count by date:

| Date | Events |
| --- | ---: |
| 2026-05-02 | 42 |

Event count by event name:

| Event | Count |
| --- | ---: |
| `homepage_view` | 23 |
| `signals_page_view` | 13 |
| `signal_full_expansion_proxy` | 4 |
| `signal_details_click` | 1 |
| `source_click` | 1 |

Event count by route:

| Route | Count |
| --- | ---: |
| `/` | 26 |
| `/signals` | 14 |
| `/briefing/2026-05-01` | 2 |

Measurement interpretation:

| Metric | Baseline |
| --- | --- |
| Day-7 retention | denominator 14, numerator 0, rate 0; not enough elapsed controlled-exposure data yet |
| Depth engagement proxy | 4 proxy-engaged sessions / 19 sessions, rate 0.2105263158 |
| Strict full expansion | 0 strict full-expansion sessions / 19 sessions |
| First-three-session expansion | 4 visitors with proxy expansion / 14 visitors, rate 0.2857142857 |
| Comprehension prompt | 0 shown, 0 answered; visible prompt UI remains deferred |

Pre-invite / post-invite status:

- prior Day 0 planning packet baseline: 38 events, 13 visitors, 17 sessions
- active Day 0 monitoring baseline: 42 events, 14 visitors, 19 sessions
- the increase was observed during QA/browser monitoring before confirmed operator invite readback
- post-invite baseline is not available until the operator records invite send/readback

Day-7 retention cannot be evaluated until seven elapsed calendar days after tester first visits.

## Day 0 Monitoring Result

| Check | Result |
| --- | --- |
| `/` | HTTP 200; May 1 briefing visible |
| `/signals` | HTTP 200; Published Signals visible with 7-signal structure |
| `/briefing/2026-05-01` | HTTP 200 by direct fetch and fresh-user/incognito browser; normal Chrome profile may show stale local unavailable state |
| Event API / storage | stored events visible in authenticated aggregate summary; measurement event writes observed as HTTP 202 logs |
| Internal summary endpoint | `ok:true` when authenticated; HTTP 401 unauthenticated |
| Event counts | visible by event name, route, visitor, and session |
| Public errors | no raw schema, missing-column, or measurement errors visible |
| Cron | protected; unauthenticated `/api/cron/fetch-news` returns HTTP 401 |
| Admin route | protected/admin-gated; unauthenticated browser fetch renders sign-in state and does not expose publish controls |
| Vercel logs | no error logs or HTTP 500 logs found in checked 30-minute window |
| Public visibility | no accidental candidate/non-live visibility observed |

## Manual Comprehension Follow-Up Plan

Visible comprehension prompt UI remains deferred. Use manual qualitative capture only.

Day 3 or Day 7 question:

```text
Could you explain at least one signal from Boot Up to someone else?
```

Response buckets:

- agree
- neutral
- disagree
- no response

Rules:

- do not implement prompt UI
- do not add a survey product surface
- do not commit identifiable responses
- record only aggregate/manual non-PII counts in future packets

## Stop Conditions

Stop controlled exposure and hold further invites if any of the following occur:

- public page returns persistent 5xx
- public page exposes raw schema/internal error text
- public page exposes measurement-storage or measurement-summary errors
- event API fails persistently
- measurement summary fails persistently
- incorrect slate appears
- stale/freshness mislabeling appears
- non-live/unpublished rows appear publicly
- cron accidentally runs or stops returning HTTP 401 without auth
- source/ranking/WITM behavior changes unexpectedly
- admin/internal route becomes publicly exposed or unsafe
- tester feedback indicates severe comprehension failure
- privacy issue appears in invite handling, tester tracking, or measurement interpretation

If a stop condition triggers:

- stop sending invites
- capture the time, route, visible symptom, and affected tester count
- do not patch directly in production
- do not run cron, publish, `draft_only`, pipeline write-mode, direct SQL, or schema repair
- open a scoped remediation branch from latest `main`
- document whether measurement from the interrupted window is still usable

## Known Limitations

- Exact tester count, profile mapping, and invite send status are operator-held and not committed.
- Codex did not send invites in this run.
- Day-7 retention cannot be judged until seven elapsed calendar days after first tester visit.
- Visible comprehension prompt UI is not implemented.
- Manual comprehension follow-up is qualitative until a productized prompt is separately approved.
- Strict four-layer Signal expansion is still proxied by current details/depth interactions where needed.
- Local summary helper requires server-side Supabase configuration and cannot read production rows from this worktree without secrets.
- Normal Chrome profile may retain stale local state for `/briefing/2026-05-01`; fresh-user/incognito context loads the briefing correctly.
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

Operator action is still required before this becomes confirmed active exposure:

1. Send invites manually from the finalized external tester list, or provide Codex exact recipients, exact message text, and explicit communication tool authorization.
2. Record only anonymized send readback: send date/time, number sent, and generic channel.
3. After first invite send, run Day 1 monitoring against production routes, authenticated summary, Vercel logs, and non-PII feedback.
4. Run Day 3 qualitative comprehension follow-up.
5. Run Day 7 retention/comprehension readback before deciding whether to broaden exposure, remediate, or keep testing.

## Validation

Commands run:

```bash
git diff --check
python3 scripts/validate-feature-system-csv.py
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/controlled-user-exposure-active-day-0 --pr-title "Controlled user exposure active Day 0"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/controlled-user-exposure-active-day-0 --pr-title "Controlled user exposure active Day 0"
npm run lint
npm run test
npm run build
```

Additional validation evidence captured before packet creation:

- `git diff --check` passed.
- `python3 scripts/validate-feature-system-csv.py` passed with existing PRD slug warnings for PRD-32, PRD-37, and PRD-38.
- `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/controlled-user-exposure-active-day-0 --pr-title "Controlled user exposure active Day 0"` passed.
- `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/controlled-user-exposure-active-day-0 --pr-title "Controlled user exposure active Day 0"` passed.
- `npm install` passed; npm reported 2 dependency audit findings, 1 moderate and 1 high, with no package file changes in this branch.
- `npm run lint` passed.
- `npm run test` passed: 78 test files and 591 tests.
- `npm run build` passed.
- GitHub Production Verification passed for `c3fab6fc3d0e1a0c0e9ba8d9d0ac5896f2ce6322`.
- `node scripts/prod-check.js https://daily-intelligence-aggregator-ybs9.vercel.app` passed.
- Production route probes for `/`, `/signals`, `/briefing/2026-05-01`, `/api/cron/fetch-news`, `/api/internal/mvp-measurement/summary?days=7`, and `/dashboard/signals/editorial-review` matched expected public/protected behavior.
- Authenticated browser summary readback returned `ok:true` with aggregate production event counts.
- Vercel error-log and HTTP 500-log checks returned no logs in the checked 30-minute window.

Readiness label:

```text
controlled_user_exposure_day_0_ready
```
