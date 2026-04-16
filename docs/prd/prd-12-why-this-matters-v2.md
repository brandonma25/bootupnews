# PRD 12 — Why This Matters V2

## Objective
- Replace generic `why_it_matters` output with a structured analytical layer that turns clustered events into concise causal explanations.

## Problem
- Existing `why_it_matters` text is repetitive and summary-like.
- The old generation path relied on weak direct summary prompting rather than structured reasoning inputs.
- Low-data stories could fall back to generic filler instead of still producing useful analysis.

## Scope
- Add structured event-intelligence fields for `entities`, `eventType`, `primaryImpact`, `affectedMarkets`, `timeHorizon`, and `signalStrength`.
- Generate `why_it_matters` from those structured signals in the live event/briefing data flow.
- Preserve the existing `why_it_matters` storage field and append a signal label to the saved text.
- Add light de-duplication across generated explanations in the same batch.

## Explicit Exclusions
- No UI redesign.
- No ingestion pipeline redesign.
- No schema migration.
- No full multi-event synthesis or broader PRD 6 work.

## Acceptance Criteria
- Each generated explanation references a specific entity, market, or policy context.
- Output emphasizes causality rather than repeating the article summary.
- Stored text includes a signal label such as `(Signal: Strong)`.
- Similar events generated in the same batch avoid near-duplicate phrasing.
- Existing tests remain green with backward-compatible defaults for older intelligence fixtures.

## Implementation Summary
- Extended [src/lib/event-intelligence.ts](/Users/bm/Documents/Daily%20news%20intel%20aggregator/src/lib/event-intelligence.ts) to infer structured analyst fields with simple keyword heuristics and signal scoring.
- Updated [src/lib/why-it-matters.ts](/Users/bm/Documents/Daily%20news%20intel%20aggregator/src/lib/why-it-matters.ts) to generate causal explanations from the structured signals, use the AI path when configured, fall back to deterministic heuristics, and lightly de-duplicate repeated phrasing.
- Threaded the new generator through [src/lib/data.ts](/Users/bm/Documents/Daily%20news%20intel%20aggregator/src/lib/data.ts) so event persistence and generated briefing items both store the upgraded text.
- Updated [src/lib/summarizer.ts](/Users/bm/Documents/Daily%20news%20intel%20aggregator/src/lib/summarizer.ts) so its AI prompt also uses the structured reasoning fields.

## Risks
- Auth or session risk:
  None from this change set; no auth or session code was modified.
- SSR versus client mismatch risk:
  Low. Output text is generated in server-side data flows, but local dashboard rendering was smoke-tested after the change.
- Environment mismatch risk:
  Medium. AI-backed phrasing quality depends on preview/runtime environment variables and must still be checked in Vercel preview.
- Data edge case risk:
  Medium. Sparse events may still rely on fallback markets or inferred event types, though the new logic avoids empty output.
- Regression risk:
  Medium. Existing display code consumed legacy intelligence fixtures; backward-compatible normalization was added to avoid breakage.

## Testing Requirements
- Local validation:
  `npm install` completed.
  `npm run lint` reported two pre-existing `react-hooks/set-state-in-effect` errors in `src/components/app-shell.tsx`.
  `npm run test` passed after updating fixtures and compatibility paths.
  `npm run build` passed.
  `npm run dev` served `http://localhost:3000`, and `GET /dashboard` returned HTTP 200 locally.
- Preview validation when auth, env, or SSR is involved:
  Pending. Required next step is Vercel preview validation of generated explanations with real environment variables and multiple events.
- Production sanity after merge:
  Pending. Check the top 5 events after merge for explanation quality and duplication regression.

## Documentation Updates Required
- `docs/prd/`:
  This file.
- `docs/testing/`:
  See `docs/testing/prd-12-why-this-matters-v2.md`.
- `docs/bug-fixes/`:
  See `docs/bug-fixes/prd-12-why-this-matters-v2.md`.
