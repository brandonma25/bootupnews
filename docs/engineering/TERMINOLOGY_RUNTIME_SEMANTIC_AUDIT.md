# Terminology Runtime Semantic Audit

Date: 2026-04-26
Branch: `codex/terminology-runtime-semantic-audit`
Scope: Read-only semantic code audit with one docs-only output.

## Scope Control

This audit did not rename files, change code, change schemas, update UI copy, add tests, add migrations, or alter runtime behavior.

The only intended repository change is this audit document.

## Required Reading Completed

- `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`
- `docs/engineering/TERMINOLOGY_DRIFT_AUDIT.md`
- `AGENTS.md`
- `docs/engineering/protocols/engineering-protocol.md`

Because `AGENTS.md` also requires protocol reading before substantial repo work, the following were also read:

- `docs/engineering/protocols/test-checklist.md`
- `docs/engineering/protocols/prd-template.md`
- `docs/engineering/protocols/release-machine.md`
- `docs/engineering/protocols/release-automation-operating-guide.md`

## Workspace Decision

The initial `Documents` checkout at `/Users/bm/Documents/daily-intelligence-aggregator-main` reported a bad `HEAD` tree and was not used for audit edits.

The live canonical repo path was verified under `/Users/bm/dev/daily-intelligence-aggregator`. A dedicated docs-only audit worktree was created from `origin/main`:

- Worktree: `/Users/bm/dev/worktrees/daily-intelligence-aggregator-terminology-runtime-semantic-audit`
- Branch: `codex/terminology-runtime-semantic-audit`
- Base: `origin/main` at `2299994`

## Canonical Runtime Levels

Canonical terminology from `BOOTUP_CANONICAL_TERMINOLOGY.md` defines this object flow:

`Article -> Story Cluster -> Signal -> Card -> Surface Placement`

- Article: raw or normalized ingested source item.
- Story Cluster: structural grouping of related Articles.
- Signal: ranked and interpreted importance unit derived from one or more Story Clusters.
- Card: UI representation of a Signal or story object.
- Surface Placement: contextual placement of a Card on a product surface.

## Executive Summary

No confirmed runtime crash or direct code bug was found that is caused solely by terminology drift.

The clustering code does treat clusters as structural grouping objects only. Raw ingested Articles become grouped Story Clusters in `clusterNormalizedArticles()` after ingestion, normalization, and deduplication.

The highest-risk semantic drift is downstream of clustering: the current runtime often uses "Signal" names for ranked Story Clusters, mixed Briefing/Card view models, editorial rows, and public placements. In particular, `signal_posts` does not represent canonical Signal identity. It represents a daily editorial/published placement read model with card copy and rank/live-state fields.

Most `SignalCluster`, `RankedSignal`, `rankingSignals`, `RankedCluster`, and `StoryCard` drift is naming debt in current runtime behavior. The behavior-impacting risk is architectural: because no durable canonical Signal object exists, future progression, lineage, cross-day state, and signal-level editorial workflows could accidentally attach to cluster IDs, card IDs, or placement rows.

## Article vs Story Cluster

### Where Articles Become Story Clusters

Raw source items become normalized Article objects, are deduplicated, and then become Story Clusters here:

- `src/lib/pipeline/index.ts`
  - `runClusterFirstPipeline()`
  - Runtime flow: `ingestRawItems() -> normalizeRawItems() -> deduplicateArticles() -> clusterNormalizedArticles() -> rankSignalClusters() -> buildDigestOutput()`
- `src/lib/pipeline/ingestion/index.ts`
  - `ingestRawItems()`
  - Runtime object level: Raw source items.
- `src/lib/pipeline/normalization/index.ts`
  - `normalizeRawItems()`
  - Runtime object level: normalized Articles.
- `src/lib/pipeline/dedup/index.ts`
  - `deduplicateArticles()`
  - Runtime object level: deduplicated Articles.
- `src/lib/pipeline/clustering/index.ts`
  - `clusterNormalizedArticles()`
  - Runtime object level: Story Clusters, currently typed as `SignalCluster[]`.
