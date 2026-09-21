# Next.js Security Bump 16.2.9 → 16.3.3 — 2026-09-21

Canonical PRD required: `No` — dependency security remediation / npm audit follow-up, not a product feature.

Follows `nextjs-security-bump-16-2-9-2026-06-18.md`, which anticipated exactly this: advisory counts are a point-in-time snapshot against the live GitHub advisory DB, so a clean tree re-reds as new advisories are published.

## Summary
- **Problem:** the `pr-audit` CI gate (`npm audit --audit-level=high --omit=dev`) began failing on **`origin/main` itself** — 16 vulnerabilities, 8 high, 1 critical (verified 2026-09-22 against main's `package-lock.json`). No recent PR caused this; the advisories were newly published against the pinned tree.
- **Fix:** bump **next 16.2.9 → 16.3.3**, bump `eslint-config-next` 16.2.2 → 16.3.3 to match, and apply the in-range transitive bumps `npm audit fix` would have produced.
- **Scope:** `package.json`, `package-lock.json`, plus one build-config change forced by the bump (see *Collateral* below). No application code changed.

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

The `next` bump alone clears 11 advisories, including unauthenticated RCE in the Image Optimization API (GHSA-2xp9-vwfh-vxw4), unauthenticated RCE on Windows-hosted servers (GHSA-p293-qw3h-jr36), middleware/proxy bypass under Turbopack + single locale (GHSA-6gpp-xcg3-4w24), SSRF in rewrites via attacker-controlled destination hostname (GHSA-p9j2-gv94-2wf4), SSRF in Server Actions on custom servers (GHSA-89xv-2m56-2m9x), and response-body cache confusion (GHSA-68g3-v927-f742, GHSA-4633-3j49-mh5q).

## Why 16.3.3 and not 16.3.5

**16.3.3 is the lowest 16.3.x that clears the advisories.** The `next` advisory range is `9.3.4-canary.0 - 16.3.2`, and every 16.3.x pins the fixed `postcss` 8.5.23 and resolves `sharp` (`^0.35.3`, optional) to the fixed 0.35.4. `npm audit fix --force` proposed 16.3.5, but that is simply the latest patch, not the minimum required to clear the advisories.

Worth revisiting on the next bump: pinning to the exact minimum leaves zero headroom, so the next advisory published against the 16.3.x line re-reds the gate immediately. Taking the latest patch within the same minor costs nothing in migration risk and buys slack.

## `npm audit fix` could not be run directly

`npm audit fix` crashes on npm 10.9.7 with `Cannot read properties of null (reading 'edgesOut')` while walking the `vitest → jsdom → canvas` optional peer set (an `@npmcli/arborist` bug in `#loadPeerSet`). **This reproduces on `main` before any of these changes** — it is not caused by this bump.

The equivalent in-range bumps were applied with `npm update` on the named packages instead. The resulting tree is what `npm audit fix` would have produced; `postcss` deduped to a single top-level 8.5.23, and the nested `next/node_modules/postcss` disappeared entirely.

## Collateral: Next 16.3 widened build-time type checking

The bump broke `npm run build`. **Next 16.3 type-checks every file in the tsconfig `include` set at build time, where 16.2.9 did not.** Since `tsconfig.json` includes `**/*.ts`, `next build` began failing on the `*.test.*` fixture type backlog that `tsconfig.typecheck.json` deliberately excludes (the 115-error backlog documented in `security-reliability-hardening-2026-06-18.md`).

Confirmed by isolation: a clean `main` worktree builds green; the same worktree with `next@16.3.3` and **no other change** reproduces the failure.

**Fix:** added `tsconfig.build.json` (extends `tsconfig.json`, excludes `**/*.test.ts` / `**/*.test.tsx`) and pointed `typescript.tsconfigPath` at it in `next.config.ts`. `next build` now enforces exactly the same scope as the `typecheck` production gate — no type safety was weakened, and `typecheck:all` still sees the full backlog.

This is worth knowing for the eventual backlog burn-down: `next build` is now a second consumer of that exclusion decision, not just the `typecheck` script.

## Result
- **Production dependencies** (`npm audit --audit-level=high --omit=dev`): **found 0 vulnerabilities**, exit 0. The gate is green again.
- **Dev-only residue:** 6 advisories remain in test tooling (`vitest`, `esbuild`, `undici`, `js-yaml`, `@humanfs/node`). These have zero production blast radius and are not covered by the `--omit=dev` gate. Left alone deliberately rather than widening a security remediation into a test-tooling upgrade that could destabilize the suite — worth a separate PR.
- **Caveat (unchanged from the 16.2.9 record):** `npm audit` queries the live GitHub advisory DB, so these counts are a **point-in-time snapshot**. This gate will red again on its own schedule.

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
