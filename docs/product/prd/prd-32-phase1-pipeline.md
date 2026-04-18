# PRD-32 — Phase 1 Pipeline

- PRD ID: `PRD-32`
- Canonical file: `docs/product/prd/prd-32-phase1-pipeline.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Ship a working Phase 1 news intelligence pipeline that is cluster-first, deterministic, inspectable, and able to produce a readable ranked digest without relying on heavy LLM reasoning.

## User Problem

The product needs an end-to-end intelligence path that can ingest live news, normalize it, remove duplicates, cluster related articles, rank signals with explainable logic, and render a concise digest on the dashboard.

## Scope

- Add explicit pipeline modules for ingestion, normalization, deduplication, clustering, ranking, and digest generation.
- Add typed models for raw items, normalized articles, signal clusters, and ranked signals.
- Add deterministic scoring for credibility, novelty, urgency, and reinforcement.
- Add pipeline observability with run summaries and per-cluster scoring breakdown.
- Wire the public dashboard briefing generation to the new digest pipeline.
- Add donor adapters and deterministic seed fallback coverage for local/dev resilience.

## Non-Goals

- No heavy LLM reasoning in the ranking path.
- No auth, Supabase, or session architecture rewrite.
- No production-grade persistence layer for pipeline runs in Phase 1.
- No semantic embeddings or model-based clustering in Phase 1.

## Implementation Shape / System Impact

- `src/lib/pipeline/` now owns the staged deterministic processing flow.
- `src/lib/models/` defines the phase-specific pipeline contracts.
- `src/lib/pipeline/clustering/index.ts` now uses weighted similarity plus anti-merge guardrails instead of a single loose overlap rule.
- `src/lib/scoring/scoring-engine.ts` centralizes ranking math.
- `src/lib/observability/pipeline-run.ts` records run counts, failures, and scoring logs.
- `src/adapters/donors/` now defines donor registry entries, contract states, and default feed metadata.
- `src/lib/integration/` formalizes canonical subsystem contracts, donor mappings, and pipeline stage ownership.
- `src/lib/data.ts` uses the new digest pipeline for public dashboard briefing generation while leaving auth-sensitive flows intact.

## Dependencies / Risks

- RSS feeds are network-dependent and can fail, throttle, or change shape.
- Keyword clustering is intentionally naive and may over-group adjacent stories or split evolving events.
- The current public dashboard path infers topic assignment from keywords and source mix rather than a deeper taxonomy model.
- Seed fallback keeps local/dev usable, but it is a resilience mechanism rather than a substitute for live feed quality.

## Acceptance Criteria

- The pipeline fetches 3 to 5 feeds with retry logic.
- Inputs normalize into a common `NormalizedArticle` model.
- Duplicate or near-duplicate items are removed deterministically.
- Related articles are grouped into clusters with weighted title, keyword, entity, content, and time-proximity matching.
- Anti-merge guardrails block generic broad-topic merges and same-entity/different-event collisions when evidence is weak.
- Ranking produces explainable non-identical scores.
- Digest output returns the top 5 ranked clusters with title, summary, and source links.
- Observability captures run counts and score breakdowns per cluster.

## Scoring Logic

`score = 0.3 * credibility + 0.25 * novelty + 0.25 * urgency + 0.2 * reinforcement`

- `credibility`: average deterministic source credibility weight across the cluster
- `novelty`: rewards scarcer topic keywords and keyword breadth
- `urgency`: rewards fresher stories and explicit urgent event language
- `reinforcement`: rewards cluster size and source diversity

## Ranking and Diversity Note

- ranking now uses a canonical `RankingFeatureSet` that includes:
  - source credibility
  - trust tier
  - source confirmation
  - recency / urgency
  - novelty
  - reinforcement
  - representative quality
- FNS is the active ranking support owner for donor-backed feature mapping
- diversity adjustments now run after canonical base scoring to reduce overcrowded near-duplicate outputs
- final score calculation and ranked output remain canonical website logic

## Known Limitations

- Clustering is materially stricter, but adjacent macro or policy stories can still require threshold tuning as feed mix changes.
- The dashboard summary is deterministic and intentionally basic.
- Topic assignment for public digest cards is heuristic in Phase 1.
- Observability currently logs to runtime output instead of a persistent analytics store.
- Homepage rail variety now uses deterministic semantic suppression, but live-feed quality still limits how diverse the visible event mix can become in sparse runs.
- Donor integrations are adapter-based and intentionally partial; most subsystem logic remains canonical until later integration passes.

## Donor Integration Framework Note

- `openclaw-newsroom` is the active ingestion donor:
  - contributes feed transport and source metadata boundaries
- `Horizon` is now the secondary ingestion/source-breadth donor:
  - contributes Reuters-backed source definitions and richer canonical source context
- `after-market-agent` is the active clustering-support donor:
  - contributes cluster candidate preparation, similarity-signal support, merge-decision support, and representative-selection support
- `FINANCIAL-NEWS-SUMMARIZER` is the active ranking-feature donor:
  - contributes canonical ranking feature mapping and post-cluster diversity support
- `Horizon` enrichment is future-ready only:
  - exposes a stub-safe enrichment contract without entering the critical path
- Adapter rule:
  - donor modules translate into canonical contracts
  - canonical pipeline modules remain the only runtime owners of app-wide models and output shapes

## Ingestion Source Note

- ingestion now resolves canonical source definitions rather than raw feed rows
- canonical source metadata includes:
  - source id
  - donor origin
  - source class
  - trust tier
  - provenance
  - availability/status
- that metadata now flows from source registry into `RawItem` and `NormalizedArticle`

## Clustering Upgrade Note

- Previous weakness:
  - clustering relied on a permissive keyword/title overlap rule
  - generic terms like `market`, `review`, or `world` could influence grouping too much
  - representative article choice defaulted to freshness rather than best-fit cluster summary
- Current merge logic:
  - weighted similarity blends title overlap, keyword overlap, entity overlap, content overlap, and publish-time proximity
  - overlap uses containment-aware comparison rather than raw Jaccard alone for short headlines
- Anti-merge guardrails:
  - reject merges when overlap is too generic
  - reject weak same-entity but different-event matches
  - reject time-distant weak matches
  - reject low-weighted-score candidates
- Inspectability:
  - clusters now keep merge decisions, prevented-merge counts, and representative selection reasons
  - pipeline runs now expose average cluster size, singleton count, prevented merges, and sample cluster rationale

## Clustering Support Note

- clustering now has explicit canonical contracts for:
  - cluster candidates
  - similarity signals
  - merge support
  - representative selection support
- after-market-agent is the active clustering support owner
- final `SignalCluster` assembly remains canonical website logic
- FNS diversity-aware post-cluster support is now active and deterministic

## Homepage Quality Note

- Semantic dedup now suppresses repeated event families across the hero, top-event rail, category rails, and watchlist where possible.
- `Why this ranks here` now describes source confirmation, freshness, and likely impact in user-facing language instead of keyword-trigger or debug-style phrasing.
- The low-value `Trigger / Earlier / Shift` timeline block was removed from homepage cards because current Phase 1 data quality does not support a reliable user-facing timeline narrative.

## Evidence and Confidence

- Repo evidence used:
  - `src/lib/data.ts`
  - `src/lib/pipeline/`
  - `src/lib/scoring/scoring-engine.ts`
  - `src/lib/observability/pipeline-run.ts`
- Confidence: Medium-high for local deterministic behavior; medium for live-feed quality because external RSS availability varies.
