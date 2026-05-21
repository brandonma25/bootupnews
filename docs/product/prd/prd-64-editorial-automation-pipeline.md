# PRD-64 — Editorial Automation Pipeline

- PRD ID: `PRD-64`
- Canonical file: `docs/product/prd/prd-64-editorial-automation-pipeline.md`
- Feature system row: update `docs/product/feature-system.csv` with matching `prd_id` and `prd_file`

## Objective
- Automate the daily triage of RSS and newsletter candidates into a Notion editorial queue so BM can approve, edit, and publish signals without manual copy-paste work.

## Problem
- Signal candidates from RSS and newsletter ingestion accumulate in the database with no lightweight editorial surface for review and one-click promotion to published signals.

## Scope
### Must Do
- Deduplicate RSS and newsletter candidates using Jaccard similarity before staging.
- Score and write deduplicated candidates to a Notion Editorial Queue database.
- Send a Resend completion email after each staging run summarising what was written.
- Expose a `GET /api/editorial/push-approved?token=` endpoint to promote approved Notion rows into `signal_posts`.
- Extend the `fetch-editorial-inputs` cron to run editorial staging as a third sequential task after newsletter and RSS.

### Must Not Do
- Replace the existing RSS or newsletter ingestion pipelines.
- Auto-publish signals without BM approval in Notion.
- Require a Notion connection for the RSS or newsletter ingestion tasks to succeed.

## System Behavior
- The cron runs newsletter → RSS → editorial staging in sequence.
- Editorial staging reads from `signal_posts` and `newsletter_story_extractions`, deduplicates, scores, and writes rows to the Notion Editorial Queue DB (`56caed793822497e8e58e8dc2291d395`).
- BM reviews rows in Notion, sets status to Approved, then hits the push endpoint to promote them.

## Key Logic
- `src/lib/editorial-staging/dedup.ts` — Jaccard dedup across newsletter and RSS candidates
- `src/lib/editorial-staging/notion-writer.ts` — writes staged rows to Notion via REST API
- `src/lib/editorial-staging/email.ts` — sends Resend completion email
- `src/lib/editorial-staging/runner.ts` — orchestrates Steps B–G
- `src/app/api/editorial/push-approved/route.ts` — approval promotion endpoint

## Schema Notes
- `signal_posts.source_url`: NOT NULL dropped (migration `20260516120000_source_url_drop_not_null.sql`). The column has a CHECK constraint requiring `https?://` format when non-null; Notion-originated editorial rows may have no source URL, so NULL is the correct representation. The CHECK still enforces format for any non-null value.

## Related operational history

