# Controlled Core/Context Draft Cap 7 Remediation - Bug-Fix Record

## Summary
- Problem addressed: The limited Core/Context `draft_only` validation path could not run the approved 7-row product target because `PIPELINE_DRAFT_MAX_ROWS` was capped at `1..3`.
- Root cause: The controlled-runner safety cap treated all draft caps the same and had no narrow exception for the already-approved Core/Context slate shape.
- Affected object level: Signal / Surface Placement.

## Fix
- Exact change: Allowed `PIPELINE_DRAFT_MAX_ROWS=[REDACTED_ENV_VALUE]` only for `mode=draft_only` with the exact `core,context` tier allowlist; kept normal controlled selection capped at `1..3`; rejected Depth rows, non-draft modes, incomplete allowlists, and values `4`, `5`, `6`, or above `7`.
- Related PRD: No new PRD required; this supported the existing controlled Core/Context draft-only validation target.
- PR: #141, `chore(validation): align controlled draft cap with Core/Context slate`
- Branch: `codex/controlled-draft-core-context-cap-7`
- Head SHA: `390b7b0d0c7d82c63504f49b1fdbe2f81fbe8e66`
- Merge SHA: `efb1eea94d0452863b487c5e5b796635380597b8`
- GitHub source-of-truth status: Canonical bug-fix record; detailed validation evidence was preserved as operational evidence outside the durable public source-of-truth surface.
- External references reviewed, if any: GitHub PR #141 metadata/body/files; merge diff for PR #141; historical validation record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the deleted/suspected-deleted branch recovery details; no branch deletion was performed in this follow-up.

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`.
- [x] Confirmed object level before coding: Article, Story Cluster, Signal, Card, or Surface Placement.
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] If legacy naming is inconsistent, document it instead of silently expanding it.

## Validation
- Automated checks: Original PR validation passed `git diff --check`, `npm run lint`, targeted pipeline/editorial tests, full `npm run test`, `npm run build`, `python3 scripts/validate-feature-system-csv.py`, and `python3 scripts/release-governance-gate.py`.
- Human checks: None claimed in this record.

## Remaining Risks / Follow-up
- The cap exception remains intentionally narrow and must not be reused for broad/full-slate `draft_only`.
- Future write-mode validation must continue to exclude Depth rows and keep all created rows non-live, unpublished, and `needs_review`.
