# Change Record: LLM Summarizer Activation

## ID
- LLM Summarizer Activation

## Summary
- Connects the existing `summarizeCluster()` Intelligence Layer path to the live briefing-item build flow so configured AI output can replace deterministic card copy without changing the downstream card contract.

## What Code Path Was Connected
- `generateBriefingAction()` already runs ingestion, topic matching, and event clustering before calling `buildMatchedBriefing()`.
- `buildMatchedBriefing()` now resolves the final summary fields through the existing summarizer path instead of always using deterministic summary text.

## Insertion Point
- The insertion point is inside `src/lib/data.ts` in `buildMatchedBriefing()`, after clustering and ranking have produced event intelligence and immediately before the final `BriefingItem` is returned to the dashboard briefing payload.

## How Fallback Works
- The deterministic summary remains the source-of-truth fallback payload.
- The LLM path is attempted only when the existing `isAiConfigured` signal is true and the cluster contains meaningful article content.
- If the AI call rejects, times out, or returns unusable structured fields, the deterministic payload is returned silently so rendering continues unchanged.

## Scope
- Intelligence Layer only.
- No routing, auth, UI, Supabase schema, or Playwright test changes.

## Validation Status
- Local validation is required with and without AI configured.
- Preview validation is still required to confirm env-variable wiring and signed-in runtime truth.
