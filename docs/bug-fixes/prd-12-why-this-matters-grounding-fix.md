# Bug Fix: PRD 12 Why This Matters Grounding Fix

## Summary
- Replaced generic Why This Matters phrasing with event-type-specific causal reasoning.
- Added safer anchor selection so invalid tokens do not become the explanation subject.
- Added low-confidence fallback copy for thin evidence scenarios.
- Reduced repeated sentence structures across a page-level batch.

## Main Risks Addressed
- Wrong subject extraction.
- Repetitive generic templates.
- Misaligned signal labeling.
- Nonsensical low-data output.