- `src/lib/models/signal-cluster.ts`
  - `SignalCluster`
  - Runtime object level: Story Cluster.

### Clustering Behavior

The clustering implementation uses Articles and similarity decisions to create structural group objects. A cluster contains:

- `cluster_id`
- `articles`
- `representative_article`
- `topic_keywords`
- `cluster_size`
- `cluster_debug`

No canonical Signal-level interpretation, editorial state, progression state, card rendering data, or surface placement is created inside the clustering module. The module currently uses the term `SignalCluster`, but the behavior is structural Story Cluster behavior.

Conclusion: Article-to-Story-Cluster behavior is semantically sound at runtime. The drift here is naming-only unless future code starts treating `SignalCluster.cluster_id` as durable Signal identity.

## Findings

| ID | File/path | Symbol/function/component/table | Current term used | Actual object level | Canonical object level | Severity | Drift type | Recommended future action | Timing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F-01 | `src/lib/models/signal-cluster.ts` | `SignalCluster` | Signal Cluster | Structural grouping of Articles | Story Cluster | Medium | Naming-only today | Rename or introduce compatibility alias to `StoryCluster`; preserve old name temporarily if needed for migration safety. | Before Phase 2 |
| F-02 | `src/lib/pipeline/clustering/index.ts` | `clusterNormalizedArticles()` | Returns `SignalCluster[]` | Article grouping / cluster formation | Story Cluster creation | Medium | Naming-only today | Rename return type and local variables to Story Cluster language in a scoped refactor. | Before Phase 2 |
| F-03 | `src/lib/pipeline/index.ts` | `runClusterFirstPipeline()`, `ranked_clusters` | Ranked clusters / signal clusters | Pipeline stage from Story Cluster to ranked evidence | Boundary between Story Cluster and Signal | High | Behavior-impacting architecture risk | Add an explicit runtime boundary for Signal Candidate or Derived Signal before downstream consumers treat ranked clusters as product Signals. | Before Phase 2 |
| F-04 | `src/lib/scoring/scoring-engine.ts` | `rankSignalClusters()`, `RankedClusterResult` | Signal clusters, ranked clusters | Scored Story Clusters with ranking debug | Signal Candidate or ranked Story Cluster | Medium | Naming-only today; behavior-impacting future risk | Rename as `rankStoryClusters()` or create a real Signal derivation step after scoring. | Before Phase 2 |
| F-05 | `src/lib/models/ranked-signal.ts` | `RankedSignal` | Ranked Signal | Score/debug wrapper keyed by `cluster_id` | Signal or Signal Candidate | High | Behavior-impacting architecture risk | Do not expand this type as canonical Signal identity; either rename to `RankedStoryCluster` or replace with an explicit Signal model that carries lineage and interpretation. | Before Phase 2 |
| F-06 | `src/lib/pipeline/digest/index.ts` | `RankedClusterView`, `buildDigestOutput()` | Ranked cluster view | Top ranked Story Cluster evidence for digest output | Signal Candidate feeding Cards | Medium | Naming-only today | Keep as ranked cluster view or make digest consume explicit Signal Candidates after that boundary exists. | Before Phase 2 |
| F-07 | `src/lib/data.ts` | `generateDailyBriefing()` | Briefing item, ranking signals | Mixed view model derived from ranked clusters; often rendered as card content | Signal plus Card view model should be distinct | High | Behavior-impacting architecture risk | Split formation output from presentation output: a Signal view model should be distinct from homepage/editorial Card data. | Before Phase 2 |
| F-08 | `src/lib/types.ts` | `BriefingItem` | Briefing item, signal role, ranking signals | Compatibility payload combining story, Signal-like ranking fields, editorial fields, and card fields | Signal, Card, and Surface Placement should be separate | High | Behavior-impacting architecture risk | Treat `BriefingItem` as a legacy boundary object; introduce narrower types for Signal, Card, and Surface Placement before progression work. | Before Phase 2 |
| F-09 | `src/lib/types.ts` | `EventIntelligence.signals`, `EventSignalStrength` | Signals | Event metrics and signal-strength labels | Signal attributes, not Signal objects | Low | Naming-only | Rename metrics only if touched; otherwise document as ranking/explanation metrics. | Later |
| F-10 | `src/lib/ranking.ts` | `ArticleCluster`, `RankedCluster`, `rankNewsClusters()`, `rankingSignals` | Ranked Cluster, ranking signals | Legacy scored Article Cluster / BriefingItem path | Story Cluster to Signal Candidate | Medium | Mostly naming-only; minor behavior risk through ranking filters | Keep isolated as legacy compatibility or align names during a future ranking refactor. | Before Phase 2 |
| F-11 | `src/lib/explanation-support.ts` | `buildExplanationPacket()`, `rankingSignals`, `cluster` | Ranking signals | Explanation evidence from EventIntelligence, ranking debug, and Story Cluster | Signal interpretation support | Medium | Naming-only today | Keep using cluster/ranking evidence, but make future canonical Signal generation own why-it-matters inputs explicitly. | Before Phase 2 |
| F-12 | `src/lib/connection-support.ts` | `assembleConnectionLayer()`, `signalRole`, `cluster` | Signal role | Context/connection evidence derived from event and cluster inputs | Signal interpretation support | Low | Naming-only today | Keep as explanation support; avoid treating this as canonical Signal state. | Later |
| F-13 | `src/lib/signal-filtering.ts` | `SignalFilterCandidate`, `applySignalFiltering()` | Signal filter candidate | Article-level quality/filter candidate before clustering | Article | Medium | Naming-only today; behavior-impacting future risk | Rename to Article quality/filter language before adding true Signal filtering. | Before Phase 2 |
| F-14 | `supabase/schema.sql` | `public.pipeline_article_candidates` | Article candidates with clustered/ranked/surfaced stages | Article-level pipeline tracking | Article lifecycle metadata | Low | Naming aligned enough | Keep as article-candidate tracking; do not repurpose as Signal identity. | Later |
| F-15 | `src/lib/signals-editorial.ts` | `EditorialSignalPost`, `StoredSignalPost`, `persistSignalPostsForBriefing()` | Signal post | Daily editorial snapshot row built from `BriefingItem` | Surface Placement plus Card copy | High | Behavior-impacting | Treat this as a placement/read-model contract, not canonical Signal storage; document operationally before launch and design separate Signal identity before progression. | Before MVP for contract clarity; before Phase 2 for model change |
| F-16 | `src/lib/signals-editorial.ts` | `publishApprovedSignals()` | Publish Top 5 Signals | Publishes top five live editorial rows and published why-it-matters copy | Surface Placement publication | High | Behavior-impacting | Keep current behavior stable, but future implementation should publish placements that reference canonical Signal IDs rather than making rows the Signal. | Before Phase 2 |
| F-17 | `src/lib/signals-editorial.ts` | `getPublishedSignalPosts()`, `getHomepageSignalSnapshot()` | Published signal posts, homepage signal snapshot | Public read model for live cards/depth pool | Surface Placement read model | High | Behavior-impacting | Rename only in a later migration; before then, document that these rows are live/public placements. | Before MVP for contract clarity; before Phase 2 for rename/model work |
| F-18 | `supabase/schema.sql` | `public.signal_posts` | Signal posts | Daily ranked editorial placement table with `briefing_date`, `rank`, `is_live`, status, and published copy | Surface Placement plus Card content | High | Behavior-impacting | Do not treat `id` or `(briefing_date, rank)` as Signal identity; design `signals` and placement tables separately when progression begins. | Before Phase 2 |
| F-19 | `supabase/migrations/20260423090000_signals_admin_editorial_layer.sql` | `signal_posts` initial table | Signal posts | Initial editorial Top 5 rows with rank 1-5 | Surface Placement plus Card content | High | Behavior-impacting | Historical migration should remain unchanged; future docs should call it legacy placement naming. | Later |
| F-20 | `supabase/migrations/20260424083000_signal_posts_historical_archive.sql` | `briefing_date`, `is_live`, live rank index | Signal post history/live state | Historical placement snapshots and current live set | Surface Placement history | High | Behavior-impacting | Preserve as placement history; do not build Signal progression on live rank history alone. | Before Phase 2 |
| F-21 | `supabase/migrations/20260426120000_signal_posts_public_depth_pool.sql` | Rank 1-20 depth pool | Signal posts depth pool | Public placement/card depth pool | Surface Placement depth pool | Medium | Behavior-impacting | Keep as surface depth behavior; future canonical Signal depth should reference Signal IDs. | Before Phase 2 |
| F-22 | `src/lib/data.ts` | `mapHomepageSignalPostToBriefingItem()`, `buildPublicHomepageData()` | Homepage signal post | Maps placement rows back into `BriefingItem` card objects | Surface Placement to Card rendering | High | Behavior-impacting | Introduce an explicit card adapter name when touching this path; avoid treating mapped `BriefingItem.id` as Signal identity. | Before Phase 2 |
| F-23 | `src/lib/homepage-editorial-overrides.ts` | `PublishedHomepageEditorialOverride`, `applyPublishedHomepageEditorialOverrides()` | Published signal post override | Published card-copy override matched by title/source URL | Surface Placement/Card override | Medium | Behavior-impacting | Replace title/source matching with canonical Signal or placement references once identity exists; current behavior should be documented as presentation override. | Before Phase 2 |
| F-24 | `src/app/signals/page.tsx` | `PublicSignalsPage` | Top 5 Signals | Public list of published editorial cards/placements | Surface Placement rendering Cards | Medium | Naming/product semantics | Leave UI copy unchanged for this audit; later copy/model work should clarify whether users see Signals or Signal Cards. | Later |
| F-25 | `src/app/dashboard/signals/editorial-review/page.tsx` | Editorial review page, publish controls | Top 5 Signals, signal posts | Editorial workflow for approving card copy and live placement rows | Surface Placement/Card workflow | High | Behavior-impacting | Add operational contract docs before launch; future schema should separate Signal approval from placement publishing. | Before MVP for contract clarity; before Phase 2 for model change |
| F-26 | `src/app/dashboard/signals/editorial-review/StructuredEditorialFields.tsx` | `SignalPostEditor` | Signal post editor | Editor for homepage teaser, preview, expanded body, and published card content | Card content editor | Medium | Behavior-impacting presentation risk | Rename in later UI/type refactor; future UI should distinguish editing Signal interpretation from editing Card copy. | Before Phase 2 |
| F-27 | `src/lib/homepage-model.ts` | `HomepageEvent`, `topSignalEventIds`, `earlySignals`, semantic duplicate suppression | Signal/event/card mixed language | Surface-level homepage event/card placement and duplicate suppression | Surface Placement/Card behavior | Medium | Behavior-impacting | Document duplicate suppression as surface-only; do not reuse it as canonical Signal dedup/progression logic. | Before Phase 2 |
| F-28 | `src/components/landing/homepage.tsx` | `HomeTopEventCard`, `CategoryTabStrip` | Top Event card | Homepage Card rendering | Card on Surface Placement | Low | Naming aligned enough | No action required unless broader card vocabulary changes. | Later |
| F-29 | `src/components/briefing/BriefingDetailView.tsx` | `BriefingEventDetailCard`, ranking signals UI | Ranking signals | Card rendering of explanation/ranking chips | Card rendering Signal evidence | Low | Naming-only | Keep labels unless product copy changes; internal model should remain separate. | Later |
| F-30 | `src/components/story-card.tsx` | `StoryCard` | Story card, ranking signals | Card rendering of `BriefingItem`; appears unused in live routes | Card | Low | Naming-only | Leave alone until dead-code cleanup or card system refactor. | Later |
| F-31 | `src/components/dashboard/personalized-dashboard.tsx` | `displaySignals`, `coreSignals`, `contextSignals`, `DashboardEventCard` | Signals | Legacy dashboard card buckets from `BriefingItem`; `/dashboard` currently redirects to `/` | Surface Placement/Card buckets | Low | Naming-only in current routed product | If this route returns, align labels/types before reactivation. | Later |
| F-32 | `src/components/home/DevelopingNow.tsx` | Developing Now copy | Signals | Category/card surface language about represented stories | Surface Placement language | Low | Naming/product semantics | Leave unless product copy changes. | Later |
| F-33 | `src/app/actions.ts` | `generateBriefingAction()`, `persistSignalPostsForBriefing()` | Signal post persistence | Potentially writes global editorial placement rows from generated briefing items | Surface Placement snapshot | Medium | Behavior-impacting risk, not confirmed live bug | Confirm route reachability and intended operator before MVP; if active, constrain persistence to the intended public/editorial generation path. | Before MVP |

