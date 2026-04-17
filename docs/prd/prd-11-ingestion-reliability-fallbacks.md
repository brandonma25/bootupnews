# PRD 11 — Ingestion Reliability Fallbacks

## Objective
- Keep Finance, Politics, and Tech sections from rendering blank.
- Supplement thin primary-source coverage with safe fallback feeds.
- Make fallback behavior visible in logs and intentional in the UI.

## Scope
- Multi-source ingestion resilience.
- Retry and timeout handling.
- Minimum-category supplementation.
- Dedupe-safe fallback behavior.
- Fallback logging and intentional empty/loading states.

## Explicit Exclusions
- Auth changes.
- Supabase schema changes.
- Environment variable changes.
- Unrelated dashboard behavior.

## Acceptance Criteria
- Finance, Politics, and Tech are populated or show an intentional empty state.
- No blank category sections appear because a feed was thin or failed.
- Fallback usage is logged and inspectable.

## Risks
- RSS inconsistency can still create noisy or partial inputs.
- Fallback supplementation can introduce duplicates if dedupe rules drift.
- Additional fetch attempts can increase latency during weak-feed runs.

## Testing Requirements
- Normal case:
  Primary feeds return enough articles without fallback.
- Partial failure:
  Thin category coverage triggers supplemental fallback fetches.
- Primary source failure:
  Fallback feeds recover category coverage when possible.
- Total failure:
  UI shows an intentional empty state instead of blank whitespace.
