# Auth Callback Provider Error Redirect — Bug-Fix Record

## Summary
- Problem addressed: provider callback error URLs could remain stuck on `/auth/callback?error=...` in local Playwright environments instead of redirecting to `/?auth=callback-error`.
- Root cause: the route parsed `NEXT_PUBLIC_SUPABASE_URL` before handling provider error query params, so a missing or empty local Supabase URL could throw before redirect logic ran.

## GitHub Source-of-Truth Metadata
- Affected object level: Surface Placement.
- PR: #72, `https://github.com/brandonma25/daily-intelligence-aggregator/pull/72`.
- Branch: `fix/auth-callback-provider-error-redirect`.
- Head SHA: `0ae89ffb21641165bef8ac2cf2f8fe9b1558d99e`.
- Merge SHA: `96dfd8b949f8fa48bc101f28f4e89709937ac2f8`.
- GitHub source-of-truth status: canonical pre-template bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #72 metadata and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Fix
- Exact change: handle `error`, `error_code`, and `error_description` query params at the top of the callback route, then make Supabase URL host parsing nullable when the env value is absent.
- Related PRD: not applicable; targeted auth routing bug fix.

## Validation
- Automated checks: passed `npm run lint`, `npm run build`, `npm run test` (199 tests), and `npx playwright test --project=chromium --workers=1` (11 tests).
- Human checks: preview auth callback and real provider session behavior still require human validation before merge.

## Documentation Closeout
- GitHub documentation closeout completed in the canonical lane: yes.
- Google Sheet / Work Log not treated as canonical or updated for routine closeout: yes.

## Remaining Risks / Follow-up
- Preview remains the source of truth for hosted auth, cookie, redirect, and environment behavior.