## Audit Questions Answered

### 1. Article vs Story Cluster

Articles become Story Clusters in `src/lib/pipeline/clustering/index.ts` through `clusterNormalizedArticles()`.

The clustering code treats clusters as structural grouping objects only. It does not create canonical Signal identity, editorial state, surface placement, or UI card state. The misleading term is `SignalCluster`, but the behavior is Story Cluster behavior.

### 2. Story Cluster vs Signal

Cluster-like objects named or treated as Signals include:

- `SignalCluster` in `src/lib/models/signal-cluster.ts`
- `rankSignalClusters()` in `src/lib/scoring/scoring-engine.ts`
- `RankedSignal` in `src/lib/models/ranked-signal.ts`
- `RankedCluster` and `rankingSignals` in `src/lib/ranking.ts`
- `BriefingItem` and `rankingSignals` in `src/lib/types.ts` and `src/lib/data.ts`
- `signal_posts` in `src/lib/signals-editorial.ts` and Supabase schema/migrations
- `SignalFilterCandidate` in `src/lib/signal-filtering.ts`

Most cluster-level naming drift is naming-only today. The behavior-impacting drift starts when ranked cluster evidence becomes `BriefingItem` card data and when `signal_posts` rows become the public/editorial object called "Signals."

### 3. Signal vs Card

