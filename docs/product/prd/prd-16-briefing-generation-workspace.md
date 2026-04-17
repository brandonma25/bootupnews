# PRD-16 — Briefing Generation Workspace

- PRD ID: `PRD-16`
- Canonical file: `docs/product/prd/prd-16-briefing-generation-workspace.md`
- Feature system row: update `docs/product/feature-system.csv` with matching `prd_id` and `prd_file`

## Objective
- Turn saved topics and sources into a daily ranked briefing workspace that users can generate, review, and persist.

## Problem
- The core product value depends on turning raw feed articles into structured daily briefings, but that orchestration spans ingestion, filtering, topic matching, clustering, ranking, and persistence.

## Scope
### Must Do
- Fetch and persist source articles for the active user.
- Recompute signal filters, topic matches, and event clusters before briefing generation.
- Build a ranked daily briefing with topic-aware event items and save it for dashboard/history use.
- Support demo/public generation when live data is unavailable.

### Must Not Do
- Replace deeper feature-specific PRDs for filtering, reasoning, or fallback ingestion.
- Introduce unrelated application logic outside the briefing workflow.
- Claim preview or production truth from local-only generation behavior.

## System Behavior
- The workspace loads live data when a valid session and Supabase client are available.
- The generation action persists raw articles, syncs matches and clusters, builds a daily briefing, and upserts briefing records for the current day.
- Public/demo visitors receive a generated sample briefing instead of a broken workspace.

## Key Logic
- `src/lib/data.ts` orchestrates dashboard state, public/live fallbacks, briefing generation, history loading, topic matching, cluster sync, and persistence.
- `src/app/actions.ts` drives the explicit generate-briefing server action and briefing-item persistence.
- The workflow composes lower-level systems like RSS ingestion, signal filtering, event intelligence, ranking, related coverage, and timeline building.

## Risks / Limitations
- Live briefing quality still depends on feed health, environment config, and data freshness.
- Demo/public behavior cannot prove live-user persistence paths.
- SSR-sensitive data loads still require preview validation in real environment conditions.

## Success Criteria
- A signed-in user can generate or refresh a structured briefing from saved topics and sources.
- The same day’s briefing is updated rather than duplicated uncontrollably.
- Public/demo users still see a coherent product surface when live data is unavailable.

## Done When
- The repo has one canonical PRD for the implemented briefing orchestration and workspace flow.
