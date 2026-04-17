# PRD-2 — Landing Page Auth Acquisition Surface

- PRD ID: `PRD-2`
- Canonical file: `docs/product/prd/prd-02-landing-page-auth-acquisition-surface.md`

## Objective
- Establish the homepage as a clearer signed-out entry surface with a direct path into authentication.

## User Problem
- A signed-out visitor needs to understand what the product does and how to start using it, rather than landing on a thin or confusing homepage.

## Scope
- Landing-page hero messaging and primary call-to-action.
- Auth modal entrypoints from the public homepage.
- Simplified signed-out navigation into the product.

## Non-Goals
- Full server-side session routing handled later in PRD-14.
- Topic/source persistence and onboarding defaults.
- Homepage intelligence categorization.

## Implementation Shape / System Impact
- The homepage emphasizes a signed-out entry experience instead of a thin generic landing page.
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
- Directly evidenced:
  - Historical PRD content from commit `0c6196f`
  - Commit `69487c4` (`feat: simplify landing page auth flow`) created `src/components/auth/auth-modal.tsx` and `src/components/landing/hero.tsx`
  - Current related files: `src/app/page.tsx`, `src/components/auth/auth-modal.tsx`, `src/components/landing/hero.tsx`
  - The homepage was simplified around a landing hero plus auth modal flow.
  - Public homepage entrypoints into auth were added explicitly.
- Inferred:
  - The wording "acquisition surface" is a product framing layer inferred from the hero copy, CTA placement, and commit message about simplifying landing-page auth flow.
- Still uncertain:
  - There is no surviving contemporaneous product brief proving a broader conversion strategy beyond the simplified hero-plus-auth implementation.
- Confidence: Medium. The repo clearly supports a landing-page auth simplification, but broader acquisition framing is still reconstructed rather than directly documented.
