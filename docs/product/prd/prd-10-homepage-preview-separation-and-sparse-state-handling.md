# PRD-10 — Homepage Preview Separation and Sparse-State Handling

- PRD ID: `PRD-10`
- Canonical file: `docs/product/prd/prd-10-homepage-preview-separation-and-sparse-state-handling.md`

## Objective
- Separate the public homepage preview experience from the signed-in dashboard while making sparse categories and empty states feel intentional instead of broken.

## User Problem
- Signed-out visitors and low-data situations should still feel coherent; blank rails or dashboard-like public pages make the product look broken or unfinished.

## Scope
- Homepage-versus-dashboard surface separation.
- Sparse-category and empty-state messaging.
- Guest-value preview components for signed-out users.

## Non-Goals
- Full homepage intelligence-surface consolidation documented later in PRD-17.
- Auth and session callback hardening handled later in PRD-14.
- Personalization and continuity experiences.

## Implementation Shape / System Impact
- The homepage becomes its own preview surface instead of a thin dashboard copy.
- Sparse and empty states gain intentional messaging that depends on homepage-model and taxonomy behavior.

## Dependencies / Risks
- Dependencies:
  - Landing-page auth acquisition surface.
  - Ranking and homepage categorization inputs.
- Risks:
  - Preview and dashboard behavior can drift if the surfaces evolve independently.
  - Sparse-state rules depend on the quality of upstream ranking and categorization inputs.

## Acceptance Criteria
- The homepage can serve as a public preview rather than a thin copy of the dashboard.
- Sparse categories and empty states explain missing coverage instead of rendering blank rails.
- Guest-value messaging remains available when live user data is unavailable.

## Evidence and Confidence
- Repo evidence:
  - Historical PRD content from commit `0c6196f`
  - Current related files: `src/app/page.tsx`, `src/app/dashboard/page.tsx`, `src/components/landing/homepage.tsx`, `src/components/guest-value-preview.tsx`, `src/lib/homepage-model.ts`, `src/lib/homepage-taxonomy.ts`
- Confidence: Medium. The surface split is well supported by history and file layout, but the exact product-intent framing is partly reconstructed from surviving code and prior PRD text.
