# Remove Hardcoded Feed Loading Time Messaging — Bug-Fix Record

## Classification
- Title: Remove hardcoded feed loading time messaging
- Type: Remediation (UX defect)

## Summary
- Problem addressed: the route-level loading UI displayed a fixed-duration loading estimate, which created a false expectation that loading should take a predictable amount of time.
- Root Cause: Static placeholder copy not defined in the artifact system and not tied to real performance.

## Fix
- Fix: Replaced time-based loading message with neutral loading state.
- Exact change: replaced the time-based loading sentence with the neutral loading copy `Preparing your feed...` while preserving the existing skeleton layout and component structure.
- Related PRD: none. This is remediation alignment against the approved V1 artifacts, not a net-new product feature.

## Validation
- Automated checks:
  - `npm install` passed with the existing npm audit warning.
  - `npm run lint || true` passed.
  - `npm run test || true` passed: 47 files, 243 tests.
  - `npm run build` passed with existing Next.js workspace-root and module-type warnings.
  - `npx playwright test --project=chromium --workers=1` passed: 28 tests.
  - `npx playwright test --project=webkit --workers=1` passed: 28 tests.
  - Local targeted browser check passed for `/` and signed-out `/account`: removed duration copy absent, one main landmark present, no framework error overlay, no browser console errors.
- Human checks:
  - Validate locally and in Vercel preview that the loading state no longer suggests a fake duration and that the skeleton layout still feels correct.

## Tracker Closeout
- Google Sheets tracker row updated and verified: not completed in this local Codex session.
- Fallback tracker-sync file, if direct Sheets update was unavailable: `docs/operations/tracker-sync/2026-04-21-remove-hardcoded-feed-loading-time-messaging-tracker-sync.md`.

## Remaining Risks / Follow-up
- Loading duration perception still depends on actual runtime performance, which this remediation does not change.
