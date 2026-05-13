# AGENTS.md — Codex Operating Rules

## 1. Required Reading
Before ANY substantial implementation work, you MUST read:

- `docs/engineering/protocols/engineering-protocol.md`
- `docs/engineering/protocols/test-checklist.md`
- `docs/engineering/protocols/prd-template.md`
- `docs/engineering/protocols/release-machine.md`
- `docs/engineering/protocols/release-automation-operating-guide.md`
- `docs/product/documentation-rules.md`
- `docs/engineering/protocols/bug-tracking-governance.md`
- `docs/engineering/bug-fixes/templates/bug-fix-record-template.md`
- `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`

## Branch Discipline Rules (Mandatory)

## Git Worktree / Branch Attachment Protocol (Mandatory)

A branch may have only one owning worktree at a time in normal operation. The owner is the path shown by `git worktree list`.

Before installs, edits, tests, branch switches, continuation work, refactors, or any prompt step that assumes branch context, Codex must confirm the active workspace identity.

Run first:

```bash
pwd
git branch --show-current
git status --short --branch
git worktree list
```

Codex must report:
- current folder
- current branch
- full worktree list
- whether the requested branch already exists
- whether the requested branch is already owned by another worktree
- whether the current session is attached to the correct owning worktree for the task

Hard stop conditions:
- If the requested branch is shown in `git worktree list` at another path, stop before installs, edits, tests, or branch switches.
- Report the owning worktree path and ask the user to continue from that folder.
- do not run `git checkout` for that branch
- do not create a duplicate worktree for that branch
- do not use `--force` or `--ignore-other-worktrees` to bypass branch/worktree safety for ordinary repo work
- If the current folder is not the requested branch's owning worktree, stop before making changes and switch to or create the correct worktree first.

Existing branch continuation:
- All work on an existing feature, fix, docs, or chore branch must happen inside that branch's owning worktree folder.
- If the correct owning worktree already exists, use it; do not improvise a new folder.
- Do not switch into a branch already owned by another worktree.

New scoped work:
- Start from updated `main`.
- Create exactly one scoped branch for the feature, fix, docs update, or chore.
- When using worktrees, create a dedicated named worktree for that branch from updated `main`.
- Do not create backup branches like `*-wip`, `*-backup`, or `*-final`.

Reusable prompt block:

```text
WORKSPACE IDENTITY CHECK — REQUIRED FIRST STEP
Run:
pwd
git branch --show-current
git status --short --branch
git worktree list

Report:
- current folder
- current branch
- full worktree list
- requested branch
- whether the requested branch already exists
- owner path if the requested branch is shown in git worktree list
- whether this is the correct owning worktree for the requested task

Stop before installs, edits, tests, or branch switches if branch ownership does not match.
Never bypass worktree safety with --force or --ignore-other-worktrees for ordinary repo work.
```

Before starting any new development:

1. Always start from `main`.
2. Always update `main` first.
3. Create exactly one branch per feature, fix, docs update, or chore.
4. Do not stack new work on old feature branches.
5. Do not create backup branches like `*-wip`, `*-backup`, or `*-final`.
6. If more work is needed for the same feature, continue on the same branch unless the feature has already been merged.
7. After a PR is merged, delete the branch locally and remotely.
8. If branch purpose is unclear or overlaps another branch, stop and resolve branch strategy before coding.

Required branch creation flow:

```bash
cd "/Users/bm/dev/daily-intelligence-aggregator"
pwd
git checkout main
git pull
git checkout -b feature/prd-<number>-<short-name>
```

Required worktree creation flow when a dedicated worktree is requested:

```bash
cd "/Users/bm/dev/daily-intelligence-aggregator"
pwd
git checkout main
git pull
git worktree add "/Users/bm/dev/worktrees/daily-intelligence-aggregator-<short-name>" -b <branch-name>
cd "/Users/bm/dev/worktrees/daily-intelligence-aggregator-<short-name>"
pwd
git branch --show-current
git status --short --branch
git worktree list
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

## 2a. Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`.
- Use Article, Story Cluster, Signal, Card, and Surface Placement according to the canonical definitions.
- Do not use cluster, signal, story, or card interchangeably.
- Before coding, confirm the object level being changed: Article, Story Cluster, Signal, Card, or Surface Placement.
- Do not add new variable, file, function, component, or database terminology that blurs Cluster vs Signal vs Card.
- If legacy naming is inconsistent, document it instead of silently expanding it.

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

