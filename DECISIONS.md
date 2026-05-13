# Decisions

Boot Up was built as a solo, AI-agent-assisted product system. This file summarizes durable product and engineering decisions so the implementation history is easier to inspect: what the product chose to optimize for, what it intentionally avoided, and where governance was used to keep fast iteration legible. For a PR-level map of the implementation history, see [docs/portfolio/PR_CLUSTERS.md](docs/portfolio/PR_CLUSTERS.md).

## D01 — Briefing, not feed

**Decision:** Boot Up should present a curated daily intelligence briefing, not an open-ended feed.

**Context:** The product needed to help a serious reader understand the day quickly, not maximize scrolling, article volume, or source coverage.

**Rejected alternative:** A reverse-chronological stream of links, categories, and summaries.

**Trade-off accepted:** The surface is narrower and more opinionated, so some valid stories are intentionally omitted.

**Evidence:** README product thesis; `docs/product/prd/prd-17-homepage-intelligence-surface.md`; `docs/product/prd/prd-40-quality-calibration-and-output-sanity.md`; `docs/product/feature-system.csv`.

**Interview read:** This shows the product had a clear job to do: reduce attention cost through judgment, not abundance.

## D02 — Structural importance over recency or volume

**Decision:** Ranking should privilege structurally important developments over mere freshness, article count, or link volume.

**Context:** News can be fresh without being important, and repeated coverage can inflate attention without improving understanding.

**Rejected alternative:** Ranking primarily by newest article, most sources, or most visible story.

**Trade-off accepted:** The product can feel less exhaustive than a conventional news surface, because it chooses durable significance over coverage breadth.

**Evidence:** PR #120 / merge `4dc913c`; `docs/product/prd/prd-38-importance-ranking-v2.md`; `docs/product/prd/prd-37-phase1-pipeline.md`; `docs/product/feature-system.csv`.

**Interview read:** This shows ranking was treated as a product thesis, not only a sorting implementation detail.

## D03 — Signals over raw articles

**Decision:** The product should rank interpreted Signals derived from Story Cluster evidence, not expose raw article lists as the primary product unit.

**Context:** A reader needs the interpreted development and its significance more than a pile of source items.

**Rejected alternative:** Treating each article, feed item, or raw cluster as the main product object.

**Trade-off accepted:** The system needs stronger terminology, transformation logic, and review discipline to keep Article, Story Cluster, Signal, Card, and Surface Placement distinct.

**Evidence:** `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`; `docs/product/prd/prd-37-phase1-pipeline.md`; PR #210 / merge `9463523`.

**Interview read:** This shows the product moved from content ingestion toward a clearer information architecture.

## D04 — Seven-slot public slate

**Decision:** The current briefing surface should resolve to Top 5 Core Signals plus Next 2 Context Signals.

**Context:** The public surface needed enough room for a full editorial judgment while still staying finite and scannable.

**Rejected alternative:** Unlimited cards, raw ranked lists, or treating every candidate as public-ready.

**Trade-off accepted:** This evolved from earlier, smaller slate concepts, including a five-total cap, so the decision should be read as the current public-slate model rather than the original state.

**Evidence:** PRs #150-153; PR #199; `docs/product/prd/prd-53-signals-admin-editorial-layer.md`; README current framing.

**Interview read:** This shows an explicit product shape: small enough to be disciplined, large enough to carry primary and secondary context.

## D05 — Explain why it matters

**Decision:** Each public Signal needs explicit causal "why it matters" reasoning, not only a summary.

**Context:** A summary says what happened; the product promise depends on explaining why the development changes decisions, risk, or understanding.

**Rejected alternative:** Publishing headline-and-summary cards without causal reasoning.

**Trade-off accepted:** Explanation quality becomes a gate, which slows publication when copy is vague, generic, or unsupported.

**Evidence:** PRs #15, #16, #59, #115, #132; `docs/product/prd/prd-12-why-this-matters.md`; `docs/product/prd/prd-35-why-it-matters-quality.md`.

**Interview read:** This shows the product valued reader comprehension over content throughput.

## D06 — Separate generation from publication

**Decision:** AI-assisted generation should create candidates, while publication remains gated by review and explicit publish flow.

**Context:** Generated drafts are useful for speed, but public trust depends on separating candidate creation from editorial release.

**Rejected alternative:** Letting pipeline output automatically become live product copy.

**Trade-off accepted:** The workflow requires more operational discipline, including draft states, review surfaces, and explicit publish controls.

