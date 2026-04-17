# PRD-5 — Google OAuth Onboarding Entry

- PRD ID: `PRD-5`
- Canonical file: `docs/product/prd/prd-05-google-oauth-onboarding-entry.md`

## Objective
- Add the first Google OAuth entry path so users can begin sign-in through a provider-based login instead of password-only flows.

## User Problem
- Users need a low-friction sign-in path into the product; password-only entry adds unnecessary friction.

## Scope
- Google OAuth launch entrypoints in the auth modal.
- Homepage integration for provider login.
- OAuth callback and auth flows that reuse the existing default-bootstrap path after sign-in.

## Non-Goals
- Callback-host correctness, PKCE safety, and durable session routing fixed later under PRD-14 bug work.
- Preview and production auth-environment governance.
- Full account-management settings.

## Implementation Shape / System Impact
- The auth surface expands beyond password login to include provider-based entry.
- After successful sign-in, OAuth uses the same default-bootstrap path already used by the app's auth flows.

## Dependencies / Risks
- Dependencies:
  - Landing-page auth surface and default topic bootstrap.
- Risks:
  - Provider login remains sensitive to callback-host and session-cookie handling.
  - This first-pass flow can appear successful before later auth hardening resolves persistence edge cases.

## Acceptance Criteria
- Users can initiate Google OAuth from the product’s signed-out entry surface.
- Successful provider sign-in can return through the app’s auth flow and then reuse the default bootstrap path.
- OAuth entry does not remove access to existing auth options.

## Evidence and Confidence
- Directly evidenced:
  - Historical PRD content from commit `0c6196f`
  - Commit `c8783a7` (`Add Google OAuth login with seeded onboarding support`)
  - Current related files: `src/components/auth/auth-modal.tsx`, `src/app/actions.ts`, `src/app/auth/callback/route.ts`, `src/app/auth/password/route.ts`, `src/lib/default-topics.ts`
  - Related bug records: `docs/engineering/bug-fixes/google-oauth-pkce-callback-fix.md`, `docs/engineering/bug-fixes/oauth-session-persistence.md`
  - Google OAuth entry was added to the auth modal.
  - Auth callback and password routes both call `bootstrapUserDefaults(...)`, which seeds default topics after sign-in.
  - Later bug-fix docs confirm Google OAuth became a real path that then required callback and session hardening.
- Inferred:
  - The title phrase "onboarding entry" is only partially evidenced; the strongest direct claim is Google OAuth sign-in entry plus reuse of the existing default-bootstrap path.
- Still uncertain:
  - There is not a surviving standalone product brief showing a broader onboarding design beyond sign-in plus default bootstrap.
- Confidence: Medium. Google OAuth entry is directly supported, and default-bootstrap reuse is supported by the auth routes, but broader onboarding framing still depends partly on commit intent rather than a surviving canonical brief.
