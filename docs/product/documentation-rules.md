# Documentation Rules

This repository uses a controlled documentation system. The goal is to keep docs useful, short, and non-duplicated.

## Core Rules
- `docs/product/feature-system.csv` is the control layer and source of truth for feature tracking.
- Each feature gets one canonical PRD in `docs/prd/`.
- PRDs must stay short, execution-focused, and current.
- Small changes do not require PRDs.
- Testing notes belong in `docs/testing/` only when they add validation context that should live outside the PRD.
- Bug records belong in `docs/bug-fixes/` only when they capture a real defect, root cause, and fix history that should stay separate from the PRD.

## What Not To Create
- No duplicate PRDs for the same feature.
- No versioned PRD files such as `v2`, `final`, `updated`, or `summary`.
- No duplicate feature descriptions across product, PRD, testing, and bug-fix docs.
- No PRDs for UI tweaks, copy edits, or minor fixes.

## Required Workflow
1. Check `docs/product/feature-system.csv` first.
2. Work from the next feature marked `decision = build` with the lowest `build_order`.
3. If the feature already has a PRD, update that file instead of creating a new one.
4. After implementation, update the feature row in `feature-system.csv`.

## Directory Roles
- `docs/product/`:
  Control documents and product-level rules
- `docs/prd/`:
  One canonical PRD per feature
- `docs/bug-fixes/`:
  Concise defect-specific records
- `docs/testing/`:
  Concise validation notes and test reports
