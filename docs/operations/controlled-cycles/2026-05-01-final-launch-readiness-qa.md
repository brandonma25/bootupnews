# Final Launch-Readiness QA

Date: 2026-05-01
Branch: `codex/final-launch-readiness-qa`
Readiness label: `launch_readiness_blocked_measurement_instrumentation`

## Effective Change Type

Operations validation / launch-readiness QA.

This packet records final Boot Up MVP launch-readiness validation after the supported PRD-53 controlled publish and MVP measurement instrumentation merge. It does not implement a new feature, create a new PRD, alter product scope, run cron, run `draft_only`, run pipeline write-mode, publish, run direct SQL row surgery, change source/ranking/WITM thresholds, start Phase 2 architecture, start personalization, or add a user-facing comprehension prompt.

Object level validated:

- public Surface Placement rendering for the May 1, 2026 published slate
- public Card/depth affordances
- first-party measurement event wiring
- admin route protection
- cron protection
- published-slate audit readiness, limited by unavailable direct production database readback in this QA worktree

## Source Of Truth

Primary:

- Product Position - MVP product experience and success criteria
- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

Secondary:

- `docs/engineering/change-records/mvp-measurement-instrumentation.md`
- `docs/operations/tracker-sync/2026-05-01-mvp-measurement-instrumentation.md`
- `docs/operations/controlled-cycles/2026-05-01-prd-53-authorized-second-controlled-publish.md`
- `docs/operations/tracker-sync/2026-05-01-prd-53-authorized-second-controlled-publish.md`
- `docs/engineering/change-records/prd-53-minimal-final-slate-composer.md`
- `docs/engineering/change-records/prd-53-editorial-card-controls.md`
- `docs/engineering/change-records/prd-53-seven-row-publish-hardening.md`
- `docs/engineering/change-records/prd-53-minimal-published-slate-audit-history.md`

## Production Deploy Checked

| Field | Result |
| --- | --- |
| Production URL checked | `https://bootupnews.vercel.app` |
| Merge commit checked | `bde841ca941940665e62fe1a368d883e85e7f035` |
| Vercel deployment ID | `dpl_51jU2mfosJsksFLHAw1pn9McNsTd` |
| Production deployment URL | `https://bootup-69yreqc91-brandonma25s-projects.vercel.app` |
| Vercel target | Production |
| Vercel status | Ready |
| GitHub production verification | Passed for merge commit `bde841c` |

PR #175 was merged before this QA run. The production deployment for the merged commit reached Ready and the GitHub Production Verification workflow completed successfully.

## Commands Run

Workspace, deployment, and production checks:

```bash
pwd
git branch --show-current
git status --short --branch
git worktree list
gh pr merge 175 --merge --delete-branch
gh pr view 175 --json number,state,mergedAt,mergeCommit,url
git fetch origin main
vercel inspect https://bootupnews.vercel.app --no-color
gh run view 25209406044 --json status,conclusion,jobs
node scripts/prod-check.js https://bootupnews.vercel.app
```

Production route, content, browser, and measurement probes:

```bash
curl -sS -o /tmp/bootup-home.html -w "%{http_code}\n" https://bootupnews.vercel.app/
curl -sS -o /tmp/bootup-signals.html -w "%{http_code}\n" https://bootupnews.vercel.app/signals
curl -sS -o /tmp/bootup-admin.html -w "%{http_code}\n" https://bootupnews.vercel.app/dashboard/signals/editorial-review
curl -sS -o /tmp/bootup-cron.json -w "%{http_code}\n" https://bootupnews.vercel.app/api/cron/fetch-news
node <production-content-marker-check>
node <production-browser-qa-script>
curl -sS -X POST https://bootupnews.vercel.app/api/mvp-measurement/events \
  -H "content-type: application/json" \
  --data '<bounded QA homepage_view payload without secrets>'
npx tsx scripts/mvp-measurement-summary.ts --days 1
supabase db push --dry-run --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-final-launch-readiness-qa
```

Notes:

- Measurement payloads used synthetic QA visitor/session identifiers only.
- No secrets, cookies, auth headers, database URLs, service-role credentials, or production connection strings were printed or committed.
- `supabase db push --dry-run --linked` failed because this QA worktree does not have a linked Supabase project ref or production database environment. No schema migration or direct SQL was run.

## Baseline Production Capture

