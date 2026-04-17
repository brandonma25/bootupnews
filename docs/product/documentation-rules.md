# Documentation Rules

This repository uses a controlled documentation system. The goal is to keep docs useful, short, and non-duplicated.

## Core Rules
- `docs/product/feature-system.csv` is the control layer and source of truth for feature tracking.
- The CSV schema is:
  `layer, feature_name, priority, status, description, owner, dependency, build_order, decision, last_updated`
- Allowed `status` values are:
  `Not Built`, `In Progress`, `In Review`, `Built`, `Deprecated`
- Status meanings:
  `Not Built` = planned but not started;
  `In Progress` = active branch work underway;
  `In Review` = implementation complete and waiting for merge or review;
  `Built` = merged or explicitly accepted as complete;
  `Deprecated` = no longer active
- Each feature gets one canonical PRD in `docs/prd/`.
- PRDs must stay short, execution-focused, and current.
- Small changes do not require PRDs.
- Testing notes belong in `docs/testing/` only when they add validation context that should live outside the PRD.
- Bug records belong in `docs/bug-fixes/` only when they capture a real defect, root cause, and fix history that should stay separate from the PRD.

## Visibility Note
- `docs/product/feature-system.csv` is visible if this repository is public.
- To keep that file private, the repository must be private or the file must move to a private repository.

## What Not To Create
- No duplicate PRDs for the same feature.
- No versioned PRD files such as `v2`, `final`, `updated`, or `summary`.
- No duplicate feature descriptions across product, PRD, testing, and bug-fix docs.
- No PRDs for UI tweaks, copy edits, or minor fixes.

## Required Workflow
1. Check `docs/product/feature-system.csv` first.
2. Work from the next feature marked `decision = build` with the lowest `build_order`.
3. Respect dependencies before implementation.
4. If the feature already has a PRD, update that file instead of creating a new one.
5. During active branch work, set `status = In Progress`.
6. When implementation is complete but awaiting merge or review, set `status = In Review`.
7. After merge or explicit user acceptance, set `status = Built`, `decision = keep`, and update `last_updated`.

## Change Control
- Do not implement features marked `delay` or `kill`.
- Do not change `build_order` without explicit user instruction.
- Do not create new feature rows unless explicitly asked.
- If a feature is no longer active, set `status = Deprecated`.
- Update `decision` accordingly if explicitly instructed.
- Update the CSV in the same PR as the feature work whenever feature state changes.

## Directory Roles
- `docs/product/`:
  Control documents and product-level rules
- `docs/prd/`:
  One canonical PRD per feature
- `docs/bug-fixes/`:
  Concise defect-specific records
- `docs/testing/`:
  Concise validation notes and test reports
