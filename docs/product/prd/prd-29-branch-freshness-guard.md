# PRD-29 — Branch freshness guard

- PRD ID: `PRD-29`
- Canonical file: `docs/product/prd/prd-29-branch-freshness-guard.md`

## Objective
- Prevent stale hotspot-governance branches from moving toward merge without first syncing to the latest `main`.

## User Problem
- Governance-sensitive work becomes risky when hotspot branches drift behind current repo truth.

## Scope
- Detect whether a hotspot branch contains the latest `origin/main` commit.
- Keep the local signal advisory and the CI gate blocking for material hotspot work.

## Non-Goals
- Do not force every branch in the repo to rebase before any work can continue.
- Do not duplicate generic GitHub merge-conflict protection.

## Implementation Shape / System Impact
- Extend hotspot inspection with branch freshness awareness.
- Make the release governance gate fail stale material hotspot branches.

## Dependencies / Risks
- Depends on hotspot enforcement so freshness applies where drift matters most.
- Risk: noisy failures on ordinary branches. Mitigation: scope blocking freshness to hotspot material work only.

## Acceptance Criteria
- Local hotspot inspection reports freshness.
- The governance gate blocks stale hotspot-governance diffs.

## Evidence and Confidence
- Repo evidence used:
  - `scripts/check-governance-hotspots.py`
  - `scripts/release-governance-gate.py`
- Confidence:
  - High
