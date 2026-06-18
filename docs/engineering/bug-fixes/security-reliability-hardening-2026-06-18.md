# Security + Reliability Hardening (Phases 0–3) — 2026-06-18

Executes the council-reviewed, security-updated consolidated plan from the code-quality review. One branch, one commit per item, QA (typecheck + lint + targeted tests) after each. **Deferred by design** (council hard-gate): the `signals-editorial.ts` (A-1) and `data.ts` god-module splits — gated on "zero open branches touching the file" (~22 worktrees currently hold it). The Next.js bump ships as its **own** PR (highest blast radius, must be independently revertable).

## Phase 0 — foundation + truly-exploitable security set

### 0. Production typecheck gate
- **Problem:** No `typecheck` script and no `tsc` step in CI — 115 pre-existing type errors (all in `*.test.*` fixtures) sat uncaught, and vitest strips types so type drift in production code was invisible.
- **Fix:** `tsconfig.typecheck.json` (checks `src/` + `scripts/`, excludes `*.test.*`); `npm run typecheck` (production gate, **0 errors today**) + `npm run typecheck:all` (full, for the test-fixture burn-down); added a `Typecheck` step to the `pr-lint` CI job.
- **Tracked backlog:** 115 `*.test.*` type errors across 21 files — to be cleared before A-1 (the split) is ever attempted, since the full-repo typecheck is the safety net for that refactor.
- **QA:** `npm run typecheck` → 0 errors.

<!-- subsequent items appended below as they land -->
