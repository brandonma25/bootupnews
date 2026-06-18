# Security + Reliability Hardening (Phases 0–3) — 2026-06-18

Executes the council-reviewed, security-updated consolidated plan from the code-quality review. One branch, one commit per item, QA (typecheck + lint + targeted tests) after each. **Deferred by design** (council hard-gate): the `signals-editorial.ts` (A-1) and `data.ts` god-module splits — gated on "zero open branches touching the file" (~22 worktrees currently hold it). The Next.js bump ships as its **own** PR (highest blast radius, must be independently revertable).

## Phase 0 — foundation + truly-exploitable security set

### 0. Production typecheck gate
- **Problem:** No `typecheck` script and no `tsc` step in CI — 115 pre-existing type errors (all in `*.test.*` fixtures) sat uncaught, and vitest strips types so type drift in production code was invisible.
- **Fix:** `tsconfig.typecheck.json` (checks `src/` + `scripts/`, excludes `*.test.*`); `npm run typecheck` (production gate, **0 errors today**) + `npm run typecheck:all` (full, for the test-fixture burn-down); added a `Typecheck` step to the `pr-lint` CI job.
- **Tracked backlog:** 115 `*.test.*` type errors across 21 files — to be cleared before A-1 (the split) is ever attempted, since the full-repo typecheck is the safety net for that refactor.
- **QA:** `npm run typecheck` → 0 errors.

### 1. Admin-takeover hardening (HIGH)
- **Problem:** the admin gate trusts the email claim only (`admin-auth.ts:isAdminUser`), and email confirmation is auto-on. A privileged email in `ADMIN_EMAILS` that hasn't registered yet is claimable → instant session → full editorial admin.
- **Fix (code, defense-in-depth):** new `isVerifiedAdminUser()` requires `email_confirmed_at` in addition to the allowlist; applied at the two server-side gates — `getAdminEditorialContext` (all 17 editorial mutations) and the mvp-measurement summary route. Cosmetic UI `isAdminUser({email})` toggles unchanged.
- **⚠️ REQUIRED MANUAL STEP (load-bearing control):** enable email confirmation in Supabase Auth (Authentication → Email → "Confirm email") so `email_confirmed_at` is only set for owned addresses. With auto-confirm ON the code check passes for attackers too — both controls are needed.
- **QA:** new `isVerifiedAdminUser` unit tests (confirmed→true, unconfirmed→false, non-admin→false); updated 52 admin mocks across the editorial suite + the summary route mock to a *confirmed* admin. typecheck 0; 113 affected tests green.

### 4. mit-review admin gate (MEDIUM)
- **Problem:** `/internal/mit-review` was gated on `if (!user)` only — any signed-up user saw internal diagnostics (runtime source IDs, feed samples), inconsistent with every other internal surface.
- **Fix:** `if (!isVerifiedAdminUser(user))` → `LockedInternalPage`.
- **QA:** page test now covers unauth / logged-in-non-admin / verified-admin; 3 tests green.

### 2. SSRF chokepoint at all three fetch sinks (HIGH)
- **Problem:** user-added feed URLs were validated only by `z.url()` (accepts `169.254.169.254`, `localhost`, `file://`) and fetched server-side at three sinks with no guard — `rss.ts` (feed fetch), `extractor.ts` (article body, **response persisted** = data-returning SSRF), and the add-source actions. Both fetch sinks followed redirects, so a public URL could `302→internal`.
- **Fix:** new `src/lib/security/url-safety.ts` — `validatePublicUrl` (scheme allowlist, reject credentials + literal private/loopback/link-local/IMDS IPs incl. IPv6 + IPv4-mapped, internal hostnames), `assertHostnameResolvesPublic` (DNS-resolve + block private resolved IPs), and `safeFetch` (`redirect:"manual"` + re-validate every hop). Wired into all three sinks; add-source schemas now use a `safePublicFeedUrl` refinement.
- **Residual (tracked):** a narrow DNS-rebinding TOCTOU between the resolve-check and undici's connect remains; closing it fully needs a connect-time IP pin (custom undici dispatcher `lookup`). The guard blocks every documented exploit.
- **QA:** 24-case guard suite (literal IPs v4/v6/mapped, localhost, *.local, file/ftp, creds, resolve-to-private, redirect-to-internal, redirect cap); typecheck 0; **full suite 1100 green**.

