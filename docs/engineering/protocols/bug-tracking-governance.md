# Bug Tracking Governance

## Purpose
- Define the lightweight repo-safe path from bug discovery to bug-fix documentation to governance enforcement.
- Make bug-fix work traceable without forcing every small fix into a new product PRD.

## Canonical Bug-Fix Lane
- The canonical bug-fix and remediation lane is `docs/engineering/bug-fixes/`.
- Use one bug-fix record per meaningful defect or tightly related defect family.
- Prefer updating the existing bug-fix record instead of creating `v2`, `final`, `follow-up`, or duplicate files for the same root cause.
- `docs/bugs/` is deprecated and must not receive new records.
- PR bodies alone are not sufficient durable remediation documentation for meaningful fixes.

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`.
- Use Article, Story Cluster, Signal, Card, and Surface Placement according to the canonical definitions.
- Do not use cluster, signal, story, or card interchangeably.
- Bug-fix records must state which object level was affected when the defect involves ingestion, clustering, ranking, UI cards, or placement behavior.

## When a Bug-Fix Record Is Required
- A branch or PR is explicitly framed as a fix, bug, hotfix, or regression repair.
- A non-trivial defect changes runtime, data, automation, workflow, or release behavior.
- The fix has a root cause, risk, or follow-up expectation that future maintainers should understand.

## When a Bug-Fix Record Is Usually Not Required
- Pure docs-only corrections.
- Tiny typo-only code changes with no real defect narrative.
- Structural repo cleanup whose detailed operational evidence belongs in PR metadata or private archive records rather than a bug-fix record.
- A new system or feature that should be documented primarily through a PRD instead of a bug record.

## Required Minimum Content
- Problem addressed.
- Root cause.
- Exact fix applied.
- Related PRD, if applicable.
- Affected object level: Article, Story Cluster, Signal, Card, or Surface Placement.
- Validation performed.
- PR number.
- Branch name.
- Head SHA and merge SHA when available.
- Remaining risks or follow-up.

## Cross-Reference Rules
- If the bug repair materially changes an existing numbered feature, reference the canonical `PRD-XX` inside the bug-fix record.
- If the work changes a governance rule or release behavior, also update the relevant protocol, template, or decision artifact.
- Do not copy the same narrative into the PRD, bug-fix record, and PR validation evidence; keep each artifact truthful to its job.
- If a legacy `docs/bugs/` record contains durable history, consolidate unique content into `docs/engineering/bug-fixes/` and leave at most a redirect note in the legacy file.
- Deleted remediation, bug-fix, hotfix, Codex, feature, or docs branches must remain reconcilable from GitHub documentation and PR metadata.

## Enforcement Link
- `scripts/validate-documentation-coverage.py` detects fix-signaled work and requires a `bug-fix` documentation lane update for meaningful non-test changes.
- `scripts/release-governance-gate.py` reuses that same coverage logic for blocking enforcement.

## Naming Guidance
- Prefer concise kebab-case file names that describe the defect, for example `oauth-session-persistence.md`.
- If the defect is tightly tied to a canonical PRD, `prd-XX-<slug>.md` is acceptable when it makes the relationship clearer.

## Template
- Use `docs/engineering/bug-fixes/templates/bug-fix-record-template.md` for new meaningful bug-fix records.