UI paths that render cards but use Signal language include:

- `src/app/signals/page.tsx`: renders published editorial rows as "Top 5 Signals."
- `src/app/dashboard/signals/editorial-review/page.tsx`: edits and publishes "Signals," but the workflow is card-copy and placement publication.
- `src/app/dashboard/signals/editorial-review/StructuredEditorialFields.tsx`: edits homepage teaser, preview, expanded content, and published card copy.
- `src/components/dashboard/personalized-dashboard.tsx`: legacy dashboard buckets `displaySignals`, `coreSignals`, and `contextSignals` render `BriefingItem` cards.
- `src/components/story-card.tsx`: renders a `BriefingItem` card, though it appears unused in live routes.
- `src/components/landing/homepage.tsx` and `src/components/briefing/BriefingDetailView.tsx`: mostly use Card/Event language, but render ranking-signal evidence chips.

Presentation is not currently confused inside the visible homepage card components: homepage rendering behaves like Card/Surface Placement rendering. The confusion is mainly in the data objects and editorial/public routes that call the placed cards "Signals."

### 4. Signal vs Surface Placement

`signal_posts` represents editorial/published placement plus card content. It does not represent canonical Signal identity.

Operational contract: `docs/engineering/SIGNAL_POSTS_OPERATIONAL_CONTRACT.md`.

