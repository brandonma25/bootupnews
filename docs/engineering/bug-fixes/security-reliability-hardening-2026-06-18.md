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

<!-- subsequent items appended below as they land -->
