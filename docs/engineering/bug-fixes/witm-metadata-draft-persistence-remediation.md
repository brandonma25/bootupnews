# WITM Metadata Draft Persistence Remediation - Bug-Fix Record

## Summary
- Problem addressed: Controlled replay into draft persistence could lose WITM validation metadata, making a rewrite-required non-live draft row appear as passed.
- Root cause: Replay converted controlled artifact rows into `BriefingItem` values without carrying WITM validation status, failures, or details; draft construction and persistence then recomputed validation from text and overwrote the artifact result.
- Affected object level: Card / Surface Placement.

## Fix
- Exact change: Added optional WITM validation metadata to `BriefingItem`, mapped artifact validation metadata through replay, failed closed when selected Core/Context artifact rows lacked validation metadata, used supplied validation during draft candidate construction, and persisted the already-derived WITM status/failure/detail fields instead of recomputing them before insert.
- Related PRD: No new PRD required; supports existing admin review and final-slate readiness behavior.
- PR: #143, `chore(remediation): preserve WITM metadata in draft persistence`
- Branch: `codex/preserve-witm-metadata-draft-persistence`
- Head SHA: `f634ad1750117e84d43d2b81d9402387e7e9f70b`
- Merge SHA: `a25328a8378f73082e0e10cc35989c11c1c7c0c8`
- GitHub source-of-truth status: Canonical bug-fix record; detailed validation evidence was preserved as operational evidence outside the durable public source-of-truth surface.
- External references reviewed, if any: GitHub PR #143 metadata/body/files; merge diff for PR #143; historical validation record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the deleted/suspected-deleted branch recovery details; no branch deletion was performed in this follow-up.

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`.
- [x] Confirmed object level before coding: Article, Story Cluster, Signal, Card, or Surface Placement.
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] If legacy naming is inconsistent, document it instead of silently expanding it.

## Validation
- Automated checks: Original PR validation passed `git diff --check`, `npm run lint`, targeted pipeline/editorial tests, full `npm run test`, `npm run build`, `python3 scripts/validate-feature-system-csv.py`, and `python3 scripts/release-governance-gate.py --branch-name codex/preserve-witm-metadata-draft-persistence --pr-title "chore(remediation): preserve WITM metadata in draft persistence"`.
- Human checks: None claimed in this record.

## Remaining Risks / Follow-up
- PR #143 did not run the metadata-only repair; the existing non-live draft row still required separately authorized repair work at that time.
- Future replay/draft persistence changes must preserve artifact WITM metadata and must not silently convert rewrite-required rows into passing rows.
