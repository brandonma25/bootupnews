# AGENTS.md — Codex Operating Rules

## 1. Required Reading
Before ANY substantial implementation work, you MUST read:

- `docs/engineering/protocols/engineering-protocol.md`
- `docs/engineering/protocols/test-checklist.md`
- `docs/engineering/protocols/prd-template.md`
- `docs/engineering/protocols/release-machine.md`
- `docs/engineering/protocols/release-automation-operating-guide.md`

## Branch Discipline Rules (Mandatory)

## Git Worktree / Branch Attachment Protocol (Mandatory)

Before installs, edits, tests, refactors, or any prompt step that assumes branch context, Codex must confirm the active workspace identity.

Run first:

```bash
pwd
git branch --show-current
git status
git worktree list
```

Codex must report:
- current folder
- current branch
- full worktree list
- whether the requested branch is already owned by another worktree
- whether the current session is attached to the correct owning worktree for the task

If the requested branch is already used by another worktree:
- do not run `git checkout` for that branch
- do not use `--ignore-other-worktrees`
- do not create a duplicate worktree for the same branch
- stop and instruct the user to open or use the owning worktree directly

All work on an existing feature, fix, docs, or chore branch must happen inside that branch's owning worktree folder.

Reusable prompt block:

```text
WORKSPACE IDENTITY CHECK — REQUIRED FIRST STEP
Run:
pwd
git branch --show-current
git status
git worktree list

Report:
- current folder
- current branch
- whether this is the correct owning worktree for the requested task

Do not proceed until this is confirmed.
```

Before starting any new development:

1. Always start from `main`.
2. Always update `main` first.
3. Create exactly one branch per feature/fix.
4. Do not stack new work on old feature branches.
5. Do not create backup branches like `*-wip`, `*-backup`, or `*-final`.
6. If more work is needed for the same feature, continue on the same branch unless the feature has already been merged.
7. After a PR is merged, delete the branch locally and remotely.
8. If branch purpose is unclear or overlaps another branch, stop and resolve branch strategy before coding.

Required branch creation flow:

```bash
cd "/Users/bm/Documents/daily-intelligence-aggregator-main"
pwd
git checkout main
git pull
git checkout -b feature/prd-<number>-<short-name>
```

Required post-merge cleanup flow:

```bash
git checkout main
git pull
git branch -d feature/<name>
git push origin --delete feature/<name>
```

## 2. Scope & Branching
- Always make an explicit branch decision.
- Keep one feature or fix per branch.
- Do not mix unrelated changes.
- Do not modify unrelated files.

## GOVERNANCE HOTSPOT RULES

Detailed gate ownership lives in `docs/engineering/protocols/governance-gate-map.md`.

The following files are serialized hotspot files:

- `docs/product/feature-system.csv`
- `AGENTS.md`
- `docs/engineering/protocols/engineering-protocol.md`
- `docs/engineering/protocols/prd-template.md`
- `docs/product/documentation-rules.md`

Rules:

1. Codex must avoid parallel long-lived branches that edit hotspot files.
2. If a branch needs to edit hotspot files and another open PR already edits them, Codex must:
   - warn that overlap exists
   - prefer rebasing or stacking on the latest branch
   - or recommend closing the stale branch as superseded
3. Before opening a PR that touches hotspot files, Codex must sync with `origin/main`.
4. Before merging a PR that touches hotspot files, Codex must re-check whether `main` has moved and re-sync if needed.
5. If a hotspot-governance branch becomes stale, prefer port-forwarding the still-needed logic into a fresh branch from `main` instead of forcing the stale PR through.

## 3. Validation Order
- Follow `Local -> Vercel Preview -> Production`.
- Treat Vercel preview as the source of truth for auth, cookies, redirects, SSR, and environment variables.
- Never use production as first-pass debugging.

## 4. Required Automated Checks
- Run `npm install`.
- Run `npm run lint || true`.
- Run `npm run test || true`.
- Run `npm run build`.
- Enforce the Dev Server Rule on port `3000`.
- Run `npm run dev`.
- Verify the app loads.
- If build fails, stop.

