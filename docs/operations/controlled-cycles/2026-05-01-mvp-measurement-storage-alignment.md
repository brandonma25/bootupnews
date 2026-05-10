# MVP Measurement Storage Alignment

Date: 2026-05-01
Branch: `codex/mvp-measurement-storage-alignment`
Readiness label: `ready_for_final_launch_readiness_qa_rerun`

## Effective Change Type

Remediation / alignment.

This packet records production storage alignment for the already-implemented MVP measurement instrumentation from PR #175. It does not create a new feature, create a new PRD, add user-facing measurement UI, start controlled user exposure, run cron, run `draft_only`, run pipeline write-mode, publish, mutate Signal rows, use direct SQL row surgery, change source/ranking/WITM thresholds, start Phase 2 architecture, or start personalization.

Object level changed:

- additive measurement storage for MVP analytics events

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
- PR #176 final launch-readiness QA blocker
- `docs/engineering/change-records/mvp-measurement-instrumentation.md`
- `docs/operations/tracker-sync/2026-05-01-mvp-measurement-instrumentation.md`
- `docs/operations/controlled-cycles/2026-05-01-final-launch-readiness-qa.md`
- `docs/operations/tracker-sync/2026-05-01-final-launch-readiness-qa.md`
- `docs/operations/controlled-cycles/2026-05-01-prd-53-authorized-second-controlled-publish.md`
- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

## PR #176 Blocker Summary

PR #176 found:

- public homepage and `/signals` QA passed
- admin route protection passed
- cron protection passed
- MVP measurement instrumentation was deployed
- production event API returned HTTP 202 with `stored:false`
- production event API reason was `measurement_insert_failed`

That left launch readiness blocked at:

```text
launch_readiness_blocked_measurement_instrumentation
```

## Authorization

Prompt-level authorization present:

- `CONTROLLED_PRODUCTION_MVP_MEASUREMENT_SCHEMA_APPLY_APPROVED=true`
- `CONTROLLED_PRODUCTION_SCHEMA_READONLY_INSPECTION_APPROVED=true`
- `CONTROLLED_PRODUCTION_CATALOG_READONLY_INSPECTION_APPROVED=true`
- `CONTROLLED_PRODUCTION_MEASUREMENT_EVENT_WRITE_VERIFICATION_APPROVED=true`

Prompt-level authorization absent:

- production publish authorization
- `draft_only` authorization
- pipeline write-mode authorization
- cron authorization
- direct SQL row-surgery authorization
- signal-row mutation authorization
- source/ranking/WITM threshold authorization
- controlled user exposure authorization
- Phase 2 architecture authorization
- personalization authorization
- user-facing comprehension-prompt UI authorization

Shell environment note:

- The authorization variables were present in the user prompt, not exported as shell variables.
- `SUPABASE_DB_PASSWORD`, `DATABASE_URL`, `POSTGRES_URL`, `SUPABASE_ACCESS_TOKEN`, and `SUPABASE_PROJECT_REF` were absent from the local shell environment.
- Supabase CLI linked-project access was available and completed the clean pre-apply inventory, dry-run, and schema apply without printing secrets.

No secrets, database passwords, connection strings, service-role keys, browser cookies, auth headers, or production credentials were printed into this packet.

## Baseline Production Verification

Production target:

| Field | Result |
| --- | --- |
| Production URL | `https://bootupnews.vercel.app` |
| Production deployment ID | `dpl_Ckb4UwAuaH1njCxEByXDhDgwXxoE` |
| Production deployment URL | `https://bootup-ns1plzgq0-brandonma25s-projects.vercel.app` |
| Production deploy status | Ready |
| Production route probe | Passed |
| Homepage `/` | HTTP 200 |
| `/signals` | HTTP 200 |
| `/api/cron/fetch-news` unauthenticated | HTTP 401 |

Baseline measurement event API result before schema apply:

```json
{
  "status": 202,
  "body": {
    "ok": true,
    "stored": false,
    "reason": "measurement_insert_failed"
  }
}
```

Baseline public safety:

- homepage returned HTTP 200
- `/signals` returned HTTP 200
- `/signals` showed `Published Signals`, `Top 5 Core Signals`, and `Next 2 Context Signals`
- no raw schema-preflight error was visible
- no missing-column text was visible
- cron endpoint remained protected with HTTP 401

## Commands Run

Workspace, branch, and source inspection:

```bash
pwd
git branch --show-current
git status --short --branch
git worktree list
git fetch origin main
sed -n '1,260p' AGENTS.md
sed -n '1,240p' docs/engineering/protocols/engineering-protocol.md
sed -n '1,220p' docs/engineering/protocols/test-checklist.md
sed -n '1,180p' docs/engineering/protocols/prd-template.md
sed -n '1,220p' docs/engineering/protocols/release-machine.md
sed -n '1,240p' docs/engineering/protocols/release-automation-operating-guide.md
sed -n '1,220p' docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md
sed -n '1,260p' docs/operations/controlled-cycles/2026-05-01-final-launch-readiness-qa.md
```

