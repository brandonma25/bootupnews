# Tracker Sync Fallback — Static Stories + Editorial Page Regression

## Reason
- Direct live Google Sheets verification was not available in this session, so this file records the exact manual tracker update payload required by repo policy.

## Suggested Update
- Date: 2026-04-26
- Work type: bug-fix regression
- Branch: `bugfix/static-stories-editorial-page-regression`
- Status: `In Review`
- PRD: none required for this bug-fix regression
- Repo bug docs:
  - `docs/bugs/2026-04-26-regression-static-stories-editorial-page.md`
  - `docs/engineering/bug-fixes/2026-04-26-static-stories-editorial-page-regression.md`
- Summary:
  - Restored homepage/category rendering to stored `signal_posts` snapshots instead of demo briefing copy.
  - Removed render-time Top 5 generation from editorial review so the route now degrades safely to sign-in/empty-state behavior.
  - Removed dashboard generation/sync work from `/account` SSR so the route reads only auth, profile, and sources and no longer trips the recoverable server error in preview.
- Validation:
  - `npm install`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run dev`
  - `PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test tests/smoke/homepage.spec.ts tests/homepage.spec.ts --project=chromium`

## Manual Follow-up
- Update the appropriate tracker row or intake lane with the bug-fix summary above.
- Re-read the live row after the update before claiming tracker closeout.