Evidence:

- The table has `briefing_date`, `rank`, `is_live`, editorial status, published timestamp, and published why-it-matters copy.
- Current constraints support daily rank snapshots and a live public Top 5/depth pool.
- `persistSignalPostsForBriefing()` maps `BriefingItem` objects into rows.
- `publishApprovedSignals()` publishes row placements and card copy.
- `getPublishedSignalPosts()` and `getHomepageSignalSnapshot()` read live placements for public surfaces.
- `applyPublishedHomepageEditorialOverrides()` uses live `signal_posts` rows as card-copy overrides matched by title/source URL.

Therefore `signal_posts` is best classified as:

- Editorial/published placement: yes.
- Surface-specific card content: yes.
- Canonical Signal identity: no.
- Something else: it is also a legacy public read model and daily placement archive.

## Product Behavior Risk Assessment

| Area | Risk assessment | Severity | Notes |
| --- | --- | --- | --- |
| Ranking quality | Current ranking scores Story Clusters deterministically. No confirmed ranking bug from terminology drift. Risk is future work treating `RankedSignal` as a canonical Signal instead of ranked cluster evidence. | Medium | Main paths: `rankSignalClusters()`, `RankedSignal`, `generateDailyBriefing()`. |
| Duplicate suppression/deduplication | Article dedup and clustering are separate and mostly sound. Homepage duplicate suppression is surface-level, not canonical signal dedup. | Medium | Main path: `src/lib/homepage-model.ts`. |
| Why-it-matters generation | Generation uses cluster/ranking/event evidence, which is reasonable. Editorial overrides later replace card copy from `signal_posts`, so future signal-level why-it-matters could be confused with card-level copy. | Medium | Main paths: `src/lib/explanation-support.ts`, `src/lib/homepage-editorial-overrides.ts`. |
| Editorial approval flow | High risk because editorial review approves and publishes `signal_posts` rows called Signals, while those rows are actually placement/card records. | High | Main path: `src/lib/signals-editorial.ts`. |
| Homepage/category surface behavior | High enough to handle deliberately: homepage/category cards can be driven by `signal_posts` live/depth rows and editorial overrides. This is surface behavior, not Signal identity. | High | Main paths: `getHomepageSignalSnapshot()`, `buildPublicHomepageData()`, homepage model. |
| Future progression model | Highest conceptual risk. There is no durable canonical Signal identity or lineage boundary today. Cluster IDs, BriefingItem IDs, and signal_posts row IDs are not sufficient replacements. | High | Needs explicit Signal model before Phase 2 progression/lineage implementation. |

