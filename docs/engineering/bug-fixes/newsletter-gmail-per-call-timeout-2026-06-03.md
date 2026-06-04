# Gmail Fetch Has No Per-Call Timeout — Bug-Fix Record

## Summary
- **Problem addressed:** `cron_runs` duration drifted 25s → 55s through late May / early June; June 1 hit the 55.4s internal timeout. Newsletter source died on 2026-05-18 (likely Gmail OAuth refresh token expiry). The Gmail client had no per-call timeout — every HTTP call (OAuth refresh + API) was at the mercy of the outer 55s wall, and retries × multiple calls compounded.
- **Root cause:** `src/lib/newsletter-ingestion/gmail.ts` called `fetchImpl(...)` without an `AbortSignal` in two places: `getGmailAccessToken` (OAuth refresh) and `gmailFetchJson` (all API calls).
- **Affected object level:** Cron pipeline runtime envelope.
- **Related issue:** #293. Track 2 P3.

## Fix
New `fetchWithTimeout(fetchImpl, url, init, failureLabel, timeoutMs = 10_000)` helper wraps every Gmail HTTP call with `AbortController` / `AbortSignal`. On timeout:
- Aborts the request.
- Captures `Sentry.captureMessage("Gmail call timed out", { level: "warning", fingerprint: ["gmail-call-timeout", failureLabel] })` so a dead credential produces ONE Sentry issue per cron run (grouped by fingerprint), not one per retry × per call.
- Throws a retryable `GmailApiError` so `gmailFetchJson`'s retry policy handles a timeout uniformly with HTTP-retryable failures.

Why 10s per call: typical Gmail p99 < 2s; anything > 10s means broken credential / network. Fail fast, let the run record `warn` (per P1's three-state status), avoid ratcheting toward the 60s Vercel function ceiling.

## Tests
- `src/lib/newsletter-ingestion/gmail.test.ts`: new "times out a hung Gmail call after the per-call ceiling and captures Sentry" — mocks `fetchImpl` to never resolve until `AbortSignal` fires, advances fake timers past 10s, asserts `GmailApiError` with `"timed out after 10000ms"` + `retryable: true` + Sentry capture with the expected fingerprint.

Existing 5 tests in the file still pass. Full suite: 843/843 across 103 files (+1 new). `npm run build` green.

## Why production didn't catch this earlier
The Gmail client had retry logic but no upper bound on a single call — the retry budget assumed each call would either return quickly or fail with an HTTP status. A hung connection violates that assumption. The outer 55s timeout only caught the catastrophic case; the slow drift had no signal.

## Operator follow-up (post-deploy)
- Even with the Gmail OAuth still expired: `cron_runs` duration should immediately drop back to ~25–35s (the RSS + editorial-staging work). Sentry should show ONE `gmail-call-timeout` issue per run grouped by fingerprint until BM re-auths.
- After BM re-auths the Gmail credential: durations stay ~25–35s, newsletter rows resume in `newsletter_emails`, no further Sentry timeouts.

## Not addressed by this fix
- Re-auth the actual Gmail OAuth credential (BM action).
- P1 cron success boolean (separate PR #290).
- P2 Sentry-capture log writers (separate PR #292).
