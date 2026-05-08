# Change Record: Pipeline Article Candidates Persistence

- Date: `2026-04-26`
- Branch: `codex/pipeline-article-candidates`
- Effective change type: `feature`
- Source of truth: `Signal Formation Engine Audit (Codex, April 2026)` gap that signal yield has no denominator because non-surface articles are not persisted after pipeline runs.
- Secondary context: `Boot Up Product Position` Phase 2 ranking calibration and delta detection need full candidate pool history.
- Canonical PRD required: `no`
- Documentation artifact: this remediation-backed engineering change record.

## Scope

This change adds backend persistence for every `NormalizedArticle` candidate entering the cluster-first pipeline. The first write happens after normalization and before deduplication. Follow-up writes annotate cluster assignment, ranking score, surface status, final stage reached, and known drop reason.

## Table

`public.pipeline_article_candidates` stores one row per normalized candidate per run:

- `run_id` for the specific pipeline execution
- `ingested_at` for candidate entry time
- source, canonical URL, title, summary, keywords, and entities from the normalized article
- optional `cluster_id` after clustering
- optional `ranking_score` after ranking
- `surfaced` and `pipeline_stage_reached` for yield measurement
- optional `drop_reason` for known non-surface outcomes

Indexes support run lookup, surfaced filtering by run, and `ingested_at` range queries.

## RLS

Row-level security is enabled. The only table policies target `service_role` for select, insert, update, and delete. There is no public read policy and no authenticated-user policy.

## Non-Goals

- Does not modify existing pipeline tables.
- Does not change homepage rendering or user-facing signal display.
- Does not introduce canonical signal identity.
- Does not introduce cluster-to-signal transformation.
- Does not alter ranking, clustering, deduplication, or digest selection logic.
- Does not require a new canonical PRD.
