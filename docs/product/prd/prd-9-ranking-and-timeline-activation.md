# PRD-9 — Ranking and Timeline Activation

- PRD ID: `PRD-9`
- Canonical file: `docs/product/prd/prd-9-ranking-and-timeline-activation.md`

## Objective
- Activate ranking and narrative context so event clusters are ordered intentionally and can show concise development timelines instead of appearing as undifferentiated cards.

## User Problem
- Users need the most important developments surfaced first, with enough sequence context to understand what changed and why it matters now.

## Scope
- Shared ranking logic for homepage and dashboard.
- Timeline-builder support for event-level narratives.
- Story-card rendering for ranked, contextualized events.

## Non-Goals
- Personalization boosts introduced later in PRD-19.
- Reading-progress and continuity systems.
- Final homepage category and trust-surface polish consolidated later in PRD-17.

## Implementation Shape / System Impact
- Ranking becomes a shared decision layer rather than a local UI sort.
- Event cards can present concise timeline context built from shared intelligence and cluster data.

## Dependencies / Risks
- Dependencies:
  - Event clustering and structured event intelligence.
- Risks:
  - Ranking quality can drift if intelligence inputs remain noisy.
  - Timelines may be sparse or absent when event clusters lack enough history.

## Acceptance Criteria
- Homepage and dashboard consume a shared ranking layer for surfaced events.
- Event cards can render concise narrative timeline context where available.
- Ranking and timeline logic stays centralized in shared library code.

## Evidence and Confidence
- Repo evidence:
  - Historical PRD content from commit `0c6196f`
  - Current related files: `src/lib/ranking.ts`, `src/lib/timeline-builder.ts`, `src/lib/data.ts`, `src/components/story-card.tsx`, `src/components/landing/homepage.tsx`, `src/app/dashboard/page.tsx`
- Confidence: Medium. The repo evidence is strong on ranking and timeline modules, but some product framing is still reconstructed from implementation shape.
