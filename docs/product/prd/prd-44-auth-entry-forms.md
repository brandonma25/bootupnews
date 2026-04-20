# PRD-44 — Auth Entry Forms

- PRD ID: `PRD-44`
- Canonical file: `docs/product/prd/prd-44-auth-entry-forms.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Provide standalone login, signup, and Google OAuth entry components for dedicated authentication pages.

## User Problem

Users need clear, focused authentication entry points outside the homepage modal so login and signup can be reached directly and tested as independent page flows.

## Scope

- Add `LoginForm` for `/login` with email, password, password visibility toggle, loading state, inline error state, and home redirect on success.
- Add `SignupForm` for `/signup` with email, password, password visibility toggle, field-level validation, API error state, and home redirect on success.
- Add reusable `GoogleAuthButton` for login and signup pages.
- Add `/login` and `/signup` pages that compose the new components.
- Add a local `Input` primitive matching existing UI conventions.

## Non-Goals

- OAuth callback handling.
- Signup confirmation flow redesign.
- Remember-me behavior.
- Confirm password field.
- Existing homepage auth modal rewrite.

## Implementation Shape / System Impact

The new components use the existing browser Supabase client for auth operations and Next.js client navigation for successful home redirects. The dedicated pages compose the forms and reusable Google button in a constrained single-column layout.

## Dependencies / Risks

- Depends on configured public Supabase environment variables for real auth execution.
- Real Google provider callback behavior remains a preview/human validation requirement.
- Supabase projects that require email confirmation may still require provider-side verification after signup.

## Acceptance Criteria

- Login submit is disabled until email and password are filled.
- Login shows `Incorrect email or password` on auth failure without clearing fields.
- Signup validates invalid email and short password inline.
- Signup shows `An account with this email already exists` for API errors.
- Google button shows loading while OAuth redirect is prepared and inline error if the OAuth start fails.
- Successful login/signup redirects to `/`.
- Components use Tailwind classes, local UI primitives, and no browser storage.

## Evidence and Confidence

- Repo evidence used: existing Supabase browser client, auth callback route, local `Button` primitive, and auth modal behavior.
- Confidence: High for component behavior; preview/human validation required for real provider OAuth.

## Closeout Checklist

- Scope completed: Login form, signup form, Google OAuth button, dedicated `/login` and `/signup` pages, unit tests, and Playwright smoke coverage.
- Tests run: `npm install`; `python3 scripts/validate-feature-system-csv.py`; `npm run lint || true`; `npm run test || true`; `npm run build`; focused auth Playwright smoke tests in Chromium and WebKit.
- Local validation complete: Yes, `http://localhost:3000/login` and `http://localhost:3000/signup` returned 200 locally, and focused auth Playwright checks passed.
- Preview validation complete, if applicable: Not yet. Real OAuth provider behavior still requires Vercel preview validation.
- Production sanity check complete, only after preview is good: Not yet.
- PRD summary stored in repo: Yes, this file.
- Bug-fix report stored in repo, if applicable: Not applicable.
- Google Sheets tracker updated and verified: Direct live Sheets update unavailable in this environment.
- If direct Sheets update is unavailable, fallback tracker-sync file created in `docs/operations/tracker-sync/` with exact manual update payload: Yes, `docs/operations/tracker-sync/2026-04-20-auth-entry-forms.md`.
