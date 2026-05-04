# Google OAuth PKCE Callback Failure (Production)

## Summary
Google OAuth could start, but the callback did not reliably complete in hosted environments. This caused failed sign-in attempts, lost sessions after redirect, and preview deployments that could jump to the production domain during auth.

## GitHub Source-of-Truth Metadata
- Affected object level: Surface Placement.
- PR: #8, `https://github.com/brandonma25/daily-intelligence-aggregator/pull/8`; #9, `https://github.com/brandonma25/daily-intelligence-aggregator/pull/9`; #12, `https://github.com/brandonma25/daily-intelligence-aggregator/pull/12`.
- Branch: `feature/google-oauth-production-callback-fix`; `feature/auth-preview-host-fix`; `docs/google-oauth-bug-report`.
- Head SHA: #8 `9160be28e0ce60855400034b989a32d24bebee77`; #9 `e8f63e9911a0f2b7f0858ebcad0de4a1d18334d1`; #12 `076539365aa73a3ab8f06feb1d74fad40d13b7de`.
- Merge SHA: #8 `a0a4e0698cc34d302234c1ce0e8800b81f286b60`; #9 `040e326602f6f6ed55cab17623df076d92bd3ec2`; #12 `92cefcd3f3253a1af5b774c28fcbdbdac875efb1`.
- GitHub source-of-truth status: canonical historical bug-fix record enriched with source-of-truth metadata on 2026-05-04; PR #45 later moved the record into the strict documentation taxonomy.
- External references reviewed, if any: GitHub PR #8, #9, #12, and #45 metadata; file history; existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Symptoms
- "The sign-in callback could not be completed"
- `/?auth=callback-error`
- Session not persisting after login
- Preview to production redirect issue during auth

## Root Causes
- Proxy middleware interfered with the `/auth/callback` lifecycle before the code exchange completed.
- Manual redirect handling (`skipBrowserRedirect` plus `window.location.assign`) broke PKCE verifier persistence.
- Server-side callback URL construction used `env.appUrl`, which could force the production domain in preview environments.
- Callback URL handling was not consistently request-origin aware.

## Fixes Implemented
- Bypass proxy auth logic on `/auth/callback`.
- Remove manual redirect handling and allow Supabase to control the OAuth browser flow.
- Ensure the PKCE verifier is stored through the native Supabase browser auth flow.
- Implement request-origin-based callback URL resolution using:
  - `origin`
  - `x-forwarded-host`
  - `x-forwarded-proto`
  - `host`

## Final Architecture
- Native `signInWithOAuth` redirect flow in the browser
- SSR callback exchange via `exchangeCodeForSession`
- Proxy-safe callback path
- Environment-aware host resolution based on the active request

## Verification Steps
- Preview login succeeds on the preview hostname
- Production login succeeds on the production hostname
- Session persists after refresh
- Supabase auth cookies (`sb-...`) are present for the active domain
- No `callback-error` redirect appears
- No preview to production host leakage occurs during auth

## Lessons Learned
- Do not override Supabase OAuth redirect behavior unless necessary.
- PKCE flows are sensitive to redirect timing and storage behavior.
- Middleware must not interfere with the auth callback lifecycle.
- Never hardcode or fall back to the production domain for dynamic environments.
- Always validate auth in preview before promoting to production.

## Status
Resolved

## Related Branches / Commits
- `feature/google-oauth-production-callback-fix`
- `feature/google-oauth-pkce-cookie-fix`
- `feature/auth-preview-host-fix`
