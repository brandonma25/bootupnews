# Tracker Sync Fallback — Production Homepage 500 Ingestion SSR Hotfix

## Reason
- Direct Google Sheets access was not available in this session, so this file records the exact manual tracker payload required by repo policy.

## Suggested Update
- Date: 2026-04-26
- Work type: hotfix / bug-fix
- Branch: `hotfix/prod-homepage-500-ingestion-ssr`
- Status: `In Review`
- PRD: none required for this hotfix
- Repo bug-fix doc: `docs/engineering/bug-fixes/2026-04-26-prod-homepage-500-ingestion-ssr.md`
- Summary: Isolated homepage SSR from ingestion and RSS parser imports by switching `/`, `/history`, `/briefing/[date]`, and `/signals` to persisted read models and lazy-loading pipeline helpers in `src/lib/data.ts`.
- Validation:
  - `npm install`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run dev`
  - `npx playwright test tests/smoke/homepage.spec.ts tests/homepage.spec.ts --project=chromium`

## Manual Follow-up
- Update the appropriate row in `Features Table` or route this hotfix through the correct intake/review lane.
- Re-read the live row after the update before marking tracker closeout complete.