Access precheck:

```bash
supabase projects list
supabase link --project-ref <production project ref> --workdir <worktree> --yes
```

Migration inventory and apply:

```bash
supabase migration list --linked --workdir <worktree>
supabase db push --dry-run --linked --workdir <worktree>
supabase db push --linked --workdir <worktree> --yes
supabase db push --dry-run --linked --workdir <worktree>
```

Production verification:

```bash
vercel inspect https://bootupnews.vercel.app --no-color
node scripts/prod-check.js https://bootupnews.vercel.app
node <baseline measurement event API probe>
node <post-apply measurement event API probe>
node <public route and cron safety probe>
npx tsx scripts/mvp-measurement-summary.ts --days 1
```

Cleanup:

```bash
rm -rf supabase/.temp
```

The exact measurement probes used synthetic QA visitor/session IDs only and included no PII.

## Migration Inventory And Dry-Run

Pre-apply `supabase migration list --linked` completed cleanly.

Result:

| Local version | Remote version | Status |
| --- | --- | --- |
| `20260416200404` | `20260416200404` | Applied |
| `20260421120000` | `20260421120000` | Applied |
| `20260423090000` | `20260423090000` | Applied |
| `20260423120000` | `20260423120000` | Applied |
| `20260424083000` | `20260424083000` | Applied |
| `20260426090000` | `20260426090000` | Applied |
| `20260426120000` | `20260426120000` | Applied |
| `20260426143000` | `20260426143000` | Applied |
| `20260430100000` | `20260430100000` | Applied |
| `20260430110000` | `20260430110000` | Applied |
| `20260430120000` | `20260430120000` | Applied |
| `20260501100000` | empty | Pending |

Pre-apply dry-run result:

```text
Would push these migrations:
 • 20260501100000_mvp_measurement_events.sql
```

No unexpected migration was pending.

## Committed Measurement Schema

Source migration:

- `supabase/migrations/20260501100000_mvp_measurement_events.sql`

Expected table:

- `public.mvp_measurement_events`

Expected columns:

- `id`
- `event_name`
- `occurred_at`
- `visitor_id`
- `session_id`
- `user_id`
- `route`
- `surface`
- `signal_post_id`
- `signal_slug`
- `signal_rank`
- `briefing_date`
- `published_slate_id`
- `metadata`
- `created_at`

Expected indexes:

- `mvp_measurement_events_occurred_at_idx`
- `mvp_measurement_events_visitor_occurred_at_idx`
- `mvp_measurement_events_session_idx`
- `mvp_measurement_events_event_name_occurred_at_idx`
- `mvp_measurement_events_briefing_date_idx`

Expected policies:

- `Service role reads MVP measurement events`
- `Service role writes MVP measurement events`

Event API insert path:

- `POST /api/mvp-measurement/events`
- inserts into `mvp_measurement_events`
- accepted event names match the migration check constraint
- measurement insert failure soft-fails with HTTP 202 and `stored:false`
- successful insert returns HTTP 202 and `stored:true`

## Schema Apply Result

Command:

```bash
supabase db push --linked --workdir <worktree> --yes
```

Result:

```text
Applying migration 20260501100000_mvp_measurement_events.sql...
Finished supabase db push.
```

Expected notices were emitted for dropping policies that did not yet exist:

```text
NOTICE: policy "Service role reads MVP measurement events" for relation "public.mvp_measurement_events" does not exist, skipping
NOTICE: policy "Service role writes MVP measurement events" for relation "public.mvp_measurement_events" does not exist, skipping
```

No direct SQL was run. No unrelated migration was applied. No Signal rows were read or mutated.

## Post-Apply Schema Verification

Post-apply dry-run completed once and returned:

```text
Remote database is up to date.
```

The production event API then returned `stored:true` for all synthetic QA events, which verifies the table and service-role insert path are active in production.

Post-apply `supabase migration list --linked` could not complete because Supabase's temporary auth circuit breaker blocked additional CLI login-role connections after the apply:

```text
FATAL: (ECIRCUITBREAKER) too many authentication failures, new connections are temporarily blocked
Connect to your database by setting the env var correctly: SUPABASE_DB_PASSWORD
```

Follow-up note:

- The pre-apply migration list was clean.
- The schema apply completed.
- A post-apply dry-run returned "Remote database is up to date."
- Production event writes now return `stored:true`.
- Direct post-apply migration-list readback should be rerun after the circuit breaker cools down, but the storage blocker itself is resolved at the application/event API layer.

## Production Event API Verification

Post-apply synthetic QA events were sent through the supported PR #175 event API only.

Payload constraints:

- QA/test metadata only
- anonymous synthetic visitor/session IDs only
- no PII
- no secrets
- no Signal row mutation
- no visibility mutation

