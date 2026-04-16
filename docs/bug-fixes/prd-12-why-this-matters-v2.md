# PRD 12 — Why This Matters V2 Bug Notes

## Issues Addressed
- Duplicate phrasing:
  Added batch-level similarity checks and a rephrase retry so adjacent event explanations do not collapse into the same sentence pattern.
- Weak outputs:
  Replaced summary-driven filler with structured fields for event type, impact, affected markets, time horizon, and signal strength.
- Incorrect classification:
  Tightened keyword matching to avoid substring false positives such as classifying `banks` as a regulation event because it contains `ban`.
- Legacy fixture breakage:
  Added backward-compatible normalization so older `EventIntelligence` fixtures without the new fields still render correctly in tests and UI consumers.

## Remaining Watch Items
- Sparse articles can still fall back to coarse market labels.
- Preview should verify AI-configured output stays specific and non-generic across at least 5 events.
- Existing lint errors in `src/components/app-shell.tsx` remain outside this PRD 12 scope.
