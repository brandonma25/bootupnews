# Legacy Template Generator Provenance Stamp - Bug-Fix Record

## Summary
- Problem addressed: The heuristic Why-It-Matters template generator (PRD-12) was producing ~100% of production `signal_posts` rows but writing NULL `witm_draft_generated_by`, `witm_draft_generated_at`, `witm_draft_model`, and `editorial_content_source` — making heuristic-template rows indistinguishable from any future v2 LLM bridge rows.
- Root cause: `persistSignalPostCandidates` in `src/lib/signals-editorial.ts` was constructed before the `witm_draft_*` provenance columns existed and never updated to populate them; the legacy ingestion path therefore left the entire provenance dimension NULL even though the CHECK constraint already permits the `deterministic_template` value.
- Affected object level: Card.
- **Related PRD:** PRD-12 (`docs/product/prd/prd-12-why-this-matters.md`)

## Fix
- Exact change: Stamp every `persistSignalPostCandidates` upsert payload with `witm_draft_generated_by='deterministic_template'`, `witm_draft_generated_at=now`, `witm_draft_model='heuristic_template_v1'`, and `editorial_content_source='ai'`. Code comment block in the writer explains the per-column rationale and flags the Task 4 invariant that the v2 bridge will need to invert the existing `ignoreDuplicates: true` upsert to overwrite stale `deterministic_template` rows when BM approves real LLM drafts for the same article URL. `why_it_matters_validation_status` remains at the auto-default `'passed'` because Task 6's enum change (adding `'not_run'`) has not landed yet — a TODO in the code points to Task 6.
- Related PRD: PRD-12 — Why This Matters. The PRD's operational-history section was extended with the 2026-05-22 trace, disposition, and per-column rationale.
- PR: #262, `fix(signals): stamp legacy template generator with deterministic_template provenance (Path A Task 3)`
- Branch: `claude/task3-legacy-writer-relabel`
- Head SHA: `33f9151` (pending merge SHA)
- GitHub source-of-truth status: Canonical bug-fix record; trace, disposition reasoning, and verification SQL are mirrored in the PR description and the PRD-12 operational-history entry.
- External references reviewed, if any: Live Supabase inspection of `signal_posts` rows on 2026-05-13 through 2026-05-21 confirmed 100% null-provenance on the legacy path; the 2099-01-01 reference rows (from the v2 bridge path test) showed the correct stamped shape this fix produces going forward.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: branch will be deleted on merge via `gh pr merge --delete-branch`.

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`.
- [x] Confirmed object level before coding: Card (the heuristic generator writes to `signal_posts` rows, which are the Card storage layer per the operational contract).
- [x] No new variable, file, function, component, or database terminology was introduced — the fix uses pre-existing column names and pre-existing CHECK-permitted enum values (`deterministic_template`, `ai`).
- [x] Legacy column naming asymmetry (`witm_*` for the Signal layer only, no symmetric `wlti_*`/`witc_*` columns) is preserved unchanged; the broader v2 schema rebalancing is Task 5's territory, not this fix.

## Validation
- Automated checks: `npx vitest run` — 779/779 green (+1 new `stamps every legacy-path row with deterministic_template provenance` assertion); `npx eslint` on touched files — clean (one warning predates this PR); `npx tsc --noEmit` on touched files — zero new errors vs main.
- Human checks: PR description hand-verified against the live Supabase trace + the 2099-01-01 reference rows.

## Remaining Risks / Follow-up
- **Task 4 (v2 bridge / `push-approved`) MUST invert the upsert semantics.** Today the legacy writer uses `upsert(…, { ignoreDuplicates: true })` from PR #260, which means the legacy writer never overwrites any existing row — but ALSO means the v2 bridge using the same options would be SILENTLY DROPPED on collisions. When the cron fires at 12:00 UTC it stamps `deterministic_template` for every article it sees; if BM later approves a real LLM draft for the same `(briefing_date, source_url)`, the bridge must explicitly overwrite the legacy row. This is called out in the writer's code comment and in PRD-12's operational-history entry, and is the named load-bearing invariant for Task 4's PR.
- **Task 6 (validation-default fix) closes the `why_it_matters_validation_status` gap.** The legacy path still writes `'passed'` by default — accurate today only because the validator's enum currently has no `'not_run'` value. The Task 6 PR will add it; once landed, the legacy writer's payload should set `'not_run'` here instead of relying on the CHECK default.
- **Existing pre-stamp rows are not backfilled.** This PR only stamps NEW writes. The ~120+ existing rows with NULL provenance remain as-is; any analysis script that uses `witm_draft_generated_by IS NULL` as a "legacy bucket" predicate will need to treat NULL as historically equivalent to `deterministic_template` until a backfill migration runs. No backfill is in scope here.
