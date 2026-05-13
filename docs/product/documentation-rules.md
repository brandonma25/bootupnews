# Documentation Rules

This repository uses a controlled documentation system. The goal is to keep docs useful, short, and non-duplicated.

## Core Rules
- Public repo documentation is the canonical source of truth for product framing, durable decisions, canonical PRDs, feature governance metadata, standing process rules, and portfolio-facing architecture/process artifacts.
- PR bodies, GitHub metadata, and external/private archives are the preferred home for per-run operational evidence, validation transcripts, branch-cleanup details, and closeout records.
- Google Sheet / Google Work Log records are retired as live source-of-truth systems and may be used only as historical reference inputs.
- Routine closeout must not update Google Sheets, claim tracker updates, or create public tracker-sync fallback files.
- LLM coding agents should use `docs/engineering/templates/llm-prompt-template-change-classification.md` before selecting a governance path.
- Terminology requirement: before implementation, read `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`. Use Article, Story Cluster, Signal, Card, and Surface Placement according to the canonical definitions. Do not use cluster, signal, story, or card interchangeably.
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
- Bug records belong in `docs/engineering/bug-fixes/` only when they capture a real defect, root cause, and fix history that should stay separate from the PRD.
- Incident records belong in `docs/engineering/incidents/` only when they capture a meaningful governance, process, release, or workflow failure.
- Validation notes, audits, migrations, consolidations, normalization passes, and repo-structure cleanup should usually stay in PR bodies, GitHub metadata, or external/private archives unless a stable public artifact is explicitly needed.
- Rules, checklists, and templates belong in `docs/engineering/protocols/`.
- `docs/bugs/` and `docs/changes/` are deprecated and non-canonical. Do not create new records there.
- Existing `docs/bugs/` or `docs/changes/` files that contain durable history must be migrated, consolidated, or replaced with redirect notes pointing to the canonical GitHub doc path.
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
- No testing diary reports in public protocol folders.
- No checklists stored as testing notes when they are actually operating standards.
- No new `docs/bugs/` records.
- No new `docs/changes/` records.
- No routine tracker-sync fallback files for normal closeout.
- No new public operational logs for routine validation, branch cleanup, or closeout.

## Required Workflow
1. Check `docs/product/feature-system.csv` first.
2. Work from the next feature marked `decision = build` with the lowest `build_order`.
3. Respect dependencies before implementation.
4. Complete the terminology check and state which object level the work modifies: Article, Story Cluster, Signal, Card, or Surface Placement.
5. If the feature already has a PRD, update that file instead of creating a new one.
6. If the user explicitly asks for a new feature or new system-level behavior and no existing row maps it, create the canonical PRD and matching CSV row in the same branch before or alongside implementation.
7. Update stable public documentation only when the change creates durable product, governance, or portfolio-facing information.
8. Do not update Google Sheets or claim tracker updates.
9. Do not create routine tracker-sync fallback files or public operational logs.
10. During active branch work, set CSV `status = In Progress` when feature metadata changes are in scope.
11. When implementation is complete but awaiting merge or review, set CSV `status = In Review` when feature metadata changes are in scope.
12. After merge or explicit user acceptance, set CSV `status = Built`, `decision = keep`, and update `last_updated` when feature metadata changes are in scope.

## Change Control
- Do not implement features marked `delay` or `kill`.
- Do not change `build_order` without explicit user instruction.
- Do not create new feature rows unless explicitly asked, or unless the user has requested a new feature/system implementation that has no existing PRD/CSV mapping and is classified as `new-feature-or-system`.
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
- `docs/engineering/protocols/`:
  Operating rules, templates, checklists, and governance standards
- `docs/engineering/templates/`:
  Reusable public-safe engineering and governance templates
- PR bodies, GitHub metadata, and external/private archives:
  Per-run validation, operational logs, branch cleanup, migration evidence, and closeout records
- `docs/bugs/`:
  Deprecated legacy bug reports; migrate durable content into `docs/engineering/bug-fixes/`
- `docs/changes/`:
  Deprecated legacy PR/change notes; migrate durable content into the correct canonical lane

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
5. If the work primarily records an audit, migration, normalization, taxonomy cleanup, validation run, or branch cleanup, keep the evidence in the PR body, GitHub metadata, or an external/private archive unless a stable public artifact is explicitly needed.
6. If the file is a standing rule, checklist, template, or standard, use `docs/engineering/protocols/` or `docs/engineering/templates/`.
