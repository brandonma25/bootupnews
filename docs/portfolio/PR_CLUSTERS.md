# PR Clusters

Bootup News's raw PR history includes feature delivery, remediation, diagnostics, release-safety work, and documentation cleanup. This map groups the implementation history by product and engineering story so reviewers can inspect the build without relying on PR titles alone.

The clusters are not a replacement for the raw GitHub record. They are a reviewer-facing interpretation layer: what changed, which decision the work demonstrates, what trade-off was accepted, and what I would do differently after seeing the system evolve.

## Why closed PR titles were not rewritten

Closed PR titles are part of the historical record. Rewriting them would make the repo look artificially linear and would hide the fact that the project moved through feature work, repair work, and governance hardening in parallel. The cleaner approach is to preserve the raw history and add this reviewer-facing interpretation layer. Interviewers can inspect both the original PRs and this narrative map.

## Cluster 1 — Product Thesis And Public Briefing Surface

**PRs:** #89, #94, #180, #181, #201, #202, #204, #205, #211, #227

**What changed:** The public surface moved toward a clearer Bootup News briefing experience: tighter homepage and briefing copy, less internal editorial language, stronger card presentation, category behavior fixes, and production URL alignment.

**Decision demonstrated:** The product should read as an opinionated briefing, not a generic content surface or implementation demo.

**Trade-off:** Public polish work sometimes displaced deeper backend work because the first reader-facing impression was part of the product thesis.

**What I would do differently:** I would separate product-language decisions from UI remediation earlier so public-surface cleanup did not have to carry as much positioning work late in the build.

## Cluster 2 — Importance Ranking And Signal Model

**PRs:** #54, #58, #60, #104, #105, #112, #117, #120, #210

**What changed:** The system grew from ingestion and summarization toward Article evidence, Story Cluster structure, ranked Signals, capped display surfaces, and clearer terminology around what the product was actually presenting.

**Decision demonstrated:** Ranking should privilege structural importance and interpreted Signals over raw article volume, source count, or reverse chronology.

**Trade-off:** The model became more complex than a feed of links because the product needed explicit transformation layers between source input and public briefing output.

**What I would do differently:** I would lock the Article, Story Cluster, Signal, Card, and Surface Placement vocabulary earlier to reduce later terminology repair.

## Cluster 3 — Why-It-Matters Quality Layer

**PRs:** #3, #15, #16, #59, #115, #119, #124, #132, #139, #143, #207

**What changed:** The product added and then hardened explicit "why it matters" reasoning, including specificity fixes, display integration, quality gates, deterministic template repair, WITM persistence, and draft-only validation context.

**Decision demonstrated:** A useful briefing needs causal explanation, not only a summary of what happened.

**Trade-off:** Explanation quality became a publication constraint, which slowed throughput when generated reasoning was vague or unsupported.

**What I would do differently:** I would define quality rubrics and failure examples before wiring the gates so the review loop had fewer ambiguous edge cases.

## Cluster 4 — Controlled Generation And Publication Safety

**PRs:** #100, #126, #133, #134, #135, #145, #146, #147, #150, #151, #174, #206

**What changed:** The build introduced controlled pipeline modes, draft selectors, artifact replay, admin review surfaces, editorial controls, final-slate composition, and safeguards around draft-only Core/Context selection.

**Decision demonstrated:** AI-assisted generation can create candidates, but publication needs explicit review and publish flow.

**Trade-off:** The workflow required more operational overhead than automatic publishing, but it protected reader trust and gave the solo builder a quality backbone.

**What I would do differently:** I would create the admin-review vocabulary and state model before building multiple controlled-cycle repair paths.

## Cluster 5 — Core/Context Slate And Fail-Closed Selection

**PRs:** #141, #142, #148, #150, #152, #153, #172, #173, #174, #199, #206

**What changed:** The public slate evolved from smaller caps into a Top 5 Core plus Next 2 Context model, with validation for controlled draft caps, Context visibility, seven-row publish hardening, audit history, and partial-slate behavior.

**Decision demonstrated:** A fixed briefing shape should not force weak candidates into Core slots just to fill space.

**Trade-off:** The product may show fewer items or held-back states when the candidate pool is not strong enough.