## 5. Playwright Post-Coding Execution Rule
- For any UI-affecting, auth-affecting, routing-affecting, SSR-affecting, dashboard-affecting, or data-rendering change, Codex must evaluate whether Playwright coverage must be added or updated.
- After implementation is complete, Codex must run the local Playwright workflow when technically possible.
- Minimum default local flow:
- `npm install`
- `npm run lint || true`
- `npm run test || true`
- `npm run build`
- the Dev Server Rule
- `npm run dev`
- `npx playwright test --project=chromium`
- If the feature affects broader UI behavior, Codex should run `npx playwright test`.
- Codex must report:
- exact commands run
- exact Local URL
- Playwright pass/fail results
- remaining preview-required checks
- remaining human-only checks
- Codex must not claim preview or production validation from local Playwright results alone.

## 6. Human Validation Required
- Request user validation for OAuth or login flows.
- Request user validation for session persistence.
- Request user validation for preview environment behavior.
- Request user validation for auth, SSR, or env-sensitive changes.

## 7. Documentation & Security
- Update repo-safe documentation for every serious feature or fix.
- Never commit or expose API keys, tokens, secrets, auth vulnerabilities, exploit steps, cookies, headers, or sensitive logs.

## 7a. Google Sheets Feature Tracking Governance
- Google Sheets workbook `Features Table` is the master live planning and feature-tracking system.
- `Sheet1` is the governed approved feature table.
- `Intake Queue` is the only allowed destination for unmapped, spontaneous, newly discovered, or ambiguous work.
- `Record ID` in `Sheet1` is immutable and may be used only as the lookup key for governed writes.
- Only explicitly approved automation-managed columns may be updated automatically.
- Formula or computed columns must never be written by automation.
- Codex must never auto-create unmapped rows directly in `Sheet1`.
- Tracker closeout is part of Definition of Done for feature, fix, refactor, UX, and governance work.
- Codex must not claim a tracker update unless it has reread and verified the exact live row after writing, or created a fallback tracker-sync artifact.
- Existing governed rows in `Sheet1` must be updated by `Record ID`; do not duplicate governed rows.
- Unmapped or ambiguous work must go to `Intake Queue`, not a made-up governed row.
- `Status` must use normalized tracker values such as `Not Built`, `In Progress`, `In Review`, `Merged`, `Built`, or `Deprecated`; do not write prose sentences or malformed status variants.
- If a canonical PRD file exists in `docs/product/prd/`, the live `PRD File` column must contain that path.
- For mapped work, merge to `main` may update status to `Merged`.
- `Merged` may move to `Built` only after production verification succeeds.
- Any workflow or automation that touches feature tracking must preserve `Sheet1` and `Intake Queue` separation.
- Automation changes must fail safely and must not silently write to the wrong row.
- If direct Sheets access fails, Codex must create `docs/operations/tracker-sync/YYYY-MM-DD-<slug>.md` with the exact manual update payload before final closeout.

## 8. Merge Conditions
- Do not recommend merge unless build passes, local validation is complete, preview validation is confirmed, and docs are updated.

## DOCUMENTATION SYSTEM RULE (MANDATORY)

This repository uses a strict documentation system to prevent bloat and maintain clarity.

### Source of Truth
- `PRD-XX` is the single source of truth for feature identity across the repo.
- Google Sheets workbook `Features Table` is the source of truth for live feature-tracking status and intake review.
- `/docs/product/feature-system.csv` remains the repo-side source of truth for PRD mapping, build order, dependencies, and durable repo governance metadata.

### PRD Rules
- Every feature must have a unique PRD ID using the format `PRD-XX` where `XX` is the canonical numeric identifier.
- Each PRD ID maps to exactly one canonical PRD file:
  `/docs/product/prd/prd-XX-<feature-name>.md`
