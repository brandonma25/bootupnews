# PRD-33 — LLM Summarizer Activation

- PRD ID: `PRD-33`
- Canonical file: `docs/product/prd/prd-33-llm-summarizer-activation.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective
- Activate the existing LLM cluster summarizer in the main briefing generation path so signed-in users with AI configured receive richer briefing-card summaries without risking runtime breakage.

## User Problem
- The repository already contains `summarizeCluster()` but the live briefing path still renders only deterministic template output. This leaves summary quality on the table even when an AI provider is configured and available.

## Scope
- Intelligence Layer only.
- Wire the existing `summarizeCluster()` path into the ranked event-to-briefing-item conversion flow.
- Preserve the deterministic summary path as the fallback for missing AI configuration, provider errors, invalid AI payloads, or timeout conditions.
- Keep the existing card data shape unchanged.

## Non-Goals
- No routing, UI component, or dashboard layout changes.
- No auth, session, Supabase schema, or migration changes.
- No new AI configuration mechanism.
- No removal of the deterministic summarization path.

## Implementation Shape / System Impact
- The insertion point is `buildMatchedBriefing()` in `src/lib/data.ts`, after clustering and ranking have produced the event intelligence and immediately before the final `BriefingItem` is returned.
- The live path now resolves a summary payload through `summarizeCluster()` only when the existing `isAiConfigured` check passes and the cluster has meaningful article content.
- A bounded timeout and silent catch keep the runtime on the deterministic output if the AI path rejects, times out, or returns unusable fields.

## Dependencies / Risks
- Depends on the existing `summarizeCluster()` contract in `src/lib/summarizer.ts` continuing to return headline, whatHappened, keyPoints, whyItMatters, and estimatedMinutes.
- Depends on `isAiConfigured` in `src/lib/env.ts` remaining the canonical AI-availability signal.
- Risk: the AI path may still produce uneven editorial quality; the fallback protects runtime stability but not subjective phrasing quality.

## Acceptance Criteria
- When an AI provider is configured, live briefing cards use LLM-generated `headline`, `whatHappened`, `keyPoints`, `whyItMatters`, and `estimatedMinutes` when the call succeeds.
- When no AI provider is configured, briefing generation continues to use deterministic summaries with no user-facing error.
- When the AI call fails, times out, or returns invalid summary fields, briefing generation silently falls back to deterministic output and still renders.
- Empty or contentless clusters do not attempt an AI summarization call.

## What Was Implemented
- Added live-summary resolution in `src/lib/data.ts` so ranked event clusters can adopt the structured `summarizeCluster()` output before the final `BriefingItem` is returned.
- Added timeout, payload normalization, and deterministic fallback guards so the briefing shape stays stable.
- Added unit coverage for AI-configured success, unconfigured fallback, provider-error fallback, and timeout fallback.

## What Was Not Implemented
- No persisted event schema changes.
- No UI changes to story-card rendering or dashboard controls.
- No preview or production environment changes beyond the existing requirement to supply the AI env variable.

## Fallback Behavior
- Fallback is explicit and remains fully functional.
- If `isAiConfigured` is false, the cluster has no meaningful content, the AI call throws, the AI call times out, or the AI payload is incomplete, the deterministic summary values are used without showing any user-facing error state.

## Evidence and Confidence
- Repo evidence used:
  - `src/lib/summarizer.ts`
  - `src/lib/data.ts`
  - `src/app/actions.ts`
  - `src/lib/data.llm-summary.test.ts`
- Confidence:
  - High for local code-path correctness and fallback behavior.
  - Medium overall until Vercel Preview confirms env wiring and signed-in runtime behavior.
