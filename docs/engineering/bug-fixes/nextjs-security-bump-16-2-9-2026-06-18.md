# Next.js Security Bump 16.2.2 → 16.2.9 — 2026-06-18

Canonical PRD required: `No` — dependency security remediation / audit follow-up, not a product feature.

## Summary
- **Problem:** Next.js was pinned at **16.2.2**, which carries named, network-exploitable advisories: middleware/proxy bypass (GHSA-492v-c6pp-mqqv, CVSS 8.1, <16.2.5), WebSocket-upgrade SSRF (GHSA-c4j6-fc7j-m34r, CVSS 8.6, <16.2.5), proxy bypass via segment-prefetch (GHSA-26hh-7cqf-hhc6, <16.2.6), and DoS (GHSA-8h8q-6873-q5fj / GHSA-mg66-mrh9-m8jx, <16.2.5).
- **Fix:** bump to **16.2.9** (latest 16.2.x; clears every listed range, all <16.2.7) + `npm audit fix` (non-breaking).
- **Scope:** `package.json` + `package-lock.json` only — *but* the lockfile diff is large (~1.6k lines) and overwhelmingly **Sentry/OTel churn, not Next.js**: `npm audit fix` floated `@sentry/nextjs` 10.50.0→10.58.0 (within the existing `^10.50.0` range), which renamed `@sentry-internal/*`→`@sentry/*` and dropped ~79 unused OpenTelemetry/protobuf/pg instrumentation packages. None of those are imported by `src/` or `scripts/`, so the runtime surface is unchanged. Shipped as its **own PR** (per the council: framework bump = highest blast radius, must be independently attributable/revertable) — separate from the security/reliability hardening PR.

## Result
- **Production dependencies** (`npm audit --omit=dev`): **0 high/critical** — the four highs were all in the Next.js production tree and are cleared by the bump.
- All dependencies (`npm audit`, incl. dev tooling): residual low/moderate, plus dev-only highs that surface over time in test tooling (e.g. `jsdom`→`undici`). These have **zero production blast radius**; the CI `pr-audit` gate runs `--omit=dev` for exactly this reason.
- **Caveat:** `npm audit` queries the live GitHub advisory DB, so these counts are a **point-in-time snapshot** — re-running later may show new advisories as they are published.
- Verified: clean `next build` + full unit suite green.

## Companion
- The application-level security + reliability hardening (SSRF guard, admin-takeover, rate limiting, Notion timeout/retry, RLS revoke, etc.) is in `security-reliability-hardening-2026-06-18.md` / its PR.
