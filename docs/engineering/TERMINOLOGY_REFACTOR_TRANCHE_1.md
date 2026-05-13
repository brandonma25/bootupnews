# Terminology Refactor Tranche 1

Date: 2026-04-26

Change type: refactor

Source of truth:

- `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`
- `docs/engineering/TERMINOLOGY_DRIFT_AUDIT.md`
- `docs/engineering/TERMINOLOGY_RUNTIME_SEMANTIC_AUDIT.md`
- `docs/engineering/SIGNAL_POSTS_OPERATIONAL_CONTRACT.md`
- `docs/engineering/GENERATE_BRIEFING_SIGNAL_POSTS_WRITE_AUDIT.md`
- `AGENTS.md`
- `docs/engineering/protocols/engineering-protocol.md`

This tranche reduces terminology debt while preserving runtime behavior. It does not introduce canonical Signal identity, change database schema, rename routes, alter ranking or clustering logic, alter editorial publishing, or change homepage/category behavior.

## Pre-Change Classification

Safe now:

| Area | Current term | Target term | Actual object level | Decision |
| --- | --- | --- | --- | --- |
| Cluster model | `SignalCluster` | `StoryCluster` | Story Cluster | Introduce canonical type and keep deprecated compatibility alias. |
| Ranked model | `RankedSignal` | `RankedStoryCluster` | Ranked Story Cluster evidence keyed by `cluster_id` | Introduce canonical type and keep deprecated compatibility alias. |
| Scoring entry point | `rankSignalClusters()` | `rankStoryClusters()` | Story Cluster ranking | Rename implementation and keep deprecated function alias. |
| Article filtering | `SignalFilterCandidate` | `ArticleFilterCandidate` | Article-level pre-cluster quality candidate | Introduce canonical type and keep deprecated compatibility alias. |
| Article filtering evaluation | `SignalFilterEvaluation` | `ArticleFilterEvaluation` | Article-level filter result | Introduce canonical type and keep deprecated compatibility alias. |
| Legacy ranking type | `RankedCluster` | `RankedArticleCluster` | Legacy Article Cluster ranking display payload | Introduce canonical type and keep deprecated compatibility alias. |
| Card/view-model boundary | `BriefingItem`, `StoryCard`, `rankingSignals` | Comments only | MVP compatibility view-model and Card rendering | Add boundary comments only. |
| Editorial placement boundary | `signal_posts` helpers | Comments only | Surface Placement plus Card copy/public read model | Add operational contract comments only. |

Safe with compatibility alias:

- `SignalCluster` remains exported as a deprecated alias of `StoryCluster`.
- `RankedSignal` remains exported as a deprecated alias of `RankedStoryCluster`.
- `RankedClusterResult` remains exported as a deprecated alias of `RankedStoryClusterResult`.
- `rankSignalClusters` remains exported as a deprecated alias of `rankStoryClusters`.
- `SignalFilterCandidate` remains exported as a deprecated alias of `ArticleFilterCandidate`.
- `SignalFilterEvaluation` remains exported as a deprecated alias of `ArticleFilterEvaluation`.
- `evaluateSignalCandidate` remains exported as a deprecated alias of `evaluateArticleFilterCandidate`.
- `RankedCluster` remains exported as a deprecated alias of `RankedArticleCluster`.

Deferred:

- `signal_posts` table, columns, migrations, and generated/public row shape.
- `/signals` route naming and public UI copy.
- Broad `rankingSignals` property rename across `BriefingItem`, homepage, tests, and presentation components.
- `BriefingItem` decomposition into separate Signal, Card, and Surface Placement runtime objects.
- `generateBriefingAction()` write behavior.
- Homepage/category selection behavior and editorial publishing workflow.
- Canonical Signal identity, progression, lineage, and history implementation.

Do not touch:

- Database schema or migrations.
- Public API/route behavior.
- Ranking, clustering, deduplication, homepage, category, publication, or editorial approval behavior.

## Changes Made

| File | Old term | New term | Actual object level | Behavior impact |
| --- | --- | --- | --- | --- |
| `src/lib/models/signal-cluster.ts` | `SignalCluster` | `StoryCluster` plus deprecated alias | Story Cluster | None. Type alias only. |
| `src/lib/models/ranked-signal.ts` | `RankedSignal` | `RankedStoryCluster` plus deprecated alias | Ranked Story Cluster evidence | None. Type alias only. |
| `src/lib/scoring/scoring-engine.ts` | `RankedClusterResult`, `rankSignalClusters()` | `RankedStoryClusterResult`, `rankStoryClusters()` plus deprecated aliases | Ranked Story Cluster result | None. Same implementation and scoring logic. |
| `src/lib/pipeline/clustering/index.ts` | `SignalCluster` annotations | `StoryCluster` annotations | Story Cluster creation | None. Type annotations only. |
| `src/lib/pipeline/index.ts` | `rankedClusters` local and `rankSignalClusters()` import | `rankedStoryClusters` local and `rankStoryClusters()` import | Ranked Story Cluster pipeline output | None. Public `ranked_clusters` result key unchanged. |
| `src/lib/pipeline/digest/index.ts` | `SignalCluster`, `RankedSignal` annotations | `StoryCluster`, `RankedStoryCluster` annotations | Digest over ranked Story Clusters | None. Type annotations only. |
| `src/lib/pipeline/article-candidates.ts` | `SignalCluster`, `RankedClusterResult` annotations | `StoryCluster`, `RankedStoryClusterResult` annotations | Article candidate observability for clusters/ranking | None. Type annotations only. |
| `src/lib/integration/subsystem-contracts.ts` | `SignalCluster` contract annotations | `StoryCluster` contract annotations | Support contracts over Story Clusters | None. Type annotations only. |
| `src/adapters/donors/registry.ts` | `SignalCluster` annotation | `StoryCluster` annotation | Donor ranking feature input | None. Type annotation only. |
| `src/lib/explanation-support.ts` | `SignalCluster` annotation | `StoryCluster` annotation | Explanation evidence input | None. Type annotation only. |
| `src/lib/connection-support.ts` | `SignalCluster` annotation | `StoryCluster` annotation | Connection evidence input | None. Type annotation only. |
| `src/lib/signal-filtering.ts` | `SignalFilterCandidate`, `SignalFilterEvaluation`, `evaluateSignalCandidate`, `SIGNAL_FILTER_CONFIG` | `ArticleFilterCandidate`, `ArticleFilterEvaluation`, `evaluateArticleFilterCandidate`, `ARTICLE_FILTER_CONFIG` plus deprecated aliases | Article-level filter candidate/evaluation | None. Same filtering logic. |
| `src/lib/ranking.ts` | `RankedCluster` | `RankedArticleCluster` plus deprecated alias | Legacy Article Cluster ranking display payload | None. Type alias/comment only. |
| `src/lib/types.ts` | `BriefingItem`, `rankingSignals` | Boundary comments | MVP compatibility view-model and Card evidence labels | None. Comments only. |
| `src/lib/signals-editorial.ts` | `signal_posts` helpers | Operational boundary comments | Surface Placement plus Card copy/public read model | None. Comments only. |
| `src/components/story-card.tsx` | `StoryCard` | Boundary comment | Card rendering boundary | None. Comments only. |
| `src/lib/scoring/scoring-engine.test.ts` | `rankSignalClusters`, `SignalCluster` | `rankStoryClusters`, `StoryCluster` | Ranked Story Cluster tests | None. Test import/name alignment only. |
| `src/lib/signal-filtering.test.ts` | `evaluateSignalCandidate`, `SignalFilterCandidate` | `evaluateArticleFilterCandidate`, `ArticleFilterCandidate` | Article filter tests | None. Test import/name alignment only. |
| `src/lib/explanation-support.test.ts` | `SignalCluster` | `StoryCluster` | Story Cluster explanation fixture | None. Test type annotation only. |
| `src/adapters/donors/registry.test.ts` | `SignalCluster` | `StoryCluster` | Story Cluster donor fixture | None. Test type annotation only. |
| `docs/engineering/TERMINOLOGY_REFACTOR_TRANCHE_1.md` | n/a | Refactor log | Tranche documentation | None. Documentation only. |
| Historical terminology-refactor change-record evidence | n/a | Archived operational evidence | Documentation governance coverage | None. Documentation only. |

## Deprecated Names Preserved

The following names remain available for compatibility and are documented as deprecated:

- `SignalCluster`
- `RankedSignal`
- `RankedClusterResult`
- `rankSignalClusters`
- `SignalFilterCandidate`
- `SignalFilterEvaluation`
- `evaluateSignalCandidate`
- `RankedCluster`

## Intentionally Deferred Debt

- Rename or replace `signal_posts` only after a canonical Signal/SignalCandidate identity layer exists.
- Keep `/signals` route naming stable until a product/route migration is explicitly approved.
- Keep broad `BriefingItem.rankingSignals` and homepage/card display payload fields stable in this tranche.
- Do not split `BriefingItem` into Signal, Card, and Surface Placement runtime models in tranche 1.
- Do not change `generateBriefingAction()` persistence behavior.
- Do not change ranking/clustering algorithms or editorial workflow.

## Validation

- `npm install` passed. It installed local dependencies for this worktree so project scripts could run; npm reported 2 dependency audit findings unrelated to this refactor.
- `git diff --check` passed.
- `npm run lint` passed.
- `npm run test -- src/lib/scoring/scoring-engine.test.ts src/lib/signal-filtering.test.ts src/lib/explanation-support.test.ts src/adapters/donors/registry.test.ts` passed: 4 files, 18 tests.
- `npm test` passed: 62 files, 371 tests.
- `npm run governance:coverage` passed after adding the change-record lane pointer.
- `npm run governance:audit` passed: documentation coverage missing none.
- `npm run governance:hotspots` passed: no serialized governance hotspot files touched.
- `npm run build` passed.
- `npx tsc --noEmit --pretty false` failed on existing test-suite typing issues outside this tranche, including `scripts/github-sheets-sync.test.ts`, editorial review tests, homepage tests, personalization tests, source-defaults tests, and why-it-matters tests. The production build TypeScript pass completed successfully.
