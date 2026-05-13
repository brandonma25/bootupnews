# Auth Test Stability

## GitHub Source-of-Truth Metadata
- Affected object level: Surface Placement test coverage; production content objects were not changed.
- PR: #27, `https://github.com/brandonma25/bootupnews/pull/27`.
- Branch: `fix/auth-test-stability`.
- Head SHA: `456eb933ee91c84ae0281d272a3149d81c84b004`.
- Merge SHA: `9cf9c11b8788f8151b0adab2092ddcbc3add46d4`.
- GitHub source-of-truth status: canonical pre-template bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #27 metadata, file history, and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Failing Tests
- `src/components/auth/auth-modal.test.tsx`
- `src/lib/data.auth.test.ts`

## Root Cause By File
- `src/components/auth/auth-modal.test.tsx`
  - The test used a dynamic import of the component plus a direct `window.location` replacement.
  - That setup passed when run alone, but became brittle inside the wider suite where other files also mock adjacent auth modules.
- `src/lib/data.auth.test.ts`
  - The test used dynamic imports of both the mocked dependency and the module under test.
  - That made the assertions sensitive to suite-level module cache and mock ordering, even though the real auth behavior was correct.

## Fix Applied
- Converted both tests to use stable mocked bindings with normal imports after hoisted `vi.mock(...)` declarations.
- Replaced the invasive `window.location` override with `window.history.replaceState(...)` in the auth modal test.
- Reset only the relevant mocks in `beforeEach` so each test starts from a deterministic state.

## Whether Any Production Code Changed
- No. The fix is test-only.

## Regression Risk
- Low. The updated tests keep the same behavioral assertions while reducing cross-suite mock brittleness.

## Result
- Direct auth test runs now pass.
- Broader auth-related runs now pass.
- The full Vitest suite now passes.
