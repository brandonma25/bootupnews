# PRD 12: Why This Matters Grounding Fix

## Objective
- Make Why This Matters output event-specific, causally grounded, less repetitive, and safe under low-data conditions.

## Scope
- Improve primary entity anchoring.
- Map event types to distinct causal reasoning paths.
- Enforce event -> mechanism -> impact -> time horizon structure.
- Reduce repeated sentence shapes within a batch.
- Recalibrate signal labels using event type, evidence, and source quality hints.
- Add constrained low-confidence fallback copy.

## Explicit Exclusions
- No signal-filtering changes from PRD 13.
- No dashboard redesign.
- No ranking-system rewrite.

## Acceptance Criteria
- Malformed outputs like `Wait matters because wait` are eliminated.
- Different event types produce different reasoning patterns.
- Low-data events degrade gracefully with constrained early-signal copy.
- Signal labels better reflect evidence quality.