**Evidence:** PR #126; `docs/product/prd/prd-53-signals-admin-editorial-layer.md`; `docs/product/feature-system.csv`.

**Interview read:** This shows judgment about where AI accelerates work and where human control remains necessary.

## D07 — Fail closed on weak candidates

**Decision:** Weak candidates should be held back, review-only, or partial-slate rather than manufactured into Core slots to fill the briefing.

**Context:** A briefing loses credibility if slot-filling outranks evidence quality.

**Rejected alternative:** Promoting marginal candidates just because the product expects a fixed number of cards.

**Trade-off accepted:** The product may publish fewer items or delay publication when the candidate pool is weak.

**Evidence:** PR #199; `docs/product/prd/prd-53-signals-admin-editorial-layer.md`.

**Interview read:** This shows quality was allowed to constrain completeness.

## D08 — Source accessibility matters

**Decision:** Source authority is not enough; the product needs accessible supporting evidence.

**Context:** Strong brand names can still provide thin, paywalled, abstract-only, or inaccessible evidence for the specific Signal.

**Rejected alternative:** Treating source reputation alone as sufficient authority for Core placement.

**Trade-off accepted:** Some high-status sources are limited unless the accessible evidence supports the claim being made.

**Evidence:** PRs #129, #130, #136, #137; README quality-gate framing; `docs/product/prd/prd-42-source-governance-and-defaults.md`; `docs/product/prd/prd-54-public-source-manifest.md`.

**Interview read:** This shows attention to evidence quality, not just source curation.

## D09 — No false freshness

**Decision:** If the product cannot honestly support freshness, it should show dated, empty, or held-back states instead of pretending.

**Context:** A daily briefing depends on reader trust; stale content presented as current is worse than an honest limitation.

**Rejected alternative:** Static placeholder cards, undated fallback copy, or public surfaces implying a new briefing when none exists.

**Trade-off accepted:** The product may expose its operational limits instead of masking them.

**Evidence:** PRs #198, #201, #202; README current-state framing; `docs/product/prd/prd-53-signals-admin-editorial-layer.md`; `docs/product/prd/prd-57-homepage-volume-layers.md`.

**Interview read:** This shows trust and truthfulness were product requirements, not polish details.

## D10 — Govern the public source manifest

**Decision:** Public source exposure should be controlled through a reviewable manifest and source-governance path.

**Context:** Source lists affect product authority, fetch load, editorial scope, and public expectations.

**Rejected alternative:** Letting runtime defaults, ad hoc source additions, or hidden code paths define the public source set.

**Trade-off accepted:** Source expansion becomes slower because additions need review, manifest alignment, and governance checks.

**Evidence:** PRs #101, #102; `docs/product/prd/prd-54-public-source-manifest.md`; `docs/product/feature-system.csv`.

**Interview read:** This shows source strategy was treated as a product system, not an incidental configuration list.

## D11 — Stop on drift

**Decision:** When branch, schema, migration, or runtime drift appears, stop, inspect, and then repair explicitly.

**Context:** Fast AI-assisted work can make local state, database state, branch ownership, and deployment assumptions diverge.

**Rejected alternative:** Continuing implementation through uncertainty or forcing repairs without first identifying ownership and blast radius.

**Trade-off accepted:** Some phases stop before visible progress so the repo and runtime state remain understandable.

**Evidence:** PRs #158, #167, #168; `AGENTS.md`; `docs/engineering/protocols/engineering-protocol.md`; `docs/product/prd/prd-29-branch-freshness-guard.md`; `scripts/release-governance-gate.py`.

**Interview read:** This shows operational maturity: uncertainty became a reason to narrow scope, not improvise.

## D12 — Govern AI-agent work

**Decision:** AI-agent-assisted work requires branch ownership, object-level change classification, PRD routing, and release gates.

**Context:** The build moved quickly across ingestion, ranking, editorial workflow, and public presentation, so process had to reduce accidental scope drift.

**Rejected alternative:** Treating AI-generated implementation as self-validating or letting every change create its own documentation shape.

**Trade-off accepted:** The repo carries explicit governance overhead, but that overhead makes the work inspectable and safer to continue.

**Evidence:** PRs #22, #31, #51, #191, #194; `AGENTS.md`; `.github/pull_request_template.md`; `docs/product/documentation-rules.md`; `docs/engineering/templates/llm-prompt-template-change-classification.md`; `scripts/release-governance-gate.py`.

**Interview read:** This shows the project used AI as leverage while still preserving human-owned judgment, traceability, and release discipline.