Results:

| Event | Route / surface | HTTP status | API result |
| --- | --- | --- | --- |
| `homepage_view` | `/` / `homepage` | 202 | `stored:true` |
| `signals_page_view` | `/signals` / `signals` | 202 | `stored:true` |
| `signal_full_expansion_proxy` | `/briefing/2026-05-01` / `briefing-detail` | 202 | `stored:true` |

This resolves the PR #176 production storage blocker:

```text
measurement_insert_failed -> stored:true
```

## Measurement Summary Helper Result

Dependencies were installed successfully with:

```bash
npm install
```

The summary helper command was then run:

```bash
npx tsx scripts/mvp-measurement-summary.ts --days 1
```

Result:

```text
Supabase server configuration is required to summarize MVP measurement events.
```

Interpretation:

- The helper is present and runnable in this worktree.
- The local shell does not expose the required Supabase server configuration.
- Secrets were not pulled from Vercel or Supabase into local files.
- This is not the original storage failure; event API write verification now proves production event persistence is working.

Final launch-readiness QA should rerun the summary helper in a configured environment or with an approved non-persisted secret path.

Known measurement limitations remain:

- day-7 retention requires elapsed time and returning-user data
- comprehension prompt UI remains deferred because no visible prompt pattern is approved
- strict four-layer expansion remains proxied by Details/source/depth interactions until the UI exposes a discrete four-layer expansion

## Public Safety Verification

Post-apply public checks:

| Route | Result |
| --- | --- |
| `/` | HTTP 200 |
| `/signals` | HTTP 200 |
| `/briefing/2026-05-01` | HTTP 200 |
| `/api/cron/fetch-news` without auth | HTTP 401 |

Additional checks:

- homepage showed Friday, May 1
- homepage rendered five `Why it matters` sections
- `/signals` showed `Published Signals`
- `/signals` showed `Top 5 Core Signals`
- `/signals` showed `Next 2 Context Signals`
- `/signals` rendered seven visible `Why it matters` sections
- no raw schema-preflight error was visible
- no missing-column text was visible
- no measurement error text was visible
- cron remained protected

## What Did Not Change

- no new feature
- no new PRD
- no product scope change
- no user-facing measurement UI
- no controlled user exposure
- no cron run
- no cron re-enable
- no automatic publish
- no production publish
- no `draft_only`
- no pipeline write-mode
- no migration-history repair
- no unrelated schema migration
- no direct SQL row surgery
- no ad hoc DDL
- no ad hoc DML
- no Signal row mutation
- no source governance change
- no added sources
- no ranking threshold change
- no WITM threshold change
- no public URL/domain/env/Vercel setting change
- no removal of `newsweb2026@gmail.com` from Production `ADMIN_EMAILS`
- no Phase 2 architecture
- no personalization

## Validation

Commands run:

```bash
npm install
git diff --check
python3 scripts/validate-feature-system-csv.py
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/mvp-measurement-storage-alignment --pr-title "MVP measurement storage alignment"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/mvp-measurement-storage-alignment --pr-title "MVP measurement storage alignment"
npm run lint
npm run test
npm run build
```

Results:

- `npm install` passed.
- `git diff --check` passed.
- `python3 scripts/validate-feature-system-csv.py` passed with existing PRD slug warnings for PRD-32, PRD-37, and PRD-38.
- `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/mvp-measurement-storage-alignment --pr-title "MVP measurement storage alignment"` passed.
- `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/mvp-measurement-storage-alignment --pr-title "MVP measurement storage alignment"` passed.
- `npm run lint` passed.
- `npm run test` passed: 77 test files, 586 tests.
- `npm run build` passed.

Chromium/WebKit suite reruns were not run for this docs-only branch. Production verification used route checks and the deployed measurement event API; no runtime UI source changed in this PR.

## Blockers Remaining

Launch blocker resolved:

- production measurement event storage now returns `stored:true`

Operational limitations remaining:

- post-apply `supabase migration list --linked` readback was blocked by Supabase CLI auth circuit breaker after apply
- local summary helper could not read production measurement rows because Supabase server configuration is not exposed in this worktree

Neither limitation changed public behavior or Signal visibility. Both should be rechecked during the next final launch-readiness QA rerun.

## Result

Measurement storage alignment: complete at the production event API layer.

Readiness label:

```text
ready_for_final_launch_readiness_qa_rerun
```

## Exact Next Task

Rerun final launch-readiness QA from latest `main` after this packet is reviewed and merged.

The QA rerun should:

1. confirm event API writes still return `stored:true`
2. rerun `supabase migration list --linked` after the CLI circuit breaker cools down
3. run the measurement summary helper in a configured environment
4. verify public homepage, `/signals`, details/depth proxy, admin protection, audit/history, and cron protection
5. decide whether Boot Up is ready for controlled user exposure

Do not start controlled user exposure until that final launch-readiness QA rerun passes.