## Confirmed Runtime Bugs

No confirmed runtime bug was found that is caused solely by terminology drift.

The audit did identify behavior-impacting semantic risk in the public/editorial read model. That risk is not the same as a verified current production bug. It means future work could easily bind progression, editorial approval, or duplicate suppression to the wrong object level unless the model boundary is made explicit.

## Naming-Only Debt

The following are primarily naming debt in current behavior:

- `SignalCluster` for Story Cluster objects.
- `rankSignalClusters()` when used as ranked Story Cluster scoring.
- `RankedCluster` and `rankingSignals` in legacy ranking/display paths.
- `EventIntelligence.signals` for event metrics.
- `StoryCard` rendering `BriefingItem` card data.
- Ranking signal chips in card UI.

These should not block MVP if the current runtime behavior is otherwise acceptable, but they should be cleaned before Phase 2 model expansion.

## Behavior-Impacting Drift

The following drift has product or architecture consequences:

- `signal_posts` is named like canonical Signal storage but behaves as Surface Placement plus Card content.
- `BriefingItem` collapses Signal-like ranking evidence, editorial fields, and Card rendering payload into one compatibility object.
- Homepage public data can be reconstructed from live `signal_posts` placements rather than from durable Signal identity.
- Editorial why-it-matters copy is stored/published at the placement/card row level.
- Homepage duplicate suppression is surface-level and should not be reused as Signal-level deduplication.
- Current object IDs are cluster/card/placement IDs, not stable Signal lineage IDs.

## Recommended Next Implementation Tasks

1. Before MVP: add or update operational documentation stating that `signal_posts` is a live editorial placement/card read model, not canonical Signal identity. Completed in `docs/engineering/SIGNAL_POSTS_OPERATIONAL_CONTRACT.md`.
2. Before MVP: verify whether `generateBriefingAction()` can write global `signal_posts` rows from any reachable non-editorial path; if reachable, decide whether that is intended operator behavior. Completed in `docs/engineering/GENERATE_BRIEFING_SIGNAL_POSTS_WRITE_AUDIT.md`.
3. Before Phase 2: define a canonical `Signal` or `SignalCandidate` model with stable identity, source cluster references, interpretation fields, and progression/lineage fields.
4. Before Phase 2: separate `BriefingItem` into narrower formation and presentation types, such as Signal Candidate, Card view model, and Surface Placement.
5. Before Phase 2: rename or alias `SignalCluster` to Story Cluster terminology in a scoped compatibility-safe refactor.
6. Before Phase 2: make homepage/category duplicate suppression explicitly surface-level and prevent it from becoming canonical Signal deduplication.
7. Later: clean UI/component naming where cards are called Signals after the canonical model exists.

## Files Inspected

Required docs and protocols:

- `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`
- `docs/engineering/TERMINOLOGY_DRIFT_AUDIT.md`
- `AGENTS.md`
- `docs/engineering/protocols/engineering-protocol.md`
- `docs/engineering/protocols/test-checklist.md`
- `docs/engineering/protocols/prd-template.md`
- `docs/engineering/protocols/release-machine.md`
- `docs/engineering/protocols/release-automation-operating-guide.md`

Pipeline, ranking, model, and editorial code:

- `src/lib/pipeline/index.ts`
- `src/lib/pipeline/ingestion/index.ts`
- `src/lib/pipeline/normalization/index.ts`
- `src/lib/pipeline/dedup/index.ts`
- `src/lib/pipeline/clustering/index.ts`
- `src/lib/pipeline/digest/index.ts`
- `src/lib/pipeline/article-candidates.ts`
- `src/lib/models/signal-cluster.ts`
- `src/lib/models/ranked-signal.ts`
- `src/lib/scoring/scoring-engine.ts`
- `src/lib/ranking.ts`
- `src/lib/types.ts`
- `src/lib/event-intelligence.ts`
- `src/lib/explanation-support.ts`
- `src/lib/connection-support.ts`
- `src/lib/signal-filtering.ts`
- `src/lib/data.ts`
- `src/lib/signals-editorial.ts`
- `src/lib/homepage-model.ts`
- `src/lib/homepage-taxonomy.ts`
- `src/lib/homepage-editorial-overrides.ts`
- `src/app/actions.ts`

Routes and components:

- `src/app/signals/page.tsx`
- `src/app/dashboard/signals/editorial-review/page.tsx`
- `src/app/dashboard/signals/editorial-review/StructuredEditorialFields.tsx`
- `src/app/dashboard/page.tsx`
- `src/components/story-card.tsx`
- `src/components/landing/homepage.tsx`
- `src/components/briefing/BriefingDetailView.tsx`
- `src/components/dashboard/personalized-dashboard.tsx`
- `src/components/home/DevelopingNow.tsx`
- `src/components/home/CategoryPreviewGrid.tsx`
- `src/components/home/CategoryTabStrip.tsx`
- `src/components/history/EarlySignalsSection.tsx`

Schemas and migrations:

- `supabase/schema.sql`
- `supabase/migrations/20260416200404_prd_13_signal_filtering_columns.sql`
- `supabase/migrations/20260423090000_signals_admin_editorial_layer.sql`
- `supabase/migrations/20260424083000_signal_posts_historical_archive.sql`
- `supabase/migrations/20260426120000_signal_posts_public_depth_pool.sql`

Validation discovery:

- `package.json`
- `scripts/validate-documentation-coverage.py`
- `scripts/pr-governance-audit.py`
- `scripts/check-governance-hotspots.py`

## Validation

Validation completed on 2026-04-26:

- `git diff --check` - passed.
- Supplemental no-index whitespace check for this new untracked audit document - passed.
- `npm run governance:coverage` - passed. The validator classified the branch as `docs-only`, governance tier `baseline`, and reported documentation coverage satisfied.
- `npm run governance:audit` - passed. The audit classified the branch as `docs-only`, governance tier `baseline`, branch fresh with `origin/main`, and reported no missing documentation coverage.
- `npm run governance:hotspots` - passed. The checker reported one changed file and no serialized governance hotspot files touched.
