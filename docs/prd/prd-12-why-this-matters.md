# PRD 12 — Why This Matters

## Objective
- Generate concise, causal `why_it_matters` explanations that stay specific to the event.
- Keep output resilient under low-data conditions without falling back to generic filler.
- Prevent repeated phrasing, weak subject anchoring, and overstated signal labels.

## Scope
- Structured event-intelligence fields for subject, event type, impact, affected markets, time horizon, and signal strength.
- Deterministic and AI-assisted reasoning paths that follow event -> mechanism -> impact structure.
- Entity validation, event-specific routing, and safer non-signal handling.
- Batch-level anti-repetition and text cleanup.
- Signal-label calibration for thin, weak, and stronger evidence.

## Explicit Exclusions
- Dashboard redesign.
- Ingestion pipeline redesign outside the data already consumed by this feature.
- Schema migration.
- PRD 13 filtering work beyond safely consuming filter metadata.

## Acceptance Criteria
- Explanations reference a valid company, institution, market, country, or safe event phrase.
- Different event types produce meaningfully different reasoning patterns.
- Low-data stories degrade gracefully with constrained early-signal language.
- Duplicate or near-duplicate phrasing is reduced across the same batch.
- Signal labels reflect evidence quality rather than topic alone.

## Implementation Summary
- Added structured intelligence fields to support reasoning instead of summary-style filler.
- Tightened entity selection so pronouns, malformed fragments, and weak generic tokens do not become subjects.
- Added event-specific routing for funding, IPO, governance, policy, legal, macro, defense, product, and non-signal content.
- Improved explanation cleanup to remove repeated clauses and malformed causal phrasing.
- Recalibrated signal scoring so thin or weak single-source stories are not overstated.

## Risks
- AI-configured environments can still vary in phrasing quality and require preview verification.
- Noisy headlines can still force conservative fallback phrasing for some stories.
- Signal thresholds may still need tuning as live feed mix changes.

## Testing Requirements
- Add regression coverage for anchor extraction, event routing, low-confidence fallback behavior, repetition control, and signal calibration.
- Run local validation with install, lint, tests, and build.
- Validate explanation quality in preview for multiple real events before merge when environment-backed generation is in play.
