# Human Auth / Session Gate

Use this checklist for every release that can affect auth, cookies, redirects, SSR, or session behavior.

Automated Chromium and WebKit smoke may cover signed-out truth, auth entry surfaces, and callback-error handling, but they do not replace this preview gate for real provider behavior.

## Required Human Checks
- Google OAuth sign-in succeeds from the signed-out homepage or auth modal.
- Email/password sign-in succeeds if that flow is enabled for the release.
- Auth callback returns to the intended page without redirect loops or incorrect fallback routing.
- Refreshing the browser while signed in preserves the correct signed-in state.
- Navigating between `/` and `/dashboard` keeps signed-in versus signed-out truth accurate.
- Signing out fully clears the session and returns the app to the correct signed-out state.
- Final product judgment: auth-sensitive UX feels correct in preview and is safe to merge.

## Record
- Preview URL:
- Tester:
- Date:
- Result:
- Notes:
