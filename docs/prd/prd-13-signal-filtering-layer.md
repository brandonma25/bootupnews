# PRD 13: Signal Filtering Layer

## Objective
- Add a deterministic filtering layer between ingestion/normalization and clustering/ranking so low-value stories are less likely to reach briefing surfaces.

## Scope
- Classify article source quality into configurable tiers.
- Score headline quality with transparent heuristics.
- Normalize event types and gate low-value classes.
- Persist machine-readable filter decisions and reasons on articles.
- Reconsider suppressed items with a safe fallback when pass volume is too low.

## Explicit Exclusions
- No per-item LLM review.
- No personalization overhaul.
- No broad UI redesign.
- No ranking-system rewrite.

## Acceptance Criteria
- Each article receives `sourceTier`, `headlineQuality`, `eventType`, `filterDecision`, and `filterReasons`.
- Rejected articles do not proceed into topic matching and event clustering.
- Suppressed items stay out by default but can be promoted when pass volume is thin.
- Tiering and heuristics are centralized and easy to tune.

## Risks
- Over-filtering risk:
  Fallback promotions restore allowed suppressed stories before the product feels empty.
- Under-filtering risk:
  Hard-block and soft-block event classes reject or suppress commentary, filler, and repetitive follow-ups.
- Brittle source classification risk:
  Tier rules are centralized in `src/lib/signal-filtering.ts` for future tuning.
- Non-tier1 false negative risk:
  Strong allowed events from lower-tier sources can be promoted through fallback.
- Regression risk:
  Filtering is integrated once in the pipeline rather than scattered across ranking and UI code.

## Testing Requirements
- Local validation:
  Filter heuristics and fallback coverage in `src/lib/signal-filtering.test.ts`; pipeline regression coverage continues in existing Vitest suites.
- Preview validation when auth, env, or SSR is involved:
  Not specifically required by this change, but dashboard preview smoke-testing is still recommended before merge.
- Production sanity after merge:
  Confirm the briefing remains populated and visibly higher-signal on real feeds.
