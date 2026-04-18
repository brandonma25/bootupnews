# Governance Gate Map

## Purpose
- Keep the repo's governance system understandable without duplicating rules across `AGENTS.md`, product docs, and scripts.
- Define which file owns which part of the governance pipeline.

## Gate Tiers
- `baseline`
  Trivial or docs-only changes. These still inherit CSV validation and PRD/CSV parity checks.
- `documented`
  Material changes that must update at least one truthful supporting documentation lane.
- `promoted`
  New feature or system work that must include a canonical `PRD-XX` file plus CSV mapping.
- `hotspot`
  Material changes touching serialized governance hotspot files. These require governance docs coverage and freshness against `origin/main`.

## Responsibility Map
- `AGENTS.md`
  Front-door execution rules and branch discipline.
- `docs/engineering/protocols/engineering-protocol.md`
  Durable operating model and release sequence.
- `docs/engineering/protocols/release-machine.md`
  Mandatory release gate ordering.
- `docs/engineering/protocols/release-automation-operating-guide.md`
  Concrete CI and automation entrypoints.
- `docs/engineering/protocols/bug-tracking-governance.md`
  Bug-fix documentation policy and fix-to-doc linkage.
- `docs/product/documentation-rules.md`
  Documentation routing taxonomy and `feature-system.csv` governance.
- `scripts/validate-documentation-coverage.py`
  Standalone documentation coverage validator.
- `scripts/release-governance-gate.py`
  Blocking governance gate used in CI.
- `scripts/pr-governance-audit.py`
  Non-blocking PR classification and governance audit summary.
- `scripts/check-governance-hotspots.py`
  Local hotspot visibility and optional freshness enforcement.

## Hotspot Files
- `docs/product/feature-system.csv`
- `AGENTS.md`
- `docs/engineering/protocols/engineering-protocol.md`
- `docs/engineering/protocols/prd-template.md`
- `docs/product/documentation-rules.md`

## Classification Rules
- `docs-only`
  All changed files are docs or `AGENTS.md`.
- `trivial-code-change`
  No monitored files changed, tests-only changes, or one tiny low-risk change.
- `bug-fix`
  Fix-signaled work with meaningful non-test monitored changes.
- `material-feature-change`
  Meaningful monitored work that is not a new feature/system declaration and is not fix-signaled.
- `new-feature-or-system`
  Adds a canonical PRD or adds new product/system files under monitored feature prefixes.

## Documentation Coverage Rules
- Bug-fix work must update `docs/engineering/bug-fixes/`.
- New feature/system work must update `docs/product/prd/`.
- Material work must update at least one truthful documentation lane.
- Hotspot material work must also update governance-facing docs such as a protocol, change record, or other governance root doc.

## Freshness Rule
- Material hotspot work must contain the latest `origin/main` commit before merge readiness.
- For hotspot branches, freshness is advisory locally and blocking in the release governance gate.