### 3. Rate limiting on the public abuse surfaces (MEDIUM)
- **Problem:** the unauthenticated service-role telemetry writer (`mvp-measurement/events`) and open signup had no rate limit — metric-poisoning/table-bloat and mailbomb/quota-burn primitives.
- **Fix:** `src/lib/security/rate-limit.ts` (in-memory fixed-window, per-IP). Telemetry: 120/min/IP → 429+Retry-After. Signup: 5 per 10 min/IP → `/?auth=rate-limited` (new message). **CAVEAT (documented):** per-instance on serverless; back with Vercel KV/Upstash for a global cap (follow-up).
- **QA:** limiter unit tests (window, reset, isolation, IP extraction); typecheck 0; tests green.

### 5. push-secret → header + REVOKE anon DML grants (MEDIUM/HIGH)
- **5a — secret in URL query string (`push-approved/route.ts:600`):** leaked into access/proxy/Referer logs. Now reads `x-editorial-push-secret` header (preferred), constant-time compared (`secretsMatch` / `crypto.timingSafeEqual`). Query `?token=` kept as a **deprecated fallback** (logs a migration warning) so the manual trigger doesn't break.
  - **⚠️ REQUIRED MANUAL STEPS:** switch your push trigger to send `-H "x-editorial-push-secret: <secret>"` (instead of `?token=`), then **rotate `EDITORIAL_PUSH_SECRET`** (the old value may already be in logs). After that we remove the query fallback.
