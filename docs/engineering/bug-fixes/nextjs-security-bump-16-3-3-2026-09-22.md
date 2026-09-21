# Next.js Security Bump 16.2.9 → 16.3.3 — 2026-09-22

Canonical PRD required: `No` — dependency security remediation / audit follow-up, not a product feature.

## Summary
- **Problem:** the CI `pr-audit` gate (`npm audit --audit-level=high --omit=dev`) started failing on `main` itself, with 10 production findings (1 critical, 6 high, 3 moderate). No PR caused it. New advisories were published to the live GitHub advisory DB against `next` ≤16.3.2 and the `postcss` 8.4.31 / `sharp` 0.34.5 that the whole 16.2.x line bundles. Transitive highs were also flagged in `nanoid`, `fast-uri`, `browserslist` and `brace-expansion`. Every open PR's `pr-audit` went red with it, including #329.
- **Why not stay on 16.2.x:** `next@16.2.12` (latest 16.2 patch) still pins `postcss` 8.4.31 and `sharp` ^0.34.5. A real install confirmed it leaves 1 critical + 2 high. The lowest clean release is 16.3.3.
- **Fix:** `next` and `eslint-config-next` → **16.3.3**, plus the non-breaking in-range transitive bumps.
- **Scope:** `package.json`, `package-lock.json`, plus one build-config change forced by the bump (see *Collateral*). No application code changed.

## Advisories cleared

| Package | Before | After | Severity |
| --- | --- | --- | --- |
| `next` | 16.2.9 | **16.3.3** | critical |
| `postcss` (via `next`) | 8.4.31 | 8.5.23 | high |
| `sharp` (via `next`) | 0.34.5 | 0.35.4 | high |
| `nanoid` | 3.3.x | 3.3.19 | high |
| `fast-uri` | 3.1.x | 3.1.8 | high |
| `browserslist` | 4.28.x | 4.29.0 | high |
| `brace-expansion` | — | in-range bump | high |
| `dompurify` | 3.4.x | 3.4.15 | moderate |
| `fflate` | 0.4.8 | 0.4.9 | moderate |
| `baseline-browser-mapping` | 2.x | 2.11.25 | moderate |

The `next` bump alone clears 11 advisories, including unauthenticated RCE in the Image Optimization API (GHSA-2xp9-vwfh-vxw4), unauthenticated RCE on Windows-hosted servers (GHSA-p293-qw3h-jr36), middleware/proxy bypass under Turbopack + single locale (GHSA-6gpp-xcg3-4w24), SSRF in rewrites via attacker-controlled destination hostname (GHSA-p9j2-gv94-2wf4), SSRF in Server Actions on custom servers (GHSA-89xv-2m56-2m9x), Server Actions DoS (GHSA-m99w-x7hq-7vfj), and response-body cache confusion (GHSA-68g3-v927-f742, GHSA-4633-3j49-mh5q).

## Why 16.3.3 and not 16.3.5

**16.3.3 is the lowest 16.3.x that clears the advisories.** The `next` advisory range is `9.3.4-canary.0 - 16.3.2`, and every 16.3.x pins the fixed `postcss` 8.5.23 and resolves `sharp` (`^0.35.3`, optional) to the fixed 0.35.4. `npm audit fix --force` proposed 16.3.5, but that is the latest patch, not the minimum required.

Worth revisiting on the next bump: pinning to the exact minimum leaves zero headroom, so the next advisory published against the 16.3.x line re-reds the gate immediately. Taking the latest patch within the same minor costs nothing in migration risk and buys slack.

## Note on `npm audit fix`

On npm 10.9.7 / Node 22, `npm audit fix` crashes with `Cannot read properties of null (reading 'edgesOut')` while walking the `vitest → jsdom → canvas` optional peer set (an `@npmcli/arborist` bug in `#loadPeerSet`). It reproduces on `main` before any of these changes, so it is not caused by this bump, but it is **environment-dependent** — other toolchain versions complete the same fix normally.

Where it crashes, the equivalent in-range bumps can be applied with `npm update` on the named packages. The resulting tree matches what `npm audit fix` produces: `postcss` dedupes to a single top-level 8.5.23 and the nested `next/node_modules/postcss` disappears entirely.

## Collateral: Next 16.3 widened build-time type checking

The bump broke `npm run build`. **Next 16.3 type-checks every file in the tsconfig `include` set during `next build`, where 16.2.9 did not.** Since `tsconfig.json` includes `**/*.ts`, the build began failing on the `*.test.*` fixture type backlog that `tsconfig.typecheck.json` deliberately excludes (the 115-error backlog documented in `security-reliability-hardening-2026-06-18.md`).

Confirmed by isolation: a clean `main` worktree builds green; the same worktree with `next@16.3.3` and **no other change** reproduces the failure.

**Fix:** a new `tsconfig.build.json` (extends `tsconfig.json`, excludes `**/*.test.ts` / `**/*.test.tsx`), wired via `typescript.tsconfigPath` in `next.config.ts`. `next build` now enforces exactly the same scope as the `typecheck` production gate — no type safety was weakened, and `typecheck:all` still sees the full backlog.

Worth knowing for the eventual backlog burn-down: `next build` is now a second consumer of that exclusion decision, not just the `typecheck` script.

## Result
- **Production dependencies** (`npm audit --audit-level=high --omit=dev`): **found 0 vulnerabilities**, exit 0.
- CI green on the PR: `pr-audit`, `pr-build`, `pr-lint`, `pr-unit-tests`, `pr-e2e-chromium`, `pr-e2e-webkit`, `release-governance-gate`, Vercel preview.
- **Dev-only residue:** 6 advisories remain in test tooling (`vitest`, `esbuild`, `undici`, `js-yaml`, `@humanfs/node`). These have zero production blast radius and are not covered by the `--omit=dev` gate. Left alone deliberately rather than widening a security remediation into a test-tooling upgrade that could destabilize the suite — worth a separate PR.
- **Caveat:** `npm audit` queries the live advisory DB, so this is a point-in-time snapshot. New advisories can turn the gate red again without any code change.

## Verification

All checks run from a clean `npm ci`:

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run lint` | pass — 0 errors, 4 pre-existing warnings |
| `npm test` | 134 files, 1172 tests, all pass |
| `npm run build` | pass |
| `npm audit --audit-level=high --omit=dev` | **found 0 vulnerabilities** |

No application code or runtime behavior changed.

## Companion
- Precedent: `nextjs-security-bump-16-2-9-2026-06-18.md` (#326). Like that bump, this ships as its own PR so the framework change can be attributed and reverted on its own. That record anticipated exactly this recurrence: advisory counts are a point-in-time snapshot, so a clean tree re-reds as new advisories are published.
