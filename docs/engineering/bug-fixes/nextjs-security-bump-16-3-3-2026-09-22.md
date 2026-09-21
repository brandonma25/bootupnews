# Next.js Security Bump 16.2.9 → 16.3.3 — 2026-09-22

Canonical PRD required: `No` — dependency security remediation / audit follow-up, not a product feature.

## Summary
- **Problem:** the CI `pr-audit` gate (`npm audit --audit-level=high --omit=dev`) started failing on `main` itself, with 10 production findings (1 critical, 6 high, 3 moderate). No PR caused it. New advisories were published to the live GitHub advisory DB against `next` ≤16.3.2 and the `postcss` 8.4.31 / `sharp` 0.34.5 that the whole 16.2.x line bundles. Examples: Image Optimization RCE (GHSA-2xp9-vwfh-vxw4), Server Actions DoS (GHSA-m99w-x7hq-7vfj), SSRF in rewrites (GHSA-p9j2-gv94-2wf4). Transitive highs were also flagged in `nanoid`, `fast-uri`, `browserslist` and `brace-expansion`. Every open PR's `pr-audit` went red with it, including #329.
- **Why not stay on 16.2.x:** `next@16.2.12` (latest 16.2 patch) still pins `postcss` 8.4.31 and `sharp` ^0.34.5. A real install confirmed it leaves 1 critical + 2 high. The lowest clean release is 16.3.3.
- **Fix:** `next` and `eslint-config-next` → **16.3.3**, then `npm audit fix` (non-breaking) for the transitive packages.
- **Build-config change:** Next 16.3 type-checks every file in the tsconfig `include` set during `next build`. That surfaced the known `*.test.*` fixture type backlog, which `tsconfig.typecheck.json` deliberately excludes (see `security-reliability-hardening-2026-06-18.md`), and the build failed. The fix is a new `tsconfig.build.json` (tsconfig.json minus tests), wired via `typescript.tsconfigPath` in `next.config.ts`. `next build` now matches the production type gate, and `typecheck:all` still sees the backlog.

## Result
- **Production dependencies** (`npm audit --omit=dev`): **found 0 vulnerabilities**.
- CI green on the PR: `pr-audit`, `pr-build`, `pr-lint`, `pr-unit-tests`, `pr-e2e-chromium`, `pr-e2e-webkit`, Vercel preview.
- **Caveat:** `npm audit` queries the live advisory DB, so this is a point-in-time snapshot. New advisories can turn the gate red again without any code change.

## Companion
- Precedent: `nextjs-security-bump-16-2-9-2026-06-18.md` (#326). Like that bump, this ships as its own PR so the framework change can be attributed and reverted on its own.
