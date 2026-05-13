# Bug Fix: OAuth Session Persistence

## GitHub Source-of-Truth Metadata
- Affected object level: Surface Placement.
- PR: no PR found for the historical implementation branches listed below; canonical documentation was backfilled in PR #45, `https://github.com/brandonma25/bootupnews/pull/45`.
- Branch: historical branches listed by this record: `feature/auth-real-session`, `feature/google-auth-config-fix`, `feature/oauth-session-finalization-fix`.
- Head SHA: not recoverable from GitHub PR metadata for the listed historical branches; PR #45 documentation head SHA `96bdd47ab6db18002ec38035d890f69c41dedd64`.
- Merge SHA: not recoverable from GitHub PR metadata for the listed historical branches; PR #45 documentation merge SHA `c182403f25f98aa40d82073a3eedb24328ee926c`.
- GitHub source-of-truth status: canonical historical bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #45 metadata, branch-name PR search, file history, and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: the historical branch refs were not found in GitHub PR metadata or remote refs during this pass; no branch deletion was performed in this metadata enrichment branch.

## Problem
Google sign-in could start and sometimes appear to complete, but the app did not reliably remember signed-in state afterward. Users could still land on the homepage showing public-mode prompts, and later login attempts could fail with callback-related errors.

## Symptoms
- False `Authentication is not configured for this environment yet` blocker
- `redirect_uri_mismatch` during Google OAuth setup
- OAuth return landing on `/?code=...`
- Homepage still showing signed-out/public-mode messaging after login
- Callback error on later login attempts
- Session not surviving refresh or navigation reliably

## Root Cause
This was a chain of related auth issues rather than one single bug:
- Browser env detection mismatch in client code caused a false missing-config blocker
- Google/Supabase provider redirect configuration mismatch caused `redirect_uri_mismatch`
- OAuth finalization logic only handled `/auth/callback` reliably, while some returns could land on `/?code=...`
- `/auth/callback` could discard a response containing fresh auth cookies if `bootstrapUserDefaults()` failed after `exchangeCodeForSession()`

## Fix Attempts
- `feature/auth-real-session`
  Added real auth/session handling and removed fake demo-path behavior, but did not fully solve Google OAuth persistence.
- `feature/google-auth-config-fix`
  Fixed browser-side public env detection and compatibility for `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. This removed the false missing-config blocker and allowed Google OAuth initiation.
- `feature/oauth-session-finalization-fix`
  Added callback normalization for stray `/?code=...` returns and later fixed cookie loss when post-login bootstrap failed after successful code exchange. Final browser verification now confirms the OAuth session completes and persists correctly.

## Current Status
Fixed.
- Browser env detection mismatch
- OAuth initiation with the correct public config
- Local login now returns to `localhost`
- Successful login lands on `/dashboard`
- Signed-in state persists after login
- Stray OAuth return normalization into `/auth/callback`
- Callback cookie loss when post-login bootstrap fails

## Verification
- Successful Google sign-in
- Local login returns to `localhost`
- Successful login lands on `/dashboard`
- Signed-in state persists after login
- Refresh persists session
- Homepage no longer shows sign-in prompts after login
- Sign-out works cleanly
- No raw `?code=...` final URL

## Final Verification Note
Manual in-browser verification is complete: local Google OAuth now returns to `localhost`, finishes on `/dashboard`, and the signed-in session remains intact after login and refresh.

## Related Branches
- `feature/auth-real-session`
- `feature/google-auth-config-fix`
- `feature/oauth-session-finalization-fix`
