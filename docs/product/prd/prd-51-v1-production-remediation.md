# PRD-51 — V1 Production Remediation

- PRD ID: `PRD-51`
- Canonical file: `docs/product/prd/prd-51-v1-production-remediation.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Bring the production-facing app back into alignment with the locked V1 artifact system by replacing the legacy shell and wiring the required V1 routes, gates, Account controls, and shared briefing detail behavior.

## User Problem

The production UI had drifted from the locked V1 product model. Users could still reach legacy first-class destinations, while required V1 surfaces such as `/account` and `/briefing/[date]` were missing or incomplete. Logged-out users also saw inconsistent gates and auth redirects.

## Scope

- Replace first-class navigation with Home, History, and Account.
- Use a desktop sidebar and mobile bottom tab bar.
- Add `/account` with profile, RSS feed, category preference, newsletter, and sign-out controls.
- Add `/briefing/[date]` as the shared briefing detail route.
- Soft-gate category and History access for logged-out users while keeping Top Events public.
- Preserve login, signup, forgot-password, Google OAuth entry, and `redirectTo` behavior.
- Add the V1 Account schema migration for avatar, newsletter, category preferences, and nullable source topic ownership.
- Add focused local tests and repo-safe remediation documentation.

## Non-Goals

- Do not introduce product behavior outside artifacts0-10.
- Do not replace the existing homepage model fallback with an unshipped backend contract.
- Do not add categories beyond `tech`, `finance`, and `politics`.
- Do not use browser-local-only substitutes for V1 Account persistence.
- Do not validate production before local and Vercel preview validation.

## Implementation Shape / System Impact

This remediation spans the Experience and Data layers. The app shell, route surfaces, auth redirects, Account controls, shared briefing detail component, and focused Playwright coverage are updated together because the locked V1 workflow depends on their integration. The Supabase migration is included so deployed Account controls can persist the fields required by artifacts6 and artifacts8.

## Dependencies / Risks

- Depends on existing auth/session routing and Supabase session helpers.
- Depends on existing briefing data shape and homepage fallback modeling.
- Deployed Account persistence depends on the remote Supabase migration being applied before preview or production validation.
- Preview validation remains required for cookies, OAuth, session persistence, redirects, and deployed SSR behavior.

## Acceptance Criteria

- Primary navigation exposes Home, History, and Account only.
- Mobile uses the fixed bottom tab bar instead of the legacy drawer.
- `/account` redirects logged-out users to `/login?redirectTo=/account`.
- `/account` shows profile, RSS, category preference, newsletter, and sign-out controls for authenticated users.
- `/briefing/[date]` renders the shared briefing detail model.
- Home keeps Top Events public and soft-gates logged-out category access.
- History soft-gates logged-out users and links authenticated date groups to `/briefing/[date]`.
- Login and signup preserve `redirectTo` destinations after successful auth.
- Forgot password remains reachable from login.
- Account schema fields are represented by a repo migration and schema update.

## Evidence and Confidence

- Repo evidence used:
  - Locked V1 artifact files supplied with the remediation request.
  - `docs/product/briefs/v1-production-remediation-2026-04-21.md`
  - `docs/engineering/bug-fixes/v1-production-remediation-2026-04-21.md`
  - `docs/engineering/testing/v1-production-remediation-local-validation-2026-04-21.md`
  - `supabase/migrations/20260421120000_v1_account_controls.sql`
- Confidence: High for local route, shell, soft-gate, and migration coverage. Medium for deployed auth/session truth until Vercel preview validation and human auth checks complete.

## Closeout Checklist

- Scope completed: Implementation branch created and pushed for PR review.
- Tests run: See `docs/engineering/testing/v1-production-remediation-local-validation-2026-04-21.md`.
- Local validation complete: Partially complete, with focused Chromium route coverage passing after conflict resolution.
- Preview validation complete, if applicable: Not complete; branch preview must still be validated.
- Production sanity check complete, only after preview is good: Not complete.
- PRD summary stored in repo: Yes.
- Bug-fix report stored in repo, if applicable: Yes.
- Google Sheets tracker updated and verified: Direct live Sheets update unavailable in this environment.
- If direct Sheets update is unavailable, fallback tracker-sync file created in `docs/operations/tracker-sync/` with exact manual payload: Yes.