- Canonical PRD filenames must use lowercase kebab-case and zero-padded numbering for `1` through `9`.
- Required filename pattern: `prd-XX-short-kebab-case-title.md`
- Examples: `prd-01-...`, `prd-09-...`, `prd-10-...`
- New PRDs must follow the canonical filename pattern at creation time, not in a later cleanup pass.
- Do not create or rename PRDs in uppercase, mixed case, or non-zero-padded numeric formats such as `prd-1-...`.
- Create a PRD only for meaningful system-level or multi-file features.
- Use `/docs/engineering/protocols/prd-template.md` when a PRD is needed.
- One PRD ID equals one document. Do not create multiple PRD versions. Update the existing canonical PRD instead.
- Before creating any PRD, Codex MUST:
  1. check `/docs/product/prd/` for an existing `PRD-XX` file
  2. check `/docs/product/feature-system.csv` for an existing `prd_id`
  3. update the existing document instead of creating a new file when that `prd_id` already exists
- If a new feature is created, Codex MUST:
  1. assign the next sequential `PRD-XX`
  2. create exactly one file at `/docs/product/prd/prd-XX-<feature-name>.md`
  3. register both `prd_id` and `prd_file` in `/docs/product/feature-system.csv`
- Codex MUST NOT create “architecture”, “system”, or “brief” documents in `/docs/product/prd/` for an existing PRD ID.
- If supporting documentation is needed for an existing PRD, merge it into the canonical PRD or move the content into `/docs/engineering/`.

### Feature Execution Rules
Before implementing ANY feature:
1. Read `/docs/product/feature-system.csv`
2. Select the next feature where:
   - `decision = build`
   - lowest `build_order`
3. Respect dependencies before implementation

During active branch work:
- set `status = In Progress`

When implementation is complete but awaiting merge or review:
- set `status = In Review`

After merge or explicit user acceptance:
- set `status = Built`
- set `decision = keep`
- update `last_updated`

Do not:
- implement features marked `delay` or `kill`
- change `build_order` without explicit user instruction
- create new feature rows unless explicitly asked

If a feature is no longer active:
- set `status = Deprecated`
- update `decision` accordingly if explicitly instructed

The CSV must be updated in the same PR as the feature work whenever feature state changes.

### PRD Duplication Prevention
- Each `prd_id` in `/docs/product/feature-system.csv` must map to exactly one file in `/docs/product/prd/`.
- Each PRD filename in `/docs/product/prd/` must include its `PRD-XX` identifier in zero-padded filename form.
- Codex must not create multiple PRD-level documents for the same feature identity.
- If duplicate PRD-level documentation is discovered, consolidate it into the canonical PRD or move non-PRD material into `/docs/engineering/`.

### Documentation Taxonomy and Routing
- Optimize for strict truth, not convenience. Do not keep a document in the wrong folder just to avoid churn.
- Product control documents remain at `docs/product/`.
- Product briefs for meaningful feature work belong in `docs/product/briefs/`.
- Numbered feature PRDs belong in `docs/product/prd/`.
- Meaningful defect records belong in `docs/engineering/bug-fixes/`.
- Meaningful governance, process, release, or workflow failures belong in `docs/engineering/incidents/`.
- Meaningful repo, documentation, audit, migration, or consolidation records belong in `docs/engineering/change-records/`.
- Meaningful validation notes and test reports belong in `docs/engineering/testing/`.
- Operating rules, checklists, templates, and standards belong in `docs/engineering/protocols/`.
- "Meaningful" means work that changes behavior, coordination, validation expectations, or future maintenance understanding. Tiny copy edits, trivial renames, and purely mechanical one-line fixes do not require standalone docs.
- When uncertain between bug-fix, incident, and change-record docs:
  1. Use `bug-fixes` for user-facing or system-facing defects with a real root cause and fix.
  2. Use `incidents` for process, governance, release, or operational failures that need lessons and follow-up.
  3. Use `change-records` for audits, migrations, structural cleanup, and normalization passes.
