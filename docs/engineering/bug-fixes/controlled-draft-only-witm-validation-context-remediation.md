# Controlled Draft-Only WITM Validation Context Remediation - Bug-Fix Record

## Summary
- Problem addressed: The controlled `draft_only` report could mark a generated Core/Context WITM as `requires_human_rewrite` while persisted `signal_posts` rows stored the same WITM as `passed`.
- Root cause: The controlled report validated WITM copy with title, eligibility, accessibility, and event-type context, but `signal_posts` persistence recomputed validation without that context when no precomputed validation payload was supplied.
- Affected object level: Signal / Surface Placement.

## Fix
- Exact change: Recompute fallback persisted WITM validation with the same Core/Context context fields used by the controlled pipeline report, while still preserving supplied validation metadata when present.
- Related PRD: No new PRD required; this is controlled operations remediation for the existing Phase 1 editorial cycle validation path.
- PR: https://github.com/brandonma25/bootupnews/pull/207.
- Branch: `fix/draft-only-witm-validation-context-20260508`.
- Head SHA at PR creation: `671931c513ff8001b329af9f126925d9e7fc685d`.
- Merge SHA: TBD.
- GitHub source-of-truth status: pending PR.
- External references reviewed, if any: BOOT_UP_WORK_LOG_v2 decisions supplied by PM; Product Position fail-closed principles supplied by PM; live `draft_only` artifact and database readback from the 2026-05-08 second editorial cycle; PR #206 selection remediation.
- Google Sheet / Work Log reference, if historically relevant: draft work-log entry prepared in the operational handoff.
- Branch cleanup status: pending post-merge cleanup.

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`.
- [x] Confirmed object level before coding: Signal / Surface Placement.
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] Legacy `signal_posts` naming remains treated as Surface Placement plus editorial read-model storage.

## Validation
- Automated checks:
  - `npx vitest run src/lib/signals-editorial.test.ts src/lib/pipeline/controlled-runner.test.ts src/lib/pipeline/controlled-execution.test.ts` - PASS, 3 files / 104 tests.
  - `npm run lint` - PASS.
  - `npm run test` - PASS, 80 files / 605 tests.
  - `npm run build` - PASS with existing workspace-root and module-type warnings.
  - `python3 scripts/validate-feature-system-csv.py` - PASS with existing PRD slug warnings.
  - `npm run governance:coverage` - PASS.
  - `npm run governance:hotspots` - PASS.
  - `python3 scripts/release-governance-gate.py --diff-mode local --branch-name fix/draft-only-witm-validation-context-20260508 --pr-title "remediation: align draft-only WITM validation context"` - PASS.
  - `npm run governance:audit` - PASS.
  - `git diff --check` - PASS.
- Human checks: Chrome production QA confirmed the non-live drafts did not change the public homepage.

## Remaining Risks / Follow-up
- Current 2026-05-08 draft rows were created before this fix and include persisted validation statuses that should not be used for publish approval without BM-directed remediation or rerun.
- Corrected draft-only output requires a new run after this fix is deployed and after BM decides how to handle the existing non-live draft rows.
