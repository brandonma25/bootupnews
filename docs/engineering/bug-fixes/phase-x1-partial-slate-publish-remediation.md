# Phase X.1 Partial-Slate Publish Remediation — Bug-Fix Record

## Summary
- Problem addressed: the Final Slate publish path required exactly seven selected rows, blocking the first live-data MVP publish when the approved editorial slate contains only 1-3 rows.
- Root cause: the readiness validator and publish handler still encoded the earlier 5 Core + 2 Context composer target instead of the Phase 1 public 5-card cap and fail-closed scarcity rule.
- Affected object level: Signal, Card, and Surface Placement.

## Fix
- Exact change: publish readiness now accepts 1-5 selected Core/Context rows, rejects zero rows, rejects more than five rows with an explicit PRD-36 cap message, preserves the WITM publish gate, keeps individual-row publish disabled, and updates admin/public copy so partial slates are described honestly.
- Public surface behavior: homepage and `/signals` render only the live rows returned by the published read model; no placeholder or stale slots are added for unfilled positions.
- Related PRD: PRD-36 and Decisions D1/D2/D3/D5 in `BOOT_UP_WORK_LOG_v2.md`; no new canonical PRD required.
- PR: TBD.
- Branch: `codex/phase-x1-partial-slate-publish`.
- Head SHA: TBD.
- Merge SHA: TBD.
- GitHub source-of-truth status: pending PR.
- External references reviewed, if any: PRs #119/#124/#126/#127/#190 and Phase X handoff context from 2026-05-06.
- Google Sheet / Work Log reference, if historically relevant: Phase X handoff; no Sheet treated as canonical.
- Branch cleanup status: pending after merge.

## Terminology Requirement
- [x] Confirmed object level before coding: Signal, Card, and Surface Placement.
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] Legacy `signal_posts` naming is preserved as the existing runtime/editorial contract.

## Validation
- Automated checks:
  - `npm test -- src/lib/final-slate-readiness.test.ts src/lib/signals-editorial.test.ts src/lib/data.test.ts src/app/signals/page.test.tsx src/app/dashboard/signals/editorial-review/page.test.tsx`
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `git diff --check`
  - `python3 scripts/validate-feature-system-csv.py`
  - `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/phase-x1-partial-slate-publish --pr-title "Phase X.1: partial-slate publish (1-5 rows) — remediation/alignment to PRD-36 and Decision D1"`
  - `python3 scripts/check-governance-hotspots.py --diff-mode local --branch-name codex/phase-x1-partial-slate-publish --pr-title "Phase X.1: partial-slate publish (1-5 rows) — remediation/alignment to PRD-36 and Decision D1"`
  - `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/phase-x1-partial-slate-publish --pr-title "Phase X.1: partial-slate publish (1-5 rows) — remediation/alignment to PRD-36 and Decision D1"`
  - `npm run governance:audit -- --diff-mode local --branch-name codex/phase-x1-partial-slate-publish --pr-title "Phase X.1: partial-slate publish (1-5 rows) — remediation/alignment to PRD-36 and Decision D1"`
- Human checks:
  - Production publish, draft_only, and pipeline modes were not invoked during this remediation.

## Remaining Risks / Follow-up
- Phase X.2 must still perform the live publish only after BM provides explicit approved row IDs.
- The existing Supabase client publish path performs ordered writes with rollback handling; no publish operation was executed in this phase.
