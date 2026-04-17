# PRD-5 — Google OAuth Onboarding Entry

- PRD ID: `PRD-5`
- Canonical file: `docs/product/prd/prd-5-google-oauth-onboarding-entry.md`

## Objective
- Add the first Google OAuth entry path so users can start onboarding through a provider-based login instead of password-only flows.

## User Problem
- Users need a low-friction sign-in path to reach onboarding and the product quickly; password-only entry adds unnecessary friction.

## Scope
- Google OAuth launch entrypoints in the auth modal.
- Homepage and app-shell integration for provider login.
- Initial onboarding linkage between OAuth completion and seeded defaults.

## Non-Goals
- Callback-host correctness, PKCE safety, and durable session routing fixed later under PRD-14 bug work.
- Preview and production auth-environment governance.
- Full account-management settings.

## Implementation Shape / System Impact
- The auth surface expands beyond password login to include provider-based entry.
- OAuth completion becomes part of the onboarding pathway rather than a disconnected sign-in side path.

## Dependencies / Risks
- Dependencies:
  - Landing-page auth surface and default topic bootstrap.
- Risks:
  - Provider login remains sensitive to callback-host and session-cookie handling.
  - This first-pass flow can appear successful before later auth hardening resolves persistence edge cases.

## Acceptance Criteria
- Users can initiate Google OAuth from the product’s signed-out entry surface.
- Successful provider sign-in can flow into the app’s onboarding path.
- OAuth entry does not remove access to existing auth options.

## Evidence and Confidence
- Repo evidence:
  - Historical PRD content from commit `0c6196f`
  - Current related files: `src/components/auth/auth-modal.tsx`, `src/app/actions.ts`, `src/app/auth/callback/route.ts`, `src/components/app-shell.tsx`, `src/app/page.tsx`
- Confidence: Medium. The repo history and code clearly support a first-pass Google OAuth entry, but some onboarding intent is inferred from the surviving integration points.
