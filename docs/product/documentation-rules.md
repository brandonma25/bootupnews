# Documentation Rules

This repository uses a controlled documentation system. The goal is to keep docs useful, short, and non-duplicated.

## Core Rules
- Google Sheets workbook `Features Table` is the live source of truth for feature-tracking status.
- `Sheet1` is the governed approved feature table and `Intake Queue` is the quarantine lane for unmapped or ambiguous work.
- `Record ID` in `Sheet1` is immutable and may only be used as the governed lookup key for automation.
- Automation must never write formula/computed columns or silently overwrite human-managed fields in Google Sheets.
- `docs/product/feature-system.csv` is the repo-side control layer for PRD mapping, build order, and durable governance metadata.
- The CSV is the product control layer and its schema is locked to exactly 12 columns in this exact order:
  `Layer, Feature Name, Priority, Status, Description, Owner, Dependency, Build Order, Decision, Last Updated, prd_id, prd_file`
- No additional columns are allowed.
- No missing columns are allowed.
- PRD mapping is enforced through `prd_id` and `prd_file`.
- Any schema change requires an explicit update to `scripts/validate-feature-system-csv.py`.
- Allowed `status` values are:
  `Not Built`, `In Progress`, `In Review`, `Built`, `Deprecated`
- Status meanings:
  `Not Built` = planned but not started;
  `In Progress` = active branch work underway;
  `In Review` = implementation complete and waiting for merge or review;
  `Built` = merged or explicitly accepted as complete;
  `Deprecated` = no longer active
- Each numbered feature gets one canonical PRD in `docs/product/prd/`.
- PRDs must stay short, execution-focused, and current.
- Small changes do not require PRDs.
- Product briefs belong in `docs/product/briefs/` when feature work is meaningful enough to merit concise scoping before or alongside implementation.
- Testing notes belong in `docs/engineering/testing/` only when they add validation context that should live outside the PRD.
- Bug records belong in `docs/engineering/bug-fixes/` only when they capture a real defect, root cause, and fix history that should stay separate from the PRD.
- Incident records belong in `docs/engineering/incidents/` only when they capture a meaningful governance, process, release, or workflow failure.
- Change records belong in `docs/engineering/change-records/` when the work is primarily an audit, migration, consolidation, normalization, or repo-structure change.
- Rules, checklists, and templates belong in `docs/engineering/protocols/`.
- Governance tier ownership lives in `docs/engineering/protocols/governance-gate-map.md`.
- Bug-fix requirement details live in `docs/engineering/protocols/bug-tracking-governance.md`.

## Visibility Note
- `docs/product/feature-system.csv` is visible if this repository is public.
- To keep that file private, the repository must be private or the file must move to a private repository.

## What Not To Create
- No duplicate PRDs for the same feature.
- No versioned PRD files such as `v2`, `final`, `updated`, or `summary`.
- No duplicate feature descriptions across product, PRD, testing, and bug-fix docs.
- No PRDs for UI tweaks, copy edits, or minor fixes.
- No bug-fix docs for repo audits or structural cleanup when a change record is the truthful home.
- No testing reports in protocol folders.
- No checklists stored as testing notes when they are actually operating standards.

## Required Workflow
1. Check `docs/product/feature-system.csv` first.
2. Work from the next feature marked `decision = build` with the lowest `build_order`.
3. Respect dependencies before implementation.
4. If the feature already has a PRD, update that file instead of creating a new one.
5. Preserve the Google Sheets governance model: mapped work belongs in `Sheet1`, while unmapped or ambiguous work must go to `Intake Queue`.
6. Do not create governed `Sheet1` rows automatically from GitHub merges or repo automation.
7. During active branch work, set `status = In Progress`.
8. When implementation is complete but awaiting merge or review, set `status = In Review`.
9. After merge or explicit user acceptance, set `status = Built`, `decision = keep`, and update `last_updated`.

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
- `docs/product/prd/`:
  One canonical PRD per feature
- `docs/product/briefs/`:
  Concise product scoping and feature briefs for meaningful work
- `docs/engineering/bug-fixes/`:
  Concise defect-specific records
- `docs/engineering/incidents/`:
  Governance, process, release, or workflow incident records
- `docs/engineering/change-records/`:
  Audits, migrations, consolidations, and structural change history
- `docs/engineering/testing/`:
  Concise validation notes and test reports
- `docs/engineering/protocols/`:
  Operating rules, templates, checklists, and governance standards

## Meaningful Documentation Threshold
- Use the smallest truthful documentation set that preserves future understanding.
- "Meaningful" usually means one of:
  - a multi-file or system-level feature
  - a defect with a non-trivial root cause or follow-up risk
  - a release or process failure that should change how the repo is operated
  - a migration, audit, or consolidation that changes repo structure or source-of-truth rules
  - a validation run whose details matter after the task is closed
- Do not create standalone docs for trivial copy edits, formatting-only changes, or tiny one-line refactors unless the user explicitly asks.

## Routing Guide
1. If the work defines or scopes meaningful product behavior, create or update a brief in `docs/product/briefs/`.
2. If the work is numbered feature work, create or update the canonical PRD in `docs/product/prd/`.
3. If the work fixes a real defect, create or update `docs/engineering/bug-fixes/`.
   Use `docs/engineering/protocols/bug-tracking-governance.md` for the bug-fix threshold and template guidance.
4. If the work records a meaningful process, governance, release, or workflow failure, use `docs/engineering/incidents/`.
5. If the work primarily records an audit, migration, normalization, taxonomy cleanup, or repo-structure repair, use `docs/engineering/change-records/`.
6. If the work records meaningful validation performed, use `docs/engineering/testing/`.
7. If the file is a standing rule, checklist, template, or standard, use `docs/engineering/protocols/`.
