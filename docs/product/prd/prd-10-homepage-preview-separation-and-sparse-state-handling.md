# PRD-10 — Homepage Preview Separation and Sparse-State Handling

- PRD ID: `PRD-10`
- Canonical file: `docs/product/prd/prd-10-homepage-preview-separation-and-sparse-state-handling.md`

## Objective
- Separate the public homepage preview experience from the signed-in dashboard while making sparse categories and empty states explain missing coverage instead of rendering blank rails.

## User Problem
- Signed-out visitors and low-data situations should still feel coherent; blank rails or a homepage that mirrors the dashboard too closely make the product harder to understand.

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
- Directly evidenced:
  - Historical PRD content from commit `0c6196f`
  - Commit `67ae05a` (`Separate homepage preview from dashboard experience`)
  - Commit `88f125d` (`Fix homepage category rails and empty states`)
  - Commit `222eee6` (`Add guest value clarity conversion layer`)
  - Current related files: `src/app/page.tsx`, `src/app/dashboard/page.tsx`, `src/components/landing/homepage.tsx`, `src/components/guest-value-preview.tsx`, `src/lib/homepage-model.ts`, `src/lib/homepage-taxonomy.ts`
  - Related tests: `src/components/landing/homepage.test.tsx`, `src/lib/homepage-model.test.ts`
  - Homepage preview and dashboard behavior were explicitly separated in commit history.
  - Homepage category rails, empty states, and taxonomy/model logic were added and tested.
  - Guest-value preview messaging was later added to clarify the signed-out experience.
- Inferred:
  - The phrase "sparse-state handling" is a concise umbrella label inferred from the homepage category-rails and empty-state work.
- Still uncertain:
  - The exact original product-language rationale for bundling preview separation and sparse-state work into one numbered PRD is reconstructed from history rather than preserved in a standalone brief.
- Confidence: High. The commit history, current code, and tests directly support the preview split and sparse-state work, even though the umbrella PRD label still compresses adjacent changes into one feature name.
