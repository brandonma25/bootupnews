# Terminology Drift Audit

## Purpose

This audit records known terminology risks after searching the repo for `signal`, `signals`, `cluster`, `clusters`, `card`, `cards`, `story`, and `stories`.

This is documentation-only. No code, schema, ranking, clustering, homepage, or runtime behavior was changed.

## Summary

The highest-risk drift is not ordinary UI styling that uses `card` as a visual token. The main risk is object-level ambiguity where code or docs use `signal`, `cluster`, `story`, and `card` to describe different layers of the pipeline.

## Potentially Ambiguous Files

| File | Drift observed | Recommended future cleanup | Cleanup type |
| --- | --- | --- | --- |
| `src/lib/models/signal-cluster.ts` | The structural grouping model is named `SignalCluster`, which blurs Story Cluster and Signal. | Rename or alias toward `StoryCluster` only in a scoped compatibility plan with tests. | Code naming |
| `src/lib/pipeline/clustering/index.ts` | `clusterNormalizedArticles()` returns `SignalCluster[]`, mixing clustering output with signal terminology. | Document current legacy naming, then migrate to `StoryCluster` terminology when pipeline contracts can move together. | Code naming |
| `src/lib/scoring/scoring-engine.ts` | Ranking operates on clustered evidence and returns ranked cluster results, which can be read as ranking clusters rather than derived Signals. | Introduce explicit docs or types that distinguish ranked Story Cluster evidence from interpreted Signal output before any architecture change. | Code naming |
| `src/lib/ranking.ts` | `RankedCluster`, `rankingSignals`, and display-signal strings use "signal" both for product importance and for explanatory badges. | Separate "ranking evidence labels" from canonical Signal terminology in a scoped naming pass. | Code naming |
| `src/lib/types.ts` | `EventIntelligence.signals`, `BriefingItem.rankingSignals`, `signalRole`, and `EventSignalStrength` mix signal metrics, display labels, and product object language. | Add compatibility comments or new canonical object types before expanding these fields. | Code naming |
| `src/lib/data.ts` | Converts ranked clusters and persisted signal posts into `BriefingItem`, so Article, Story Cluster, Signal, and Card layers can collapse into one payload. | Future data-model work should state which object level `BriefingItem` represents on each path. | Code naming |
| `src/lib/homepage-model.ts` | `HomepageEvent`, `topSignalEventIds`, `earlySignals`, and surface selectors combine Signal identity with homepage placement logic. | Add explicit Surface Placement terminology before changing homepage selection logic. | Code naming |
| `src/lib/signals-editorial.ts` | `signal_posts` stores editorial/public Top 5 rows that may represent published Signal Cards or placements rather than canonical Signal identity. | Treat `signal_posts` as legacy persisted presentation/editorial rows unless a future schema plan defines canonical Signal identity. | Database naming |
| `supabase/migrations/20260423090000_signals_admin_editorial_layer.sql` | `public.signal_posts` naming can imply canonical Signal storage. | Do not rename in-place; future schema work should define whether this table stores Signals, Cards, or Surface Placements. | Database naming |
| `src/components/story-card.tsx` | `StoryCard` renders a `BriefingItem` and uses `rankingDisplaySignals`; "story," "card," and "signal" appear in one component boundary. | Rename only through a scoped UI/component cleanup after canonical object mapping is defined. | Code naming |
| `src/app/signals/page.tsx` | Public route copy uses "Top 5 Signals" for a rendered/published list. | Clarify in future UI copy whether the page is a Surface Placement that renders Signal Cards. | Product/UI copy |
| `src/app/dashboard/signals/editorial-review/page.tsx` | Editorial review refers to current cards, signal posts, and Top 5 Signals in the same workflow. | Future editorial docs should state whether editors are editing Signal interpretation, Card copy, or Surface Placement rows. | Product/UI copy |
| `docs/product/prd/prd-06-event-clustering-foundation.md` | Uses event clusters before canonical Story Cluster terminology existed. | Update only when the PRD is next touched for a scoped product change. | Documentation-only |
| `docs/product/prd/prd-36-signal-display-cap.md` | Describes capped dashboard display as "signals," which can blur Signal identity and Card rendering. | Future revisions should say the cap is a Surface Placement/Card rendering rule. | Documentation-only |
| `docs/product/prd/prd-53-signals-admin-editorial-layer.md` | Editorial workflow uses "signal posts," "homepage cards," and "Top 5 Signals" together. | Future revisions should distinguish edited Signal interpretation from rendered Card copy and published placement rows. | Documentation-only |
| `docs/product/prd/prd-57-homepage-volume-layers.md` | Mostly clear on surface behavior, but uses "Top 5 Signals" and "story family" around homepage placement logic. | Future revisions should explicitly classify Top 5, Developing Now, and category modules as Surface Placements. | Documentation-only |

## Terms That Were Not Automatically Changed

- `card` in CSS variables, UI primitives, and visual component classes is usually legitimate presentation terminology.
- `signal` in `AbortController.signal`, process exit signals, and governance "fix signal" output is unrelated to product Signal terminology.
- News headlines may naturally contain "signals" as a verb, such as "Fed signals rates."
- Existing database names such as `signal_posts` were not changed because schema renames require a separate migration and compatibility plan.

## Recommended Future Cleanup Sequence

1. Add compatibility comments around the highest-risk legacy terms in pipeline model boundaries.
2. Define whether `BriefingItem` is a Signal view model, Card view model, or mixed compatibility payload.
3. Scope any `SignalCluster` to `StoryCluster` rename as a dedicated code-naming change with tests.
4. Treat `signal_posts` as legacy naming until a future schema plan defines canonical Signal identity versus Card or Surface Placement persistence.
5. Refresh PRDs opportunistically when they are next materially edited; do not churn historical PRDs only for terminology.
