# PRD-7 — Article Rationale Labels

- PRD ID: `PRD-7`
- Canonical file: `docs/product/prd/prd-7-article-rationale-labels.md`

## Objective
- Provide compact rationale labels that explain why an article or event was surfaced without requiring users to infer the product’s selection logic.

## User Problem
- Users need lightweight explanation cues to trust surfaced stories; otherwise the product can feel arbitrary or opaque.

## Scope
- Lightweight rationale-label generation.
- Story-card and homepage rendering support for those labels.
- Reusable explanatory language tied to surfaced content.

## Non-Goals
- Full structured reasoning and causal explanations introduced later in PRD-8 and PRD-12.
- Ranking-score transparency dashboards.
- Personalized rationale variants.

## Implementation Shape / System Impact
- Rationale logic becomes a reusable presentation layer primitive.
- Homepage and story cards gain a shared explanatory pattern without requiring full narrative generation.

## Dependencies / Risks
- Dependencies:
  - Event-aware surfaced content on homepage and story cards.
- Risks:
  - Labels can become repetitive or vague when underlying event data is thin.
  - Overly generic labels may need later structured reasoning upgrades.

## Acceptance Criteria
- Surfaced stories can display concise rationale labels derived from shared logic.
- Rationale labels appear consistently across homepage and story-card surfaces.
- The rationale helper remains lightweight enough for broad reuse.

## Evidence and Confidence
- Repo evidence:
  - Historical PRD content from commit `0c6196f`
  - Current related files: `src/lib/article-rationale.ts`, `src/components/story-card.tsx`, `src/components/landing/homepage.tsx`
- Confidence: High. The surviving helper/module names and render targets align cleanly with the historical PRD.
