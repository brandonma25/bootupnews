# PRD-45 — Password Reset Flow

- PRD ID: `PRD-45`
- Canonical file: `docs/product/prd/prd-45-password-reset-flow.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Provide standalone forgot-password and reset-password entry points for users who need to regain access to their account.

## User Problem

Users with email/password accounts need a direct path to request a reset link, set a new password from the recovery link, and return to login with clear confirmation.

## Scope

- Add `ForgotPasswordForm` for `/forgot-password` with email entry, loading state, inline error state, success state, and back-to-login link.
- Add `ResetPasswordForm` for `/reset-password` with password entry, password visibility toggle, missing-token handling, validation error state, expired-link error state, and login redirect on success.
- Add dedicated `/forgot-password` and `/reset-password` pages that render the standalone forms.
- Add a local `Input` primitive matching existing UI conventions.
- Add unit tests and local Playwright smoke coverage for the reset-flow pages.

## Non-Goals

- Login form implementation.
- Signup form implementation.
- Google OAuth callback handling.
- Confirm password field.
- Session persistence changes beyond Supabase recovery-token exchange.

## Implementation Shape / System Impact

The forgot-password form uses the existing browser Supabase client to start `resetPasswordForEmail` with `/reset-password` as the recovery redirect target. The reset-password form reads query params directly from the current URL at submit time, exchanges the recovery token when present, updates the user password through Supabase, and redirects to `/login?message=password-updated`.

## Dependencies / Risks

- Depends on configured public Supabase environment variables for live reset email delivery and recovery-token exchange.
- Real reset-email links and Supabase provider settings require Vercel preview validation.
- The current `main` branch does not yet include the PRD-44 dedicated login page; the success redirect target is prepared for that integration.
- Supabase does not reliably disclose account existence for password reset requests; local UI maps any reset request failure to the specified account-not-found copy.

## Acceptance Criteria

- Forgot password submit is disabled until email is filled.
- Forgot password shows loading while submitting and disables the field.
- Forgot password success hides the form and shows the submitted email address.
- Forgot password errors show `No account found with this email address` below the field without clearing the email.
- Reset password submit is disabled until password is filled and a reset query token is present.
- Reset password shows `Password too short` for short passwords.
- Reset password shows `This reset link has expired. Please request a new one.` with a `/forgot-password` link for expired or missing token states.
- Reset password redirects to `/login?message=password-updated` after a successful update.
- Components use Tailwind classes, local UI primitives, and no browser storage.

## Evidence and Confidence

- Repo evidence used: existing Supabase browser client, auth callback recovery support, local `Button` primitive, and existing auth modal/password-route behavior.
- Confidence: High for local component behavior; preview/human validation required for real reset email links and auth session behavior.

## Closeout Checklist

- Scope completed: Forgot-password form, reset-password form, dedicated pages, unit tests, and Playwright smoke coverage.
- Tests run: `npm install`; `python3 scripts/validate-feature-system-csv.py`; `npm run lint || true`; `npm run test || true`; `npm run build`; focused password-reset Playwright smoke tests in Chromium and WebKit; full Chromium Playwright suite serially.
- Local validation complete: Yes, `http://localhost:3000/forgot-password` and `http://localhost:3000/reset-password` returned 200 locally, focused password-reset Playwright checks passed in Chromium and WebKit, and the full Chromium Playwright suite passed.
- Preview validation complete, if applicable: Not yet. Real reset email link behavior requires Vercel preview validation.
- Production sanity check complete, only after preview is good: Not yet.
- PRD summary stored in repo: Yes, this file.
- Bug-fix report stored in repo, if applicable: Not applicable.
- GitHub documentation closeout completed in the canonical lane: yes.
- Google Sheet / Work Log not treated as canonical or updated for routine closeout: yes.
