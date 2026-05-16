# Google Auth Callback Error Suppression — Bug-Fix Record

## Summary
- Problem addressed: after a successful Google OAuth login, Safari sometimes replays the OAuth redirect chain, causing a second hit to Supabase's callback endpoint that returns "400: State has already been used". Supabase's 303 redirect then lands the already-authenticated user on `/?auth=callback-error`, showing a confusing "sign-in could not be completed" error even though the session was created successfully.
- Root cause: the homepage unconditionally displayed the `callback-error` auth message without checking whether the user was already authenticated. A successful first OAuth exchange + a Safari-replayed duplicate callback produced the false error state.

## GitHub Source-of-Truth Metadata
- Affected object level: Surface Placement.
- PR: #245, `https://github.com/brandonma25/bootupnews/pull/245`.
- Branch: `fix/source-url-nullable`.
- Head SHA: `74edefe`.

## Fix
- Exact change: in `src/app/page.tsx`, suppress the `callback-error` auth state when `pageState.viewer` is already set — i.e., the user is authenticated. The raw auth param is still passed through for all other error states.
- Secondary fix: set `SUPABASE_SERVICE_ROLE_KEY` in Vercel production (was empty `""`), which was silently breaking homepage editorial overrides and category article loading.
- Related PRD: not applicable; targeted auth UX bug fix.

## Validation
- Automated checks: `next build` passes, "ƒ Proxy (Middleware)" confirms proxy.ts is active.
- Human checks: Google OAuth flow on production should be verified after merge.

## Remaining Risks / Follow-up
- The duplicate Safari callback replay is a browser-side behavior and cannot be fully prevented server-side. The fix handles the resulting UX failure gracefully.
- `SUPABASE_SERVICE_ROLE_KEY` activates on the next production deployment after merge to main.
