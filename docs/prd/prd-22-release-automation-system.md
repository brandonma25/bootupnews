# PRD-22 — Release Automation System

- PRD ID: `PRD-22`
- Canonical file: `docs/prd/prd-22-release-automation-system.md`
- Feature system row: update `docs/product/feature-system.csv` with matching `prd_id` and `prd_file`

## Objective
- Establish one canonical release system for the repo so local checks, PR checks, preview checks, production sanity checks, and human auth/session gates follow a repeatable path.

## Problem
- Release validation can drift across branches when merge readiness depends on ad hoc commands, partial automation, or inconsistent reporting.

## Scope
### Must Do
- Define the local, PR, preview, production, and human auth/session release gates.
- Provide standard release entrypoints and workflow references.
- Keep documentation and merge guidance aligned with those gates.

### Must Not Do
- Pretend local-only validation replaces preview truth.
- Fully automate provider-login and session-persistence checks that still require human confirmation.
- Scatter canonical PRD ownership across multiple docs in `docs/prd/`.

## System Behavior
- Serious work flows through a documented sequence of local validation, PR automation, preview validation, human auth/session checks, production verification, and release documentation.
- Standard scripts and workflows provide the reusable entrypoints for those gates.
- Merge recommendations are blocked when required gates are incomplete.

## Key Logic
- `docs/engineering/release-machine.md` defines the mandatory release protocol.
- `docs/engineering/release-automation-operating-guide.md` explains the reusable release-gate architecture and external dependencies.
- Repo workflows and scripts implement the automated portions of those gates.

## Risks / Limitations
- Preview and production checks still depend on external GitHub and Vercel wiring.
- Human auth/session truth cannot be fully automated safely.
- Local sandbox constraints can interfere with dev-server and browser-based validation.

## Success Criteria
- The repo has one canonical PRD for release automation governance.
- Release gates are clearly named and reusable across future branches.
- Human-only checks remain explicit rather than implied.

## Done When
- One canonical PRD exists for the release automation system and the feature CSV maps it explicitly.