**What I would do differently:** I would make partial-slate behavior a first-class product state earlier instead of letting it emerge from remediation work.

## Cluster 6 — Source Governance And Accessibility

**PRs:** #64, #66, #67, #68, #69, #71, #101, #102, #106, #107, #128, #129, #130, #136, #137, #208

**What changed:** Source onboarding, runtime observability, MIT review automation, public source manifest work, politics and newsletter-source lanes, accessibility predicates, governed source batches, and source URL guards improved the evidence base behind Signals.

**Decision demonstrated:** Source authority is not enough; the product needs accessible supporting evidence and reviewable source exposure.

**Trade-off:** Source expansion became slower because availability, public evidence quality, and manifest governance all mattered.

**What I would do differently:** I would distinguish source inventory, runtime activation, and public authority in the documentation from the start.

## Cluster 7 — Freshness, Production Trust, And No False Freshness

**PRs:** #97, #108, #109, #114, #162, #198, #200, #201, #202, #204, #205, #222, #223

**What changed:** The project repaired signed-out homepage QA, ingestion SSR failures, static-story regressions, published-signal counts, public schema fallbacks, cron preflight behavior, public debug residue, public vocabulary, card copy, and RSS/newsletter snapshot separation.

**Decision demonstrated:** It is better to show dated, empty, fallback, or held-back states than to imply freshness the system cannot support.

**Trade-off:** The product sometimes exposed operational limits instead of smoothing them over with optimistic copy.

**What I would do differently:** I would add explicit empty and stale-state design requirements earlier so production trust did not depend on repeated surface fixes.

## Cluster 8 — Drift, Migration, And Repair Discipline

**PRs:** #74, #84, #95, #155, #156, #157, #158, #159, #160, #161, #163, #164, #165, #166, #167, #168, #213, #214

**What changed:** Worktree ownership rules, branch attachment hardening, schema alignment runs, migration-history diagnosis, database-owner review, catalog inspection, authorized repair, schema apply, and current schema progress reporting made drift visible before continuing.

**Decision demonstrated:** When branch, schema, migration, or runtime state drifts, the right move is to stop, inspect, and repair explicitly.

**Trade-off:** Some work slowed down because state integrity took precedence over visible feature progress.

**What I would do differently:** I would make drift checkpoints routine before every schema-affecting PR rather than relying on repair phases after drift appeared.

## Cluster 9 — AI-Agent Governance And Release Gates

**PRs:** #11, #13, #17, #18, #22, #23, #25, #26, #28, #30, #31, #34, #45, #49, #50, #51, #65, #191, #194, #196

**What changed:** The repo added engineering protocols, CI, Playwright foundations, release-machine rules, documentation governance, branch cleanup policy, PRD ID enforcement, release governance gates, hotspot protection, source-of-truth cleanup, and retired external tracker dependence.

**Decision demonstrated:** AI-agent-assisted work needs explicit change classification, branch ownership, PRD routing, validation order, and release gates.

**Trade-off:** The repo carries more process surface than a quick prototype, but that process keeps a fast solo build inspectable.

**What I would do differently:** I would add the change-classification template earlier so remediation, refactor, bug-fix, and feature work were easier to route from the beginning.

## Cluster 10 — Repo Cleanup And Portfolio Readiness

**PRs:** #230 (`cleanup/interviewer-readiness`)

**What changed:** The cleanup branch rewrote the README, added DECISIONS.md, created a reusable LLM change-classification template, added an archive manifest, routed future governance away from public operational records, quarantined operational documentation folders, scrubbed sensitive public-doc details, and added this implementation-history map.

**Decision demonstrated:** Portfolio-facing documentation should make the product, architecture, and judgment legible without rewriting raw history or exposing operational residue.

**Trade-off:** Some historical implementation detail was removed from the public browse path and preserved outside the durable public surface.

**What I would do differently:** I would maintain a portfolio-facing narrative layer continuously instead of reconstructing it after a dense implementation period.

## How To Read This With DECISIONS.md

DECISIONS.md summarizes the durable product and engineering trade-offs behind Bootup News. PR_CLUSTERS.md maps those decisions back to implementation history. The raw PRs remain the evidence layer, while these two documents help reviewers understand why the work took the shape it did.
