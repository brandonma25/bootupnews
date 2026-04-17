# PRD-23 — Release Governance Gate

## Objective
- Block pull requests from merging when required governance artifacts are missing for material product or system changes.

## Problem
- Product and system changes can currently land without a reliable release-time check that enforces PRDs, CSV alignment, and supporting documentation updates.

## Scope

### Must Do
- Add one blocking GitHub Actions check named `release-governance-gate`.
- Reuse the existing feature-system CSV validator.
- Inspect the PR diff and classify the change as docs-only, trivial-code-change, material-feature-change, or new-feature-or-system.
- Require a canonical `PRD-XX` document and matching CSV mapping for new features or systems.
- Require supporting documentation updates for material feature or system changes.

### Must Not Do
- Do not modify application runtime behavior.
- Do not add brittle heuristics that block obvious typo-only or test-only cleanup changes.
- Do not duplicate CSV validation rules already enforced by `scripts/validate-feature-system-csv.py`.

## Success Criteria
- Docs-only PRs pass when the CSV remains valid.
- Trivial code changes pass when the CSV remains valid.
- Material feature or system changes fail if no supporting docs are updated.
- New feature or system changes fail if a canonical PRD or CSV mapping is missing.
- The PR check is available as a required status check on pull requests.

## Done When
- `scripts/release-governance-gate.py` exists and enforces the gate rules.
- `.github/workflows/release-governance-gate.yml` runs the gate on `pull_request`.
- `docs/product/feature-system.csv` includes the PRD mapping for this governance gate.
- Repo-safe documentation explains the new release governance gate.
