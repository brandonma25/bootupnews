# Mobile Navigation Fix — Bug-Fix Report

## Release Metadata
- Date: 2026-04-19
- Branch: `fix/mobile-navigation`
- PR: #55, `https://github.com/brandonma25/bootupnews/pull/55`

## GitHub Source-of-Truth Metadata
- Affected object level: Surface Placement.
- PR: #55, `https://github.com/brandonma25/bootupnews/pull/55`.
- Branch: `fix/mobile-navigation`.
- Head SHA: `e026ecf8ee49ae55f7a7cb68c06e61a4c3a22f17`.
- Merge SHA: `967247c1c89124a390673971725dfdc140610f53`.
- GitHub source-of-truth status: canonical pre-template bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #55 metadata and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Issue Summary
- Problem addressed: mobile users needed a dependable navigation drawer in the shared shell so they could open the menu, dismiss it cleanly, and move between the primary routes on phone-sized viewports.
- Root cause: the mobile shell relied on a minimal open-state interaction without full toggle semantics or cleanup when navigation state and viewport state changed, leaving the mobile drawer behavior insufficiently robust for MVP navigation expectations.

## Fix Applied
- Exact change: updated the shared `AppShell` mobile navigation to behave as a true drawer toggle, close on route or viewport changes, lock page scrolling while open, and animate the overlay and panel for clearer feedback.
- Files modified:
  - `src/components/app-shell.tsx`
  - `tests/dashboard.spec.ts`

## Prevention
- Keep mobile navigation behavior in the shared shell component and back it with Playwright coverage that verifies open, outside-close, route-close, and desktop non-regression paths.

## Validation
- Automated checks: `npm install`, `npm run lint || true`, `npm run test || true`, `npm run build`, `npx playwright test --project=chromium`, `npx playwright test --project=webkit`
- Human checks: preview validation is still required for signed-in and signed-out truth, session persistence, and final UX judgment on mobile devices.

## Remaining Risks / Follow-up
- Preview validation is still needed to confirm auth-state link behavior with real session data in Vercel.
