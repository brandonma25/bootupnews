# PRD-70 — Decoupled Article-Body Extraction and Same-Cycle Restage

- PRD ID: `PRD-70`
- Canonical file: `docs/product/prd/prd-70-decoupled-article-body-extraction.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Stop the `source_accessibility` gate from starving the Notion editorial queue of genuine breaking news, by enriching abstract-only candidates with real article body text and re-gating them **in the same daily cycle** — without lowering any quality threshold, without touching the main ingestion cron, and within the known 60-second-per-function budget.

## User Problem

Genuine, high-importance breaking news (e.g. the Iran/Israel strikes, the Ukraine aid vote, a jobs report) arrives from most editorial feeds (FT, CNBC, Politico, NPR, PBS, France24) as **short RSS abstracts** (~85–190 characters). The core-eligibility gate's `coreSupported` predicate requires real body text — ≥1,200 chars full / ≥500 partial / ≥800 abstract — and `getExclusionCause` returns `source_accessibility` **first, before importance is even consulted** ([src/lib/signal-selection-eligibility.ts:204](../../../src/lib/signal-selection-eligibility.ts)). So a story the importance model (fixed in PRD-38) scores 52–80 is still capped at `depth_only`/`exclude` purely for lack of accessible text, and never reaches `signal_posts` — the surface the editor reviews. A measured first-gate attribution found `source_accessibility` kills 10 of 11 genuine news clusters on a representative day.

The pipeline already has the article URL; it simply never fetches the body. The editor needs those stories to become reviewable **today**, not a day later.

## Scope

- **CRON-1 `/api/cron/extract-article-bodies`** (fetch + cache only): select the top-N (`resolveSurfacePoolSize`, default 22) importance-ranked, abstract-only, **non-paywalled** candidates the main run left blocked; fetch each article body under a hard wall-clock cap (`EXTRACTION_BUDGET_MS=12000`, enforced via `Promise.race`), per-fetch timeout (`PER_FETCH_TIMEOUT_MS=2500`), concurrency cap (`EXTRACTION_CONCURRENCY=10`); persist `extracted_body_text` / `extracted_text_length` / `extraction_status` / `extraction_attempted_at`. Schedule 12:20 UTC.
- **CRON-2 `/api/cron/restage-with-bodies`** (same-cycle re-gate): a few minutes later (12:25 UTC, same `briefing_date`, feed still fresh), re-run the **real** pipeline via `generateDailyBriefing({ useExtractedBodies: true })` — ingestion merges the longer of native-vs-extracted body so the existing classifier re-gates today's blocked news with real bodies — then **append** the newly-eligible items into today's `signal_posts` and re-run editorial staging so the Notion queue sees them this cycle.
- **Contained URL-keyed append-persist** (`persistAppendedSignalPostsForBriefing` → `persistSignalPostCandidates` mode `"append"`): insert only `canonical_url`s not already present for today, at **post-max ranks** (existing max + 1, +2, …) capped at the `rank ≤ 20` CHECK; existing/human-edited rows are never overwritten or duplicated.
- Instrumentation: CRON-1 logs the `coreSupported` false→true transition count + fetch `total_ms`; CRON-2 logs the same-cycle stage-eligible (appended) count + `total_ms`.

## Approach

Decoupled bounded extraction (CRON-1) feeds a same-cycle re-run of the real pipeline (CRON-2) that re-gates with real bodies and appends the unblocked items. The eligibility gate sees genuine `RawItem`s through the production path — no reconstruction, no threshold change. Both legs are isolated endpoints with their own ≤60 s budgets; `fetch-editorial-inputs` is untouched (it never sets `useExtractedBodies`, so it never loads the body map).

## Options Considered

- **(A, 2-phase split) — CHOSEN.** Fetch in CRON-1, re-gate + append + stage in CRON-2. Reuses the real gate semantics; provably fits the known 60 s cap per leg; failure modes (budget, regeneration cost) are observable and degrade to "no improvement."
- **(A, single high-`maxDuration` route) — REJECTED.** ~67 s (12 s fetch + ~55 s real re-run) cannot fit one 60 s function and depends on an unconfirmed ≥120 s plan cap that cannot be verified or preview-tested — a production-timeout risk.
- **(B, reconstruct `RawItem`s from persisted scalars) — REJECTED.** `pipeline_article_candidates` is a lossy scalar projection of the gate's input; any field reconstructed wrong yields **silently-wrong eligibility** — exactly the malignant failure class our diagnosis discipline targets.
- **(Lazy next-run re-eval) — REJECTED.** A ~24 h consumption lag defeats the breaking-news target (fast-moving URLs roll off the feed before the next run).
- **(Split `generateDailyBriefing` into ingest/evaluate phases) — DEFERRED.** The correct long-term re-entrant refactor, but large and not single-concern; revisit later.

## What Is NOT Being Built

- No clustering / merge-gate changes.
- No threshold lowering (the only `source-accessibility.ts` change is an `export` keyword; `SUBSTANTIAL_ABSTRACT_THRESHOLD` stays 800).
- No paywalled full-text fetch (FT/Bloomberg/WSJ/MarketWatch/Foreign Affairs stay blocked — ungroundable).
- No importance-reordering of the slate (appended items take post-max ranks; public ordering stays under human control).

## Failure Modes Accepted

- Paywalled sources remain blocked.
- Each leg is bounded by its 60 s budget with graceful timeout (CRON-2 writes nothing until after the re-gate, so a mid-run timeout leaves today's slate untouched).
- Degrades to a **no-op pre-migration**: with the four columns absent, CRON-1's writes and CRON-2's body-map read both degrade to nothing, and the main cron behaves exactly as today.
- Appended items take post-max ranks (queue availability, not importance ordering).

## Success Metric

- CRON-1 `coreSupported` false→true transition count and CRON-2 same-cycle stage-eligible (appended) count, both emitted per run as structured logs.
- Downstream: a sustained increase in genuine items in the daily editorial queue and the published slate.

## Schema Dependency

The four migration columns on `pipeline_article_candidates` (`extracted_body_text`, `extraction_status`, `extracted_text_length`, `extraction_attempted_at`) are the only schema dependency; all reads/writes degrade to no-op until they are applied.
