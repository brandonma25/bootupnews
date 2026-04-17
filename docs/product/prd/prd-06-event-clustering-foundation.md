# PRD-6 — Event Clustering Foundation

- PRD ID: `PRD-6`
- Canonical file: `docs/product/prd/prd-06-event-clustering-foundation.md`

## Objective
- Convert matched articles into event-level clusters so the product can reason about developments instead of isolated article rows.

## User Problem
- Users benefit from event-centric briefings, not duplicate or disconnected article lists that require manual synthesis.

## Scope
- Event-cluster generation in the shared data layer.
- Event-aware dashboard and history data models.
- Schema support for storing briefing and event relationships.

## Non-Goals
- Why-this-matters reasoning and structured event intelligence expanded later in PRD-8 and PRD-12.
- Ranking activation and timeline narratives handled later in PRD-9.
- Continuity and read-state tracking.

## Implementation Shape / System Impact
- The intelligence layer shifts from article-level presentation to event-level grouping.
- History and dashboard experiences start consuming a common event structure.

## Dependencies / Risks
- Dependencies:
  - Ingestion and topic matching foundations.
- Risks:
  - Early clustering can over-merge or split related stories.
  - Cluster quality depends on ingestion quality and topic matching accuracy.

## Acceptance Criteria
- Related articles can be grouped into event-centric briefing items.
- Dashboard and history flows consume clustered event structures instead of raw articles alone.
- Event shape definitions are centralized in shared types and data logic.

## Evidence and Confidence
- Repo evidence:
  - Historical PRD content from commit `0c6196f`
  - Current related files: `src/lib/data.ts`, `src/lib/types.ts`, `src/app/actions.ts`, `src/app/dashboard/page.tsx`, `src/app/history/page.tsx`, `supabase/schema.sql`
- Confidence: High. Both the historical PRD text and current implementation shape make this feature boundary well supported.
