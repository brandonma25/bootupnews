# Explanation Trust Layer

## Summary

The backend now has a canonical explanation packet and trust debug structure instead of relying on scattered helper outputs alone.

## What Changed

- Added a compact app-owned `ExplanationPacket` for:
  - what happened
  - why it matters
  - why this ranks here
  - what to watch
  - confidence
  - unknowns
  - citation/source support summary
  - explanation mode
- Added `TrustLayerDebug` so developers can inspect:
  - evidence used
  - material ranking features
  - confidence/uncertainty notes
  - enrichment status and path choice
- Added a canonical explanation assembly module that uses deterministic ranking, cluster, source, and event-intelligence state.
- Activated Horizon as an optional schema-safe enrichment boundary that currently prepares requests and safely skips execution.

## What Did Not Change

- Ranking remains canonical and deterministic.
- Horizon does not own score truth.
- The site’s visible rendering contract remains backward-compatible.
- Signed-in fallback behavior remains intact.

## Limits

- Explanation quality is still bounded by deterministic heuristics and upstream signal quality.
- Horizon enrichment is active only as a safe boundary today, not a live prose-generation dependency.