- 2026-05-22 — v2 bridge + writeback hardening (Path-A Task 4, PR [#263](https://github.com/brandonma25/bootupnews/pull/263)). `push-approved` previously hardcoded `selection_reason`, left `final_slate_rank` unset, never stamped `witm_draft_generated_by`/`witm_draft_model`, didn't normalize Notion's `\[ \] \$` markdown escapes, and used the same `ignoreDuplicates: true` upsert option PR #260 chose for the legacy ingestion path — which meant the legacy daily cron's `deterministic_template` row at the same `(briefing_date, source_url)` would silently win and the v2 push would be silently dropped (the editorial bodies the editor approved would never reach `signal_posts`). This PR replaces the upsert with a select-then-decide flow:
  - **Read existing row at `(briefing_date, source_url)`.** Pull `id, rank, final_slate_rank, final_slate_tier, witm_draft_generated_by, is_live` for the decision.
  - **`skipped_live`** — existing row is `is_live=true`. Refuse to overwrite; do NOT writeback Notion's Pushed flag so the operator notices the inconsistency.
  - **`skipped_existing_v2`** — existing row is already `witm_draft_generated_by='llm'`. Leave content untouched but DO writeback Notion so the row's Pushed flag flips true and the bridge isn't re-attempted next call.
  - **`overwrote_template`** — existing row is `deterministic_template` (legacy cron's stamp) or NULL provenance. UPDATE in place: keep the existing `rank` and `final_slate_rank` (legacy's slot wins; the editor's `Slot` tier overrides `final_slate_tier` if it differs), replace all three editorial layers + provenance with the v2 LLM payload, writeback Notion. This closes the silent-drop trap PR #262's operational-history entry called out.
  - **`inserted`** — no existing row. Allocate an unused display `rank` (1-20) and an unused `final_slate_rank` within the tier (Core: 1-5, Context: 6-7); fail closed with `no_rank_slot` if the tier is full.
  - **Kill-flag enforcement** stays in the Notion query: only `Status=approved AND Pushed to Supabase=false` rows are candidates, so rejected/held/killed rows never reach the bridge.
- Mapping shape:
  - `title ← Headline`
  - `ai_why_it_matters ← The Signal (Human if present else AI Draft)`
  - `edited_why_it_matters ← The Signal (Human)`
  - `ai_what_led_to_it ← Before This (Human|AI Draft)`
  - `human_what_led_to_it ← Before This (Human)`
  - `ai_what_it_connects_to ← The Ripple (Human|AI Draft)`
  - `human_what_it_connects_to ← The Ripple (Human)`
  - `selection_reason ← Hook (Human|AI Draft)`, falls back to `"Editorial queue push — approved via Notion workflow (Hook empty)"` so the column stays non-NULL
  - `source_name / source_url ← Source / Source URL` (URL required; row skipped with `skipped_missing_source_url` otherwise)
  - `final_slate_tier + final_slate_rank ← Slot` set as a paired write (Core→1-5, Context→6-7, CHECK-bound)
  - `editorial_content_source ← lower(Editorial Source)` ∈ {ai, human, ai+human}
  - `witm_draft_generated_by = 'llm'` — the load-bearing distinguisher from Task 3's `deterministic_template` rows
  - `witm_draft_model ← env EDITORIAL_DRAFTER_MODEL_ID || 'claude-opus-4-7'`
  - `editorial_status = 'needs_review'` (NOT Notion's raw/grounded/held/rejected)
  - `is_live = false`
  - `\[ → [`, `\] → ]`, `\$ → $` normalized inbound on every editorial text field
- Test coverage in `src/app/api/editorial/push-approved/route.test.ts` includes the required OVERWRITE TEST (seed a `deterministic_template` row at `(D, U)`; push approved v2 card for same `(D, U)`; assert the row now has `witm_draft_generated_by='llm'` and the v2 three-layer content, not the template text), plus skip-live, skip-existing-v2, markdown-normalization, Hook fallback, tier-full, missing-Source-URL, kill-flag query shape, and model-id env override cases.
- 2026-05-22 — Bridge OVERWRITE final_slate_rank pairing fix + CHECK tightening (issue [#265](https://github.com/brandonma25/bootupnews/issues/265)). Production e2e on 2026-05-21 surfaced that the `overwrote_template` path updated `final_slate_tier` from the editor's Slot but omitted `final_slate_rank` from the UPDATE payload — leaving the legacy row's `final_slate_rank=NULL` paired with `final_slate_tier='core'`. The schema CHECK `signal_posts_final_slate_placement_check` was meant to catch this, but Postgres CHECK semantics pass any predicate evaluating to NULL (only FALSE rejects); with `rank=NULL`, every `BETWEEN 1 AND 5` short-circuited to NULL and the disjunction evaluated to NULL → accepted. **Fix in three parts:** (1) `pushApprovedRow` OVERWRITE path now calls a new `resolveFinalSlateRankForOverwrite()` helper that keeps the existing rank when it already falls in the editor's tier range, otherwise allocates fresh via `getNextAvailableFinalSlateRank()`, failing closed with `no_rank_slot` when the tier is exhausted. (2) Migration `20260522080000_final_slate_pairing_tighten_check.sql` drops the old CHECK and replaces it with `((tier IS NULL) AND (rank IS NULL)) OR ((tier IS NOT NULL) AND (rank IS NOT NULL))` AND the range/tier rules — half-pairs now evaluate to FALSE, not NULL. (3) The same migration includes a guarded one-shot repair that allocates a valid rank for every existing half-paired row (`WHERE is_live=false`); the 4 sacred is_live=true rows are sentinel-checked and abort the migration if touched. Pre-flight on prod confirmed exactly one broken row: `995958fe-78df-46ce-b1fc-fe449c6717a2` (the AI Investing Landscape bridge row from Task 4 e2e QA). New regression test asserts the bridge writes a paired tier+rank when the legacy row left rank NULL.
