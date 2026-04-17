# Google OAuth PKCE Callback Failure (Production)

## Summary
Google OAuth could start, but the callback did not reliably complete in hosted environments. This caused failed sign-in attempts, lost sessions after redirect, and preview deployments that could jump to the production domain during auth.

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
