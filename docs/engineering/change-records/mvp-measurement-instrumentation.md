# MVP Measurement Instrumentation

Date: 2026-05-01
Branch: `codex/mvp-measurement-instrumentation`
Readiness label: `ready_for_final_launch_readiness_qa`
Canonical PRD required: `No`

## Effective Change Type

Remediation / product analytics instrumentation.

This is measurement support for the approved Boot Up MVP success criteria. It does not add a new product surface by default, create a new PRD, alter ranking, change source governance, re-enable cron, publish content, run `draft_only`, start Phase 2 architecture, or start personalization.

Object level changed:

- Signal/Card/Surface Placement measurement only.
- `public.signal_posts` remains legacy/runtime storage for published Surface Placement plus Card copy. This change does not create canonical Signal identity or use analytics to change product behavior.

## Source Of Truth

Primary:

- Product Position - MVP Success Criteria:
  - day-7 retention: 40%+ of users return on day 7 without re-engagement prompt
  - depth engagement: 60%+ of sessions include at least one full signal expansion
  - comprehension signal: 70%+ of users in a post-session prompt agree they could explain at least one signal
  - failure threshold: day-7 retention below 25%, or fewer than 40% of users expand at least one signal in first three sessions

Secondary:

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`
- `docs/operations/controlled-cycles/2026-05-01-prd-53-authorized-second-controlled-publish.md`
- `docs/operations/tracker-sync/2026-05-01-prd-53-authorized-second-controlled-publish.md`
- `docs/engineering/change-records/prd-53-minimal-final-slate-composer.md`
- `docs/engineering/change-records/prd-53-editorial-card-controls.md`
- `docs/engineering/change-records/prd-53-seven-row-publish-hardening.md`
- `docs/engineering/change-records/prd-53-minimal-published-slate-audit-history.md`

## Success Criteria Mapping

| MVP question | Implemented signal | Notes |
| --- | --- | --- |
| Are users returning by day 7? | anonymous `visitor_id`, `session_id`, event timestamps, `homepage_view`, `signals_page_view` | Summary helper calculates exact day-7 return based on first event date and a return event seven calendar days later. |
| Are users expanding at least one full signal? | `signal_full_expansion_proxy`, `signal_details_click`, `source_click` | Current UI does not expose a single four-layer per-Signal expansion. The helper reports strict full-expansion events separately from proxy expansion. |
| Can users report that they could explain at least one signal? | event schema accepts `comprehension_prompt_shown` and `comprehension_prompt_answered` | Visible prompt UI is deferred because there is no existing prompt/survey pattern in the repo. |
| Are users treating Boot Up like a briefing rather than a headline feed? | page view, details, expansion proxy, and source-click events by route/surface/rank | Measurement can compare passive page views with deeper Signal/Card interactions. |

## Implemented Events

Stored event names:

- `homepage_view`
- `signals_page_view`
- `signal_card_expand`
- `signal_full_expansion`
- `signal_full_expansion_proxy`
- `signal_details_click`
- `source_click`
- `comprehension_prompt_shown`
- `comprehension_prompt_answered`

`signal_full_expansion_proxy` is used where the current homepage can expand a Card's `Why it matters` section, but does not yet expose the complete four-layer Signal model as one explicit UI action.

## Storage And API

Added additive schema:

- `supabase/migrations/20260501100000_mvp_measurement_events.sql`
- `public.mvp_measurement_events`

Captured fields:

- anonymous first-party visitor id
- anonymous session id
- event name
- server event timestamp
- route/surface
- legacy `signal_post_id`, where a published Surface Placement/Card row id is available
- signal slug/title and rank, where available
- briefing date
- published slate id, where available
- bounded metadata JSON
- authenticated user id only when already safely available from the existing Supabase session

Added event API:

- `POST /api/mvp-measurement/events`

The endpoint validates event names and payload shape, writes through the existing service-role server client, and soft-fails with HTTP 202 if measurement storage is unavailable. Measurement failure must not break reading, ranking, visibility, or navigation.

## Page And Interaction Instrumentation

Homepage `/`:

- emits `homepage_view`
- records briefing date, visible Top Events count, public ranked signal count, Core count, Context count, and whether the rendered read model contains Core + Context
- emits `signal_details_click` for the existing Details link
- emits `signal_full_expansion_proxy` when a user expands homepage `Why it matters`
- emits `source_click` for supporting coverage links

Signals page `/signals`:

- emits `signals_page_view`
- records briefing date, visible signal count, Core count, Context count, and published-state kind
- emits `source_click` for published source links

## Summary Helper

Added:

- `src/lib/mvp-measurement-summary.ts`
- `scripts/mvp-measurement-summary.ts`

The helper summarizes:

- event count by date
- event count by route
- unique visitor count
- unique session count
- day-7 return denominator/numerator/rate
- strict full-expansion session rate
- proxy expansion session rate
- first-three-sessions expansion rate
- comprehension prompt shown/answered/agreement rate, once prompt events exist

## Privacy And Data Minimization

Collected:

- first-party anonymous visitor id in localStorage
- first-party anonymous session id in sessionStorage
- route/surface/event metadata needed for MVP success criteria
- published Signal/Card placement identifiers where available
- authenticated Supabase user id only when the existing session safely provides it

Not collected:

- email addresses
- raw IP addresses
- third-party advertising identifiers
- cross-site tracking IDs
- source secrets, service keys, database passwords, browser cookies, auth headers, or connection strings

Behavior guarantees:

- no personalization
- no behavioral ranking
- no ranking threshold changes
- no WITM threshold changes
- no source changes
- no public visibility changes
- no analytics-driven product behavior

## Deferred Or Limited

- Comprehension prompt UI is not implemented in this change because the repo has no existing post-session survey/prompt pattern. The event schema and summary support are ready, but visible prompt UX requires explicit product approval or PRD coverage.
- Strict "all four layers opened" depth engagement cannot be measured exactly until the UI exposes a discrete four-layer Signal expansion. This PR records the strongest available proxies and reports proxy expansion separately from strict full expansion.
- Production collection requires the additive `mvp_measurement_events` migration to be applied through the normal authorized schema process. The endpoint soft-fails until the table exists.

## What Did Not Change

- no cron
- no publish
- no `draft_only`
- no pipeline write-mode
- no source governance change
- no added sources
- no ranking threshold change
- no WITM threshold change
- no public URL/domain/env/Vercel setting change
- no Phase 2 architecture
- no Phase 3 personalization
- no behavior change based on analytics events
- no removal of `newsweb2026@gmail.com` from Production `ADMIN_EMAILS`

## Validation

Commands run:

```bash
npm install
git diff --check
npm run lint
npm run test
npm run build
python3 scripts/validate-feature-system-csv.py
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/mvp-measurement-instrumentation --pr-title "MVP measurement instrumentation"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/mvp-measurement-instrumentation --pr-title "MVP measurement instrumentation"
PLAYWRIGHT_MANAGED_WEBSERVER=1 npm run test:e2e:chromium
PLAYWRIGHT_MANAGED_WEBSERVER=1 npm run test:e2e:webkit
```

Results:

- `npm install` passed.
- `git diff --check` passed.
- `npm run lint` passed.
- `npm run test` passed: 77 test files, 586 tests.
- `npm run build` passed.
- `python3 scripts/validate-feature-system-csv.py` passed with existing PRD slug warnings for PRD-32, PRD-37, and PRD-38.
- `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/mvp-measurement-instrumentation --pr-title "MVP measurement instrumentation"` passed.
- `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/mvp-measurement-instrumentation --pr-title "MVP measurement instrumentation"` passed.
- `PLAYWRIGHT_MANAGED_WEBSERVER=1 npm run test:e2e:chromium` passed: 33 tests.
- `PLAYWRIGHT_MANAGED_WEBSERVER=1 npm run test:e2e:webkit` passed: 33 tests.

Generated `.next` caches from old worktrees were cleared after local disk pressure caused earlier build/test artifact writes to fail with `ENOSPC`. Only regenerable Next.js build caches were removed; no source, env, Vercel, or git state was altered.

## Next Task

After this PR is reviewed, deployed, and the additive measurement schema is applied through the normal authorized process, run final launch-readiness QA. Cron remains last and separately authorized.
