# Phase 1 Clustering Quality Guardrails

## Root Cause

The original Phase 1 clustering logic used a permissive merge rule based on keyword overlap or representative-title similarity. That made cluster formation hard to inspect and vulnerable to both:

- over-merging broad-topic stories with generic overlap
- under-merging same-event stories whose headlines used different wording

## Files Changed

- `src/lib/pipeline/shared/text.ts`
- `src/lib/pipeline/normalization/index.ts`
- `src/lib/models/normalized-article.ts`
- `src/lib/models/signal-cluster.ts`
- `src/lib/pipeline/clustering/index.ts`
- `src/lib/pipeline/index.ts`
- `src/lib/pipeline/clustering/index.test.ts`
- `src/lib/pipeline/index.test.ts`

## Fix Summary

- Expanded normalization and stopword handling so generic words contribute less noise.
- Added normalized entities, keywords, title tokens, and content tokens to normalized articles.
- Replaced the naive clustering rule with weighted similarity over:
  - title overlap
  - keyword overlap
  - entity overlap
  - content overlap
  - publish-time proximity
- Added anti-merge guardrails for:
  - weak overall similarity
  - generic-only overlap
  - same-entity but different-event matches
  - time-distant weak matches
- Improved representative article selection with a stable, scored best-fit choice instead of pure freshness.

## Inspectability Added

- Per-cluster merge decisions now record:
  - merged vs prevented
  - similarity breakdown
  - reasons
- Clusters also store:
  - prevented merge count
  - representative selection reason
  - representative candidate scores
- Pipeline runs now expose:
  - average cluster size
  - singleton count
  - prevented merge count
  - sample rationale for top clusters

## Remaining Risks

- Thresholds are tuned for deterministic Phase 1 quality, not full semantic equivalence.
- Feed mixes with very noisy titles may still need future threshold adjustments.
- Live feeds can still skew singleton-heavy when publishers cover unrelated long-tail stories.