## 7a. GitHub Documentation Source-of-Truth Governance
- Public repo documentation is canonical for product framing, durable decisions, PRD/feature metadata, standing governance rules, and stable process artifacts.
- `docs/product/feature-system.csv` is the repo-side control file for PRD mapping, build order, dependencies, decisions, and durable feature governance metadata.
- Per-run operational evidence, validation transcripts, branch-cleanup details, and closeout records should live in PR bodies, GitHub metadata, or external/private archives unless the user explicitly asks for a stable public artifact.
- Google Sheet / Google Work Log records are retired as source-of-truth systems. They may be read only as historical reference inputs when relevant.
- Codex must not update Google Sheets, claim tracker updates, treat the Google Work Log as canonical, or create new public tracker-sync records.
- LLM coding agents should classify work using `docs/engineering/templates/llm-prompt-template-change-classification.md` before choosing a governance path.
- Closeout for feature, fix, refactor, UX, and governance work must update the PR body/checklist and `docs/product/feature-system.csv` when PRD/feature metadata changes. Update public repo docs only when the change creates durable product, governance, or portfolio-facing information.
- Agents must not claim production, preview, tracker, or Google Work Log validation unless that exact system was actually checked in the current task.

## 8. Merge Conditions
- Do not recommend merge unless build passes, local validation is complete, preview validation is confirmed, and docs are updated.

## DOCUMENTATION SYSTEM RULE (MANDATORY)

This repository uses a strict documentation system to prevent bloat and maintain clarity.

### Required Governance Files Before Implementation
- Before editing product or system code, classify the request using `docs/engineering/templates/llm-prompt-template-change-classification.md`.
- If the user explicitly asks for a new feature or new system-level behavior and no existing `PRD-XX` / `feature-system.csv` row covers it, create the required governance files in the same branch before or alongside the first implementation commit.
- Required files for new feature or system work:
  1. exactly one canonical PRD at `/docs/product/prd/prd-XX-<feature-name>.md`
  2. exactly one matching row in `/docs/product/feature-system.csv` with `prd_id` and `prd_file`
- Do not wait for `release-governance-gate` to fail before adding these files. The branch is incomplete until the governance files and implementation changes agree.
- This does not authorize documentation sprawl: bug fixes, remediation, refactors, audits, and tiny UI/copy changes still use the smaller documentation lane defined below.

### Source of Truth
- `PRD-XX` is the single source of truth for feature identity across the repo.
- Public repo documentation is the source of truth for product framing, durable decisions, canonical PRDs, feature metadata, and standing governance rules.
- PR bodies, GitHub metadata, and external/private archives are the preferred home for operational evidence, validation transcripts, branch-cleanup details, and closeout records.
- `/docs/product/feature-system.csv` remains the repo-side source of truth for PRD mapping, build order, dependencies, decisions, and durable repo governance metadata.
- Google Sheet and Google Work Log records are historical reference inputs only.

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
- create new feature rows unless explicitly asked, or unless the user has requested a new feature/system implementation that has no existing PRD/CSV mapping and is classified as `new-feature-or-system`

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
- Defects, regressions, hotfixes, and remediations with durable public-maintenance value may use `docs/engineering/bug-fixes/`.
- Audits, migrations, repo-structure cleanup, validation notes, and release evidence should usually be recorded in PR bodies, GitHub metadata, or external/private archives rather than new public operational logs.
- Governance, process, release, and workflow failures belong in public docs only when they create a durable operating rule or reviewer-facing artifact.
- Operating rules, templates, checklists, and standards belong in `docs/engineering/protocols/`.
- Do not create new records under `docs/bugs/` or `docs/changes/`; those folders are deprecated and non-canonical.
- If existing `docs/bugs/` or `docs/changes/` files contain durable history, migrate or consolidate the useful content into the canonical GitHub doc lane and leave at most a redirect note.
- "Meaningful" means work that changes behavior, coordination, validation expectations, or future maintenance understanding. Tiny copy edits, trivial renames, and purely mechanical one-line fixes do not require standalone docs.
- When uncertain between bug-fix, incident, and change-record docs:
  1. Use `bug-fixes` for user-facing or system-facing defects with a real root cause and fix.
  2. Use a stable protocol/template update for process, governance, release, or workflow lessons that should remain public.
  3. Use PR bodies, GitHub metadata, or external/private archives for audits, migrations, structural cleanup, validation transcripts, and operational details that do not need to remain in the public browse path.

### Branch Cleanup Documentation
- Before deleting any remediation, bug-fix, hotfix, Codex, feature, or docs branch, capture in the PR body, GitHub metadata, or a private archive:
  - branch name
  - PR number or `no PR found`
  - head SHA if recoverable
  - merge state
  - cleanup date
  - cleanup reason
- Deleted branches must remain reconcilable from GitHub documentation and PR metadata.
