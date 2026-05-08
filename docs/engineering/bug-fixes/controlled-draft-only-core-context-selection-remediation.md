# Controlled Draft-Only Core/Context Selection Remediation - Bug-Fix Record

## Summary
- Problem addressed: The controlled `draft_only` seven-row product-target path could persist seven Core/Context-eligible rows that did not match the dry-run report's five Core plus two Context slate shape.
- Root cause: The live-RSS draft selector applied the `core,context` allowlist and `PIPELINE_DRAFT_MAX_ROWS=7` as a flat ranked slice, so extra Core-eligible rows could displace Context rows before persistence.
- Affected object level: Signal / Surface Placement.

## Fix
- Exact change: For the approved seven-row controlled draft-only path, select up to five `core_signal_eligible` rows and up to two `context_signal_eligible` rows from the same ranked candidate pool, preserving fail-closed exclusion of Depth rows.
- Related PRD: No new PRD required; this is controlled operations remediation for the existing Phase 1 editorial cycle validation path.
- PR: TBD.
- Branch: `fix/controlled-draft-only-core-context-selection-20260508`.
- Head SHA: TBD.
- Merge SHA: TBD.
- GitHub source-of-truth status: pending PR.
- External references reviewed, if any: BOOT_UP_WORK_LOG_v2 decisions supplied by PM; Product Position fail-closed and signal-card principles supplied by PM; PR #141 controlled draft cap remediation; PR #205 category public-surface remediation; live `draft_only` artifact and database readback from the 2026-05-08 second editorial cycle.
- Google Sheet / Work Log reference, if historically relevant: draft work-log entry prepared in the operational handoff.
- Branch cleanup status: pending post-merge cleanup.

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`.
- [x] Confirmed object level before coding: Signal / Surface Placement.
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] Legacy `signal_posts` naming remains treated as Surface Placement plus editorial read-model storage.

## Validation
- Automated checks:
  - `npx vitest run src/lib/pipeline/controlled-runner.test.ts src/lib/pipeline/controlled-execution.test.ts` - PASS, 2 files / 37 tests.
  - `npm run lint` - PASS.
  - `npm run test` - PASS, 80 files / 604 tests.
  - `npm run build` - PASS with existing workspace-root and module-type warnings.
  - `python3 scripts/validate-feature-system-csv.py` - PASS with existing PRD slug warnings.
  - `npm run governance:coverage` - PASS.
  - `npm run governance:hotspots` - PASS.
  - `python3 scripts/release-governance-gate.py --diff-mode local --branch-name fix/controlled-draft-only-core-context-selection-20260508 --pr-title "remediation: keep draft-only Core/Context selection aligned"` - PASS.
  - `npm run governance:audit` - PASS.
  - `git diff --check` - PASS.
- Human checks: Chrome production QA confirmed the non-live drafts did not change the public homepage.

## Remaining Risks / Follow-up
- Current 2026-05-08 draft rows were already created by the pre-fix selector and should not be published as the target Core+Context slate without BM direction.
- A corrected draft-only cycle requires BM instruction on whether to discard or supersede the current non-live draft rows before re-running.