- **5b — anon DML grants (HIGH):** confirmed live that `anon`+`authenticated` held INSERT/UPDATE/DELETE/**TRUNCATE** on `signal_posts`+`cron_runs` — RLS-deny was the SOLE gate on the browser-shipped anon key. Migration `20260618120000_revoke_anon_dml_signal_posts_cron_runs.sql` revokes the write grants (SELECT retained; reads stay RLS-governed). **Applied to prod via Supabase MCP + verified** (anon now holds SELECT only); committed matching repo file. No permissive policies added (would re-expose data).
- **QA:** secret-compare unit tests; push-approved tests green; typecheck 0; grants re-queried post-migration.

### 7 + S-2. Constant-time secret compares + safeParse auth inputs (LOW)
- **7:** cron + health secret checks used `===` (timing oracle). Now `secretsMatch` (`crypto.timingSafeEqual`, length-guarded so it never throws). Applied in `cron-endpoint-runtime.ts` (`isCronAuthorized`) and `health/route.ts`.
- **S-2:** auth actions used Zod `.parse()` (throws → unhandled ZodError → Sentry noise). `signUpWithPasswordAction` / `signInWithPasswordAction` now `safeParse` → `redirect("/?auth=invalid")`.
- **QA:** cron + health + auth suites green (53); typecheck 0.

### 6. Next.js ≥16.2.7 — **SEPARATE PR** (deploy-and-soak)
Per the council, the framework bump (highest blast radius) ships independently so it's attributable/revertable. Tracked separately; gate on clean `next build` + full suite + typecheck + smoke-render `/` and `/signals` + confirm the daily cron fires.

---
## Phase 1 — reliability (publish/cron path)

### F-1. Taipei freshness date (MEDIUM) — *(committed above)*

### H-3 + R-1. Notion timeout/retry + recoverable writeback (HIGH/MEDIUM)
- **H-3:** Notion writers were bare `fetch()` — no timeout (a hung socket blocked until the 55s stage wall) and no retry. New `src/lib/notion-fetch.ts` adds an 8s timeout + bounded, **method/idempotency-aware** retry: 429 always retried (honors Retry-After); 5xx/network/timeout retried ONLY for idempotent calls — page **CREATE (POST /pages) is never retried** (no double-create), queries default to non-idempotent (timeout + 429 only), PATCH retries. Routed all Notion sites through it: `editorial-staging/notion-writer.ts` (4), `pipeline-log.ts`, `source-health-log.ts` (3), `push-approved` (notionRequest), `health/route.ts`.
- **R-1:** the Supabase write commits before the Notion writeback; a writeback throw was mislabeled `failed` (supabaseId:null) → re-pushed next run, churning the editor's slot. New `markNotionRowPushedSafely` swallows + logs the orphan `(supabaseId, pageId)` and the caller reports `inserted_writeback_pending` / `overwrote_writeback_pending` (DB write succeeded, writeback pending). notionFetch already retries the idempotent PATCH; a still-failing writeback re-syncs next run via the select-then-decide dedup (no duplicate).
- **F-2 (atomic rank upsert): CUT** per council — the push loop is sequential (no live race) and an upsert would add CHECK-violation risk.
- **QA:** `notion-fetch` 5-case suite (429-any-method, 5xx-idempotent-only, no-double-create, no-retry-POST-network); editorial-staging/observability/push-approved/health suites green; **full suite 1115 green**; typecheck 0.

---
## Phase 2 — maintainability — DEFERRED (documented, not skipped)
- **A-1 (signals-editorial.ts split) + data.ts split:** deferred per the council's hard gate — there are ~22 open worktrees holding `signals-editorial.ts`; a total line-move would strand that in-flight work and a non-coder can't resolve the conflicts. Prereq (also deferred): the memo-reset seam + clearing the 115 `*.test.*` typecheck backlog.
- **Dead-code deletion:** deferred to a separate reviewed spike. The council was divided (Delivery lead recommended cutting it; Architect re-scoped to orphaned-UI-only), it has zero user value, and it is entangled with the untested `actions.ts` and the **live** `clusterNormalizedArticles` / `generateDailyBriefing` / `demo-data.ts` chain — the #1 "empty-homepage-at-next-cron" risk. Needs a reachability trace + build/typecheck/test gating in its own PR, not an autonomous mega-PR.

---
## Phase 3 — posture

- **#10 — `javascript:`-in-`source_url` XSS sink:** `SignalCard` (related-coverage + source link) and `SignalCardInteractive` rendered `source_url` as an href with no scheme check. Now gated by `isValidSourceUrl` / `^https?://` — a non-http(s) URL renders as non-link text. (Write-side validation in push-approved deferred — render guard fully closes the click-exec sink.)
- **#12 — PII in auth logs:** `actions.ts` logged full emails on auth-failure paths. Added `maskEmail` (keeps domain, masks local part) at the 3 log sites; the real email still flows to the Supabase auth calls (signUp/signInWithPassword/signInWithOtp).
- **#13 — `/health/rss` freshness leak:** the unauthenticated service-role read exposed stale/failed-feed detail. Now returns only `status` to public probes; the internal detail is gated behind the cron secret (`isCronAuthorized`). New unauth-status-only test.
- **RLS service-role invariant:** the anon DML revoke shipped in Phase 0 item 5. Verified live: as `anon`, `signal_posts` + `cron_runs` return **0 rows** (RLS deny) and writes are revoked. Invariant: server-side writes use service-role (bypasses grants + RLS); anon reads are RLS-denied; **never add permissive policies** (would re-expose rows).
- **npm audit CI cadence + `npm audit fix`:** deferred to the dependency/Next.js PR (where the deps are actually bumped), so the gate lands green rather than red against the current 23 advisories.

## Required manual follow-ups (operator)
1. **Enable email confirmation** in Supabase Auth (item 1 — load-bearing for the admin-takeover fix).
2. **Switch the push-approved trigger** to the `x-editorial-push-secret` header and **rotate `EDITORIAL_PUSH_SECRET`** (item 5), then we drop the query fallback.
3. Back the rate limiter with **Vercel KV/Upstash** for a global (not per-instance) cap (item 3).

## Deferred (tracked)
- A-1 `signals-editorial.ts` split + `data.ts` split (worktree gate) and the dead-code deletion spike (Phase 2).
- SSRF connect-time IP pin (DNS-rebind residual), notion retry-budget-vs-stage-timeout abort threading, the 115 `*.test.*` typecheck backlog, push-approved write-side URL validation.
