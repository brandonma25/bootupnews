# Cron Success Boolean — RSS-Only (#272 follow-on) Bug-Fix Record

## Summary
- **Problem addressed:** `cron_runs.status='fail'` every run since 2026-05-22 (12× `fail` + 1× `timeout`) despite RSS + editorial-staging being healthy. The newsletter source died on 2026-05-18 (likely Gmail OAuth expiry); the legacy `success = rss.success && newsletter.success` boolean (`src/app/api/cron/fetch-editorial-inputs/route.ts:399`) ANDs it with RSS, so every RSS-healthy run was mislabeled. Pipeline Log + `cron_runs` accordingly reported `fail` and the operator dashboard read "the pipeline is dead" while the actual ingestion pipeline was producing ~220 candidates / 38 sources / a 5-signal slate every day.
- **Root cause:** The boolean coupled a supplementary input source (Gmail inbound newsletter benchmark) to a critical leg (RSS) without a degradation path. Newsletter being supplementary means: missing today's emails should NOT alarm; the contract was wrong, not the data.
- **Affected object level:** Observability surface (the operator-visible cron-run status). No ingestion data was lost — `signal_posts` continued to be written daily.
- **Related issue:** #289. Issue #272 was the original tracker; this is the follow-on fix per the 2026-06-03 audit brief.

## Fix
Two changes in `src/app/api/cron/fetch-editorial-inputs/route.ts`:

```ts
// Was:
const success = rss.success && newsletter.success;
const pipelineLogStatus = success
  ? stagingErrors.length > 0 ? "warn" : "ok"
  : "fail";

// Now:
const success = rss.success;
const pipelineLogStatus = !rss.success
  ? "fail"
  : (!newsletter.success || stagingErrors.length > 0)
    ? "warn"
    : "ok";
```

### Revision (2026-06-04) — `cron_runs.status='warn'` mirrors Pipeline Log

The original fix wrote `cron_runs.status='ok'` on degraded runs, collapsing the three-state Pipeline Log ladder into two states at the guard-table layer. Track 2 P1 revision adds a Supabase migration `supabase/migrations/20260604070000_cron_runs_add_warn_status.sql` that adds `'warn'` to the `cron_runs.status` CHECK constraint, and updates `finalizeRunLock`'s signature + the call site so `pipelineLogStatus` passes through directly:

```ts
// Was:
await finalizeRunLock(briefingDate, pipelineLogStatus === "fail" ? "fail" : "ok");

// Now (after migration applies 'warn' to the CHECK constraint):
await finalizeRunLock(briefingDate, pipelineLogStatus);
```

Migration ordering is load-bearing: the CHECK constraint addition MUST land before any code writes `'warn'`. cron-job.org's failure trigger keys on HTTP status, so `'warn'` runs are visible without paging.

Refer to PRD-65 Phase 7.4 for the operational write-up.

One change in `src/lib/newsletter-ingestion/runner.ts` — explicit early-return after `fetchBootUpBenchmarkEmails` when the Gmail label yields zero refs:

```ts
if (refs.length === 0) {
  return buildResult({
    success: true,
    ...
    message: "No newsletters received from the configured Gmail label since the last fetch.",
    fetchedMessageCount: 0,
  });
}
```

Previously the empty path still hit the writable-run + `processWritableRun` machinery (which would also return `success: true`), but with a generic "processed Gmail newsletter candidates without publishing" message that didn't distinguish "0 emails today" from "wrote 5 emails today." The explicit message clarifies the observability and ensures the runner can never throw on the empty path.

## Tests
Two new tests in `src/app/api/cron/fetch-editorial-inputs/route.test.ts`:
- `"writes Pipeline Log status=warn (NOT fail) when newsletter fails but RSS is healthy (#272)"` — mocks `runNewsletterIngestion` to return `success: false` and asserts the Pipeline Log call gets `status: "warn"` with `RSS=ok` and `newsletter=degraded` in the message.
- `"writes Pipeline Log status=ok when newsletter returns success on an empty Gmail label (#272)"` — mocks the new empty-path message and asserts `status: "ok"`.

The existing `"writes Pipeline Log status=fail when a branch fails"` test continues to pass (mocks RSS to fail → `status: "fail"`).

Full suite: 844/844 passed across 103 files. `npm run build` green.

## What is NOT in this fix
- No restoration of the actual newsletter source. The Gmail OAuth credential needs operator re-auth — separate BM action.
- No per-call timeout on the Gmail fetch — separate Priority 3 PR.
- No Sentry capture for the dark Notion log writers — separate Priority 2 PR.
- No change to `finalizeRunLock`; the existing `"fail" ? "fail" : "ok"` rule already does the right thing once `pipelineLogStatus` is correct.

## Operator follow-up (post-deploy)
- BM verifies the next cron run records `cron_runs.status='ok'` and Pipeline Log `status='warn'` while Gmail remains down. Once Gmail OAuth is re-authed, `status='ok'` on both surfaces.