| Check | Result |
| --- | --- |
| Homepage `/` | HTTP 200 |
| `/signals` | HTTP 200 |
| `/dashboard/signals/editorial-review` unauthenticated check | HTTP 200 with admin sign-in gate |
| `/api/cron/fetch-news` unauthenticated check | HTTP 401 unauthorized |
| Latest public briefing date | Friday, May 1 |
| Public signal count | 7 on `/signals` |
| Homepage visible Core count | 5 |
| Latest published-slate audit record | Not directly reread in production DB from this worktree; PR #174 remains the durable publish/audit source |
| `mvp_measurement_events` production schema | Not directly catalog-checkable from this worktree; event writes currently fail softly |
| Cron | Protected; not run |

## Homepage QA Result

Result: Pass.

Homepage `/` returned HTTP 200 and rendered the May 1 public briefing without raw schema-preflight errors or missing PRD-53 column names. It showed Top Events, Tech News, Economics, and Politics tabs and rendered five Core signals with explicit `Why it matters` reasoning.

Visible Core titles:

| Rank | Title |
| --- | --- |
| 1 | Trump signs DHS legislation, ending record-breaking shutdown |
| 2 | Economic Letter Countdown: Most Read Topics from 2025 |
| 3 | A Closer Look at Emerging Market Resilience During Recent Shocks |
| 4 | The R*-Labor Share Nexus |
| 5 | The AI Investing Landscape: Insights from Venture Capital |

Public safety observations:

- no raw `signal_posts schema preflight failed` text
- no missing PRD-53 column names
- no misleading `0 signals` state
- no rewrite-requested row marker
- no rejected row marker
- no rank-8 marker
- no unpublished/non-live candidate surfaced in the rendered public content inspected

The page still includes current explanatory copy using "today's briefing" language, but the rendered briefing date is Friday, May 1, so this QA did not identify false freshness.

## `/signals` QA Result

Result: Pass.

`/signals` returned HTTP 200 and rendered:

- `Published Signals`
- `7 signals`
- `Top 5 Core Signals`
- `Next 2 Context Signals`
- `Why it matters` reasoning for all seven visible signals

Visible Context titles:

| Rank | Title |
| --- | --- |
| 6 | Anthropic, OpenAI back Warner-Budd workforce data bill |
| 7 | Congress keeps kicking surveillance reform down the road |

Public safety observations:

- no raw `signal_posts schema preflight failed` text
- no missing PRD-53 column names
- no misleading `0 signals` state
- no rewrite-requested row marker
- no held/rejected row marker
- no rank-8 marker
- no Depth row marker

Static query contract inspection confirmed public read paths still require:

- `is_live=true`
- `editorial_status='published'`
- `published_at IS NOT NULL`

## Details And Expansion QA Result

Result: Pass with documented MVP measurement limitation.

The homepage exposed five `Read more` controls, five Details links, and five source links. The first Details path resolved to `/briefing/2026-05-01` and returned HTTP 200. The details page preserved `Why it matters` reasoning and the source link path was present.

The current public UI uses Details/source/depth-proxy affordances rather than a single explicit four-layer Signal expansion UI. This matches the limitation documented by PR #175: strict "all four layers opened" depth engagement is not exactly measurable yet, so the measurement layer records the strongest available proxy separately from strict full expansion.

## Measurement Instrumentation QA Result

Result: Blocked at production storage readiness.

What passed:

- PR #175 code is deployed to production.
- Browser QA created first-party anonymous identifiers in browser storage:
  - visitor id prefix: `mvp_`
  - session id prefix: `mvp_session_`
- Homepage and interaction instrumentation attempted to send measurement events.
- The event API responded safely without blocking public UX.
- Direct synthetic `homepage_view` probe did not expose secrets or require PII.

What failed:

| Check | Result |
| --- | --- |
| Browser-generated measurement event responses | HTTP 202 |
| Direct `homepage_view` probe | HTTP 202 |
| API response body | `{"ok":true,"stored":false,"reason":"measurement_insert_failed"}` |
| Public UX impact | None; soft failure works as intended |

Interpretation:

The instrumentation client and API path are active, but production event storage is not ready. The strongest evidence is the deployed API returning `stored:false` with `measurement_insert_failed`. Direct catalog confirmation was not available because this QA worktree had no Supabase project link or production database environment.

Per launch-readiness rules, this blocks controlled user exposure because the MVP measurement thesis cannot be reliably captured yet.

## Measurement Summary Helper QA Result

Result: Blocked by unavailable production measurement storage/config.

Command:

```bash
npx tsx scripts/mvp-measurement-summary.ts --days 1
```

Observed result:

```text
Supabase server configuration is required to summarize MVP measurement events.
```

The helper is present and can be invoked through the repo TypeScript runtime, but this QA worktree did not have Supabase server configuration. Because event writes are also failing in production, the helper cannot yet produce a live production measurement summary.

The helper is expected to answer these once storage is working and data exists:

