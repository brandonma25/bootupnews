# Next.js Security Bump 16.2.2 → 16.2.9 — 2026-06-18

Canonical PRD required: `No` — dependency security remediation / audit follow-up, not a product feature.

## Summary
- **Problem:** Next.js was pinned at **16.2.2**, which carries named, network-exploitable advisories: middleware/proxy bypass (GHSA-492v-c6pp-mqqv, CVSS 8.1, <16.2.5), WebSocket-upgrade SSRF (GHSA-c4j6-fc7j-m34r, CVSS 8.6, <16.2.5), proxy bypass via segment-prefetch (GHSA-26hh-7cqf-hhc6, <16.2.6), and DoS (GHSA-8h8q-6873-q5fj / GHSA-mg66-mrh9-m8jx, <16.2.5).
- **Fix:** bump to **16.2.9** (latest 16.2.x; clears every listed range, all <16.2.7) + `npm audit fix` (non-breaking).
- **Scope:** `package.json` + `package-lock.json` only. Shipped as its **own PR** (per the council: framework bump = highest blast radius, must be independently attributable/revertable) — separate from the security/reliability hardening PR.

## Result
- `npm audit`: **23 vulnerabilities (4 high) → 3 (0 high; 1 low + 2 moderate, breaking-change-only)**.
- Verified: clean `next build` + full unit suite (1071) green.

## Companion
- The application-level security + reliability hardening (SSRF guard, admin-takeover, rate limiting, Notion timeout/retry, RLS revoke, etc.) is in `security-reliability-hardening-2026-06-18.md` / its PR.
