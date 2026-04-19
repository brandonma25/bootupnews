# Release Governance Gate Velocity

## Summary

The release governance gate now separates CI PR diff inspection from local dirty-worktree inspection and reports more actionable failures for common governance blockers.

## Why

Recent PRs showed legitimate governance failures, but authors often discovered the fastest valid fix only after CI failed. PR #53 also exposed that generated Python cache artifacts could pollute diff classification when the gate inspected runner working-tree state.

## Changes

- CI PR runs inspect only the explicit `base...head` diff.
- Local script runs keep dirty-worktree inspection for intentional local validation.
- Hotspot, new-system, and PRD/CSV failures now explain the trigger files and fastest valid fix.
- Regression coverage captures generated Python artifacts, hotspot documentation coverage, new `src/` system files without PRDs, and docs-only baseline behavior.

## Governance Preserved

The change does not weaken PRD/CSV consistency, new-feature PRD requirements, hotspot freshness, or documentation lane requirements.
