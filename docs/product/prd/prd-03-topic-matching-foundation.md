# PRD-3 — Topic Matching Foundation

- PRD ID: `PRD-3`
- Canonical file: `docs/product/prd/prd-03-topic-matching-foundation.md`

## Objective
- Introduce deterministic topic matching so ingested articles can be grouped against user-relevant themes instead of remaining a flat article pool.

## User Problem
- Users need news organized around the topics they care about; raw article streams are too noisy and generic to be useful on their own.

## Scope
- Topic-to-article matching logic.
- Topic-aware dashboard and homepage data assembly.
- Initial topic persistence support in the shared schema and actions layer.

## Non-Goals
- Full topic/source management workflows formalized later in PRD-15.
- Event clustering, ranking, and reading-state systems.
- Personalized re-ranking.

## Implementation Shape / System Impact
- Shared topic matching becomes a reusable intelligence primitive for downstream product surfaces.
- The data model starts treating topic alignment as a first-class input instead of view-specific filtering.

## Dependencies / Risks
- Dependencies:
  - PRD-1 ingestion outputs and persisted topic definitions.
- Risks:
  - Keyword-based topic matching can miss nuanced stories or over-match noisy terms.
  - Topic quality depends on seeded or user-provided topic definitions.

## Acceptance Criteria
- Articles can be associated with topic records through shared matching logic.
- Dashboard generation consumes topic-aware results rather than raw article lists.
- Topic matching rules live in shared library code instead of page-local heuristics.

## Evidence and Confidence
- Repo evidence:
  - Historical PRD content from commit `0c6196f`
  - Current related files: `src/lib/topic-matching.ts`, `src/lib/data.ts`, `src/app/actions.ts`, `src/app/topics/page.tsx`, `supabase/schema.sql`
- Confidence: High. The historical PRD content and current codebase still align strongly around this feature boundary.