- total events by date
- homepage views
- `/signals` views
- signal expansion/detail events
- source clicks
- visitor/session counts
- day-7 retention feasibility
- first-three-session expansion feasibility
- comprehension prompt event status

Known measurement limitations remain:

- day-7 retention requires elapsed time and returning users
- visible comprehension prompt UI remains deferred
- strict four-layer expansion remains proxied by Details/source/depth interactions until the UI exposes a discrete four-layer expansion

## Admin Protection And Workflow QA Result

Result: Protected route pass; authenticated workflow not mutated.

Unauthenticated `/dashboard/signals/editorial-review` returned HTTP 200 with the admin sign-in gate:

- `Unauthenticated`
- `Admin sign-in required`
- `Sign in with an authorized Google account to review Top 5 Signals.`

No admin actions were run. No publish, `draft_only`, review mutation, final-slate mutation, or candidate mutation occurred during this QA.

Authenticated admin workflow was not revalidated in this docs branch because the final-launch QA prompt did not authorize additional production admin mutations and the critical current blocker is measurement storage readiness.

## Audit And History QA Result

Result: Limited by unavailable direct production database readback.

The PR #174 controlled-publish packet remains the durable source confirming:

- the May 1 slate was published through the supported PRD-53 workflow
- seven rows were published
- previous live rows were archived through the supported workflow
- a published-slate audit record was created

This QA did not directly reread `published_slates` or `published_slate_items` from production because the worktree had no Supabase project ref/link or production database environment. No ad hoc database access, direct SQL, migration repair, or schema migration was attempted.

## Cron And Automation QA Result

Result: Pass.

Unauthenticated cron check:

```text
GET /api/cron/fetch-news -> HTTP 401
{"success":false,"timestamp":"2026-05-01T09:22:34.732Z","summary":{"message":"Unauthorized"}}
```

Cron remains protected. This QA did not run cron, re-enable cron, schedule automatic publishing, or trigger any automated public publish path.

## Safety And Scope Confirmation

Confirmed not changed or not run in this QA:

- no new feature
- no new PRD
- no product scope change
- no added sources
- no source governance change
- no ranking threshold change
- no WITM threshold change
- no URL/domain/env/Vercel setting change
- no secret exposure
- no removal of `newsweb2026@gmail.com` from Production `ADMIN_EMAILS`
- no cron run or cron re-enable
- no migration-history repair
- no schema migration
- no direct SQL row surgery
- no `draft_only`
- no pipeline write-mode
- no production publish
- no Phase 2 architecture
- no personalization
- no visible comprehension prompt UI

## Validation

Commands run:

```bash
git diff --check
python3 scripts/validate-feature-system-csv.py
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/final-launch-readiness-qa --pr-title "Final launch-readiness QA"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/final-launch-readiness-qa --pr-title "Final launch-readiness QA"
npm run lint
npm run test
npm run build
```

Results:

- `git diff --check` passed.
- `python3 scripts/validate-feature-system-csv.py` passed with existing PRD slug warnings for PRD-32, PRD-37, and PRD-38.
- `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/final-launch-readiness-qa --pr-title "Final launch-readiness QA"` passed.
- `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/final-launch-readiness-qa --pr-title "Final launch-readiness QA"` passed.
- `npm run lint` passed.
- `npm run test` passed: 77 test files, 586 tests.
- `npm run build` passed.

Chromium/WebKit suite reruns were not run for this docs-only branch. Production browser QA was run against the deployed app and is recorded above; the PR does not change runtime UI code.

## Blockers

Final launch-readiness is blocked by measurement instrumentation storage readiness.

Blocking evidence:

- event API returns HTTP 202 with `stored:false`
- API reason is `measurement_insert_failed`
- summary helper cannot read production measurement events without Supabase server configuration
- direct production catalog/schema verification was unavailable in this worktree

Public UX, admin protection, details/depth proxy, and cron protection passed. The blocker is not public surface safety; it is inability to verify production event persistence for MVP measurement.

## Result

Final launch readiness: blocked.

Readiness label:

```text
launch_readiness_blocked_measurement_instrumentation
```

## Exact Next Task

Use the supported schema/release path to make production measurement storage writable, then rerun final launch-readiness QA.

At minimum:

1. Confirm whether the additive PR #175 `mvp_measurement_events` migration is applied in production.
2. If it is not applied, obtain explicit authorization for the PR #175 measurement schema apply through the supported migration process.
3. Rerun the production event write probe and verify `stored:true`.
4. Rerun the measurement summary helper with production server configuration.
5. Reopen final launch-readiness QA from the same public/admin/cron safety baseline.

Do not start controlled user exposure, cron, Phase 2 architecture, or personalization until measurement storage is verified.
