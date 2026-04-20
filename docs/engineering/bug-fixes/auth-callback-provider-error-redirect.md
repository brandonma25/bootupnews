# Auth Callback Provider Error Redirect — Bug-Fix Record

## Summary
- Problem addressed: provider callback error URLs could remain stuck on `/auth/callback?error=...` in local Playwright environments instead of redirecting to `/?auth=callback-error`.
- Root cause: the route parsed `NEXT_PUBLIC_SUPABASE_URL` before handling provider error query params, so a missing or empty local Supabase URL could throw before redirect logic ran.

## Fix
- Exact change: handle `error`, `error_code`, and `error_description` query params at the top of the callback route, then make Supabase URL host parsing nullable when the env value is absent.
- Related PRD: not applicable; targeted auth routing bug fix.

## Validation
- Automated checks: passed `npm run lint`, `npm run build`, `npm run test` (199 tests), and `npx playwright test --project=chromium --workers=1` (11 tests).
- Human checks: preview auth callback and real provider session behavior still require human validation before merge.

## Tracker Closeout
- Google Sheets tracker row updated and verified: not performed in this local fix pass.
- Fallback tracker-sync file, if direct Sheets update was unavailable: not created; this is an unmapped targeted bug fix and will be handled through PR review if tracker mapping is required.

## Remaining Risks / Follow-up
- Preview remains the source of truth for hosted auth, cookie, redirect, and environment behavior.
