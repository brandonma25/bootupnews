# Tracker Sync Fallback - Editorial History Ordering

## Reason
Direct Google Sheets tracker access was not used in this local implementation turn. This fallback records the manual tracker payload required by the repo closeout protocol.

## Manual Update Payload
- Work item: Editorial history ordering bug fix
- Branch: `fix/editorial-history-ordering`
- Status: `In Review`
- Owner: Codex
- Type: Bug fix
- Summary: Editorial history cards now sort by `briefing_date` descending with deterministic tie-breakers, preventing older edited cards from jumping above newer signal dates.
- Repo docs:
  - `docs/bugs/editorial-history-ordering.md`
  - `docs/engineering/bug-fixes/editorial-history-ordering.md`
- Validation:
  - `npm run lint`
  - `npm run build`
  - `npm run test -- src/lib/signals-editorial.test.ts src/app/dashboard/signals/editorial-review/page.test.tsx`
  - `npm run test -- src/components/landing/homepage.test.tsx src/lib/homepage-model.test.ts src/app/page.test.tsx`
  - `python3 scripts/release-governance-gate.py`
- Remaining validation:
  - Signed-in admin browser pass on the editorial review page.
  - Vercel preview validation before merge readiness.
