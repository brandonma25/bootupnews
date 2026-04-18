# PRD-35 — Why It Matters Quality

- PRD ID: `PRD-35`
- Canonical file: `docs/product/prd/prd-35-why-it-matters-quality.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective
- Make briefing-card explanations specific and trustworthy by showing the LLM-provided `whyItMatters` copy when available and improving the deterministic fallback when AI is unavailable or invalid.

## User Problem
- The card explanation line was being rebuilt from heuristic templates at render time, which made multiple cards sound repetitive even after the LLM summarizer was activated.
- When AI output is unavailable, the deterministic fallback still needs to stay grounded in the actual cluster instead of reading like boilerplate.

## Scope
- Intelligence Layer:
- Improve deterministic `whyItMatters` generation so fallback copy references the actual event type, source coverage, ranking reason, and key entities.
- Validate AI `whyItMatters` output before adopting it and fall back safely when it is malformed.
- Experience Layer:
- Feed the mapped `BriefingItem.whyItMatters` text directly into the card explanation display when it is usable.
- Preserve the existing card layout and visual treatment.

## Non-Goals
- No dashboard layout or styling changes.
- No auth, session, Supabase schema, or migration changes.
- No changes to clustering, ranking, or core scoring contracts.
- No new AI provider configuration flow.

## Implementation Shape / System Impact
- `src/lib/data.ts` now validates `summarizeCluster()` `whyItMatters` output before adopting it, with deterministic fallback preserved for malformed strings.
- `src/lib/why-it-matters.ts` now prefers the mapped explanation text in trust-layer rendering and enriches deterministic fallback copy with cluster-specific evidence.
- Tests cover malformed AI fallback, trust-layer rendering behavior, and deterministic explanation specificity.

## Dependencies / Risks
- Depends on PRD-34 (`LLM Summarizer Activation`) being present on `main`, because this feature consumes the existing `summarizeCluster()` output.
- Depends on `EventIntelligence` continuing to provide ranking reason, event type, key entities, and source coverage fields.
- Risk: editorial quality still needs preview and human review because distinctiveness is partially subjective even when the data path is correct.

## Acceptance Criteria
- When AI is configured and returns a valid `whyItMatters`, briefing cards display that mapped text instead of rebuilding a heuristic explanation in the card layer.
- When AI is unavailable or returns malformed `whyItMatters`, the deterministic fallback still renders and references actual cluster properties.
- Fallback explanations differ meaningfully across cards and are not boilerplate repeats.
- No card layout or visual treatment changes.

## What Was Implemented
- Added `whyItMatters` validity checks before AI output is adopted.
- Routed `StoryCard` trust-layer body to prefer the mapped `BriefingItem.whyItMatters` text when it is usable.
- Expanded deterministic fallback explanations to include event-type framing, source coverage, ranking trigger, and key entities.
- Added unit coverage for malformed AI explanation fallback and card rendering behavior.

## What Was Not Implemented
- No change to ranking algorithms, clustering, or scoring thresholds.
- No change to persisted schema or database migrations.
- No preview or production automation changes.

## Evidence and Confidence
- Repo evidence used:
- `src/lib/data.ts`
- `src/lib/why-it-matters.ts`
- `src/components/story-card.tsx`
- `src/lib/data.llm-summary.test.ts`
- `src/lib/why-it-matters.test.ts`
- `src/components/story-card.test.tsx`
- Confidence:
- High for local data-path correctness and deterministic fallback behavior.
- Medium overall until Preview confirms explanation quality with live AI-configured output.
