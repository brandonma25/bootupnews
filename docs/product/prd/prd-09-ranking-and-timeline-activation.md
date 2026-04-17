# PRD-9 — Ranking and Timeline Activation

- PRD ID: `PRD-9`
- Canonical file: `docs/product/prd/prd-09-ranking-and-timeline-activation.md`

## Objective
- Activate shared ranking and timeline context so event clusters are ordered consistently and can show concise development timelines.

## User Problem
- Users need the most important developments surfaced first, with enough sequence context to understand how a story is developing.

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
- Directly evidenced:
  - Historical PRD content from commit `0c6196f`
  - Commit `6354eb9` (`feat: timeline builder for event-level narratives`)
  - Commit `92766b2` (`feat: activate ranking across homepage and dashboard`)
  - Current related files: `src/lib/ranking.ts`, `src/lib/timeline-builder.ts`, `src/lib/data.ts`, `src/components/story-card.tsx`, `src/components/landing/homepage.tsx`, `src/app/dashboard/page.tsx`
  - Related tests: `src/lib/ranking.test.ts`, `src/lib/timeline-builder.test.ts`, `src/components/story-card.test.tsx`
  - A dedicated timeline-builder module was added for event-level narratives.
  - Shared ranking logic was added across homepage and dashboard.
  - Story cards render timeline and ranking-derived signals.
- Inferred:
  - The phrase "activation" is a summarizing label inferred from the pair of ranking and timeline commits rather than a surviving historical feature title in code.
- Still uncertain:
  - The exact original product framing that grouped ranking and timeline into one numbered feature is reconstructed from the historical PRD content and adjacent commit sequence.
- Confidence: High. The repo has strong direct evidence for both the ranking and timeline pieces, including dedicated commits, current implementation, and supporting tests.
