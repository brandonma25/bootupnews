# PRD 12 Specificity Fix

## Summary
- Tightened PRD 12 so `Why This Matters` stays subject-anchored for normal stories.
- Reduced overuse of the low-confidence fallback path.
- Added event-specific reasoning for funding, demand/macro, governance, policy, legal, and product stories.
- Enforced batch-level variation across final rendered outputs, including fallback copy.

## Root Cause
- The prior fix treated many single-source stories as low-confidence by default.
- The fallback returned before batch anti-repetition logic could run.
- Governance stories did not have a strong dedicated reasoning lane, so they could inherit mismatched market language.
- Signal labels could flatten because thin stories were not penalized enough in the final scoring path.

## Changes
- Narrowed low-data fallback triggering in `why-it-matters`.
- Made fallback copy subject-aware and structurally varied.
- Applied repetition control to fallback outputs as well as standard templates.
- Added governance-specific reasoning and safer phrasing.
- Recalibrated signal scoring to penalize thin evidence and vary labels more clearly.
- Added explicit event routing for defense/geopolitical, political, corporate, and product stories.
- Added grammar post-processing to catch malformed `because changes` output.
- Replaced vague fallback phrasing with shorter, specific causal statements.
- Added stronger subject anchoring rules for generic one-word tokens such as `Mode`.

## Out of Scope
- No UI redesign.
- No auth, session, or dashboard layout changes.
- No PRD 13 filtering changes beyond reading existing metadata.
