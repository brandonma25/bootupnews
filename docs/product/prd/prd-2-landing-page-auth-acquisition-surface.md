# PRD-2 — Landing Page Auth Acquisition Surface

- PRD ID: `PRD-2`
- Canonical file: `docs/product/prd/prd-2-landing-page-auth-acquisition-surface.md`

## Objective
- Turn the homepage into a clearer signed-out entry surface that explains product value and gives users a direct path into authentication.

## User Problem
- A signed-out visitor needs to understand what the product does and how to start using it, rather than landing on a thin or confusing homepage.

## Scope
- Landing-page hero conversion messaging.
- Auth modal entrypoints from the public homepage.
- Simplified signed-out navigation into the product.

## Non-Goals
- Full server-side session routing handled later in PRD-14.
- Topic/source persistence and onboarding defaults.
- Homepage intelligence categorization.

## Implementation Shape / System Impact
- The homepage becomes an intentional signed-out acquisition surface.
- Auth entrypoints move closer to the first product-value explanation.

## Dependencies / Risks
- Dependencies:
  - Public homepage rendering and auth modal integration.
- Risks:
  - Early auth-entry UX can drift from later callback/session behavior.
  - Signed-out landing behavior may still depend on environment-specific auth config.

## Acceptance Criteria
- A signed-out visitor can understand the product promise from the homepage.
- Authentication entrypoints are reachable from the landing flow without dead-end UI.
- Public homepage rendering stays stable after the simplified auth flow changes.

## Evidence and Confidence
- Repo evidence:
  - Historical PRD content from commit `0c6196f`
  - Current related files: `src/app/page.tsx`, `src/components/auth/auth-modal.tsx`, `src/components/landing/hero.tsx`
- Confidence: Medium. The repo history and surviving files support the feature identity, but some landing-page intent is reconstructed from code shape and naming rather than a fuller contemporary brief.
