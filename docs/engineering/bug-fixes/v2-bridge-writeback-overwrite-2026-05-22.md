# v2 Bridge + Writeback Overwrite Semantics - Bug-Fix Record

## Summary
- Problem addressed: `/api/editorial/push-approved` couldn't actually carry approved v2 cards to `signal_posts` end-to-end. The endpoint hardcoded `selection_reason`, never set `final_slate_rank`, never stamped `witm_draft_generated_by`/`witm_draft_model` (so v2 LLM rows were indistinguishable from Task 3's `deterministic_template` rows in queries), didn't normalize Notion's `\[ \] \$` markdown escapes, and used the same `ignoreDuplicates: true` upsert option as the legacy ingestion path — which silently dropped every v2 push that landed at the same `(briefing_date, source_url)` the daily cron had already stamped. The net effect: 100% of production rows were the legacy heuristic template (PRD-12 path), and the good v2 LLM drafts the editor approved in Notion never reached Supabase.
- Root cause: The bridge was designed before the daily cron started routinely writing `deterministic_template` rows for the same article URLs the editor approves through Notion. With both writers targeting the same `(briefing_date, source_url)` conflict slot and `ignoreDuplicates: true` semantics, the legacy writer's "first-writer-wins" behavior (PR #260) was the bug. The mapping gaps (Hook → selection_reason, final_slate_rank, provenance stamps, markdown normalization) were independent shortfalls that surfaced once the path was actually exercised.
- Affected object level: Card.
- **Related PRD:** PRD-64 (`docs/product/prd/prd-64-editorial-automation-pipeline.md`)

## Fix
- Exact change: Rewrote `pushApprovedRow` in `src/app/api/editorial/push-approved/route.ts` to use a **select-then-decide** flow instead of a single upsert. The route now reads `id, rank, final_slate_rank, final_slate_tier, witm_draft_generated_by, is_live` for the existing `(briefing_date, source_url)` row and branches on that state:
  - `is_live=true` → `skipped_live`, no Notion writeback (so operator notices)
  - `witm_draft_generated_by='llm'` → `skipped_existing_v2`, Notion writeback still fires to flip `Pushed to Supabase=true`
  - existing row is `deterministic_template` or NULL provenance → `overwrote_template`: UPDATE in place preserving the existing display rank and final_slate_rank, replacing all three editorial layers + provenance with the v2 LLM payload
  - no existing row → `inserted`: allocate next unused display rank (1-20) and final_slate_rank within the tier (Core: 1-5, Context: 6-7); fail closed with `no_rank_slot` if the tier is full

  Plus the rest of the mapping shortfalls: `selection_reason ← Hook (Human|AI Draft)` with a non-NULL fallback string, `witm_draft_generated_by='llm'`, `witm_draft_model ← env EDITORIAL_DRAFTER_MODEL_ID || 'claude-opus-4-7'`, `final_slate_tier + final_slate_rank` set as a paired write per the CHECK constraint, and `normalizeNotionMarkdown` stripping `\[ \] \$` escapes from every editorial text field before write.
- Related PRD: PRD-64 — Editorial Automation Pipeline. The PRD's operational-history section was extended with the 2026-05-22 trace, the new status taxonomy, and the full mapping shape.
- PR: #263, `fix(editorial): v2 bridge writeback with select-then-decide upsert (Path A Task 4)`
- Branch: `claude/task4-v2-bridge-writeback`
- Head SHA: (pending — annotated on merge)
- GitHub source-of-truth status: Canonical bug-fix record; mapping, status taxonomy, and OVERWRITE TEST shape are mirrored in the PR description and the PRD-64 operational-history entry.
- External references reviewed, if any: Live Supabase inspection at the start of Path A confirmed `~120` legacy rows over the past two weeks all wrote NULL provenance + boilerplate WITM (the Task 3 trace) and that the 2099-01-01 reference rows are the correct v2 push shape. The validated mapping in the Notion "Execution Handoff — Claude Code" page (`https://www.notion.so/367dbc5ec39d817fb19be981abc81486`) was followed verbatim.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: branch will be deleted on merge via `gh pr merge --delete-branch`.

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`.
- [x] Confirmed object level before coding: Card. `signal_posts` is the Card storage layer per the operational contract; the bridge promotes Notion-resident Card editorials into the Supabase Card row.
- [x] No new variable, file, function, component, or database terminology was introduced. The `PushRowStatus` enum expansion uses descriptive snake_case strings (`overwrote_template`, `skipped_existing_v2`, `skipped_live`, `skipped_missing_source_url`, `skipped_missing_slot`, `no_rank_slot`) that read literally without overloading Cluster/Signal/Card meanings.
- [x] Legacy column naming asymmetry (`witm_*` for the Signal layer only; `ai_what_led_to_it` / `ai_what_it_connects_to` with no `_payload` jsonb) is preserved unchanged; Task 5 will rebalance the schema.

## Validation
- Automated checks: `npx vitest run` — 790/790 green (+11 new `route.test.ts` cases including the required OVERWRITE TEST that seeds a `deterministic_template` row at `(D, U)`, pushes the same `(D, U)` as an approved v2 card, and asserts `witm_draft_generated_by='llm'` + the v2 three-layer content replaced the template text). `npx eslint` on touched files — clean. `npx tsc --noEmit` on touched files — zero new errors vs main.
- Human checks: PR description hand-verified against the validated push mapping in the Notion Execution Handoff page; OVERWRITE TEST assertions mirror the bullet list under the brief's "OVERWRITE TEST (must be explicit + automated)" requirement.

## Remaining Risks / Follow-up
- **Task 5 (publish/citation migration) will be the next consumer.** This PR populates `ai_what_led_to_it` and `ai_what_it_connects_to` for the first time on the v2 path; today they have no `_payload`/`_validation_*`/`published_*` mirror columns (only `why_it_matters` has the full lifecycle). Task 5 lands the schema rebalance.
- **Task 6 (validation-default fix) needed to set the WITM status correctly.** This PR still writes `'passed'` when WITM is present because the validator's enum currently has no `'not_run'` value (CHECK enforces `{passed, requires_human_rewrite}`). Once Task 6 adds `'not_run'`, the bridge payload should set `'not_run'` here instead of leaning on the legacy default.
- **Display rank ordering on overwrite preserves the legacy row's rank.** If a future task wants the editor to control display rank from Notion (e.g. a `Rank` property), the overwrite branch is where that override would land.
- **Existing legacy rows are not retroactively bridged.** This PR only handles new approved v2 pushes. The ~120 historical NULL-provenance rows remain; no backfill is in scope. If BM wants the bridge to rewrite them, that's a one-shot migration task.
