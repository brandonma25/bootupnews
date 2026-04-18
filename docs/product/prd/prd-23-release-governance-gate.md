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

## Current Completion Note
- Repo-side implementation is merged on `main`, and post-PR-46 audit evidence confirms that `release-governance-gate` runs on real pull requests with the expected check name.
- Final closure still depends on one external GitHub setting that cannot be verified or changed from repo code alone: branch protection for `main` must require `release-governance-gate` alongside the other PR Gate checks.
- Until that GitHub setting is verified, PRD-23 should be treated as `In Review` rather than fully closed.

## Evidence and Confidence
- Repo evidence used:
  - merged commit `5064935` from PR #46 on `origin/main`
  - live PR check evidence from PRs #34, #45, and #46
  - local classifier probes for docs-only, tests-only, `package.json`, new script, and auth-route changes
- Confidence:
  - High confidence that the repo-side implementation is correct
  - Medium confidence on merge-blocking enforcement until GitHub branch protection is verified externally
