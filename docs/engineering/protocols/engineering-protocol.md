# Daily Intelligence Aggregator — Engineering & Product Management Protocol

## System Authority
- `AGENTS.md` = execution rules enforced by Codex
- `engineering-protocol.md` = canonical system definition
- `test-checklist.md` = validation reference
- `prd-template.md` = planning standard
- `pull_request_template.md` = merge enforcement
- Google Sheets workbook `Features Table` = live feature-tracking status and intake source of truth
- `docs/product/feature-system.csv` = repo-side feature control layer for PRD mapping and build order

## 1. Core Operating Model
- The user is the PM and architect.
- Codex is the execution layer.
- Process integrity matters more than speed.
- Vercel preview is the truth layer for auth, cookies, redirects, SSR, and environment-variable behavior.
- Production is not the first debugging environment.

## 2. Product Layers
- Data Layer: Supabase schema, persistence, ingestion, and data contracts.
- Intelligence Layer: ranking, summarization, transformation, and application logic that turns raw data into useful intelligence.
- Experience Layer: Next.js routes, rendering, navigation, signed-in and signed-out behavior, and user-facing flows.
- One task should stay scoped to one layer unless the user explicitly approves cross-layer work.

## 3. PRD Standard
- PRD identity is governed by a unique `PRD-XX` ID, and that ID is the single source of truth for a feature across the repo.
- Google Sheets `Sheet1` is the governed live tracker for mapped work, and `Intake Queue` is the only quarantine lane for unmapped or ambiguous work.
- GitHub merge automation must never auto-create new governed rows in `Sheet1`; unmapped work goes to `Intake Queue`.
- Schema-aware feature-tracking automation must validate expected headers before writing, must use the immutable `Record ID` as the exact-match governed key, and must never write human-managed or computed columns.
- Before creating a PRD, Codex must check both `docs/product/prd/` and `docs/product/feature-system.csv` for an existing `PRD-XX`.
- If the PRD ID already exists, Codex must update the existing document instead of creating a new file.
- If the feature is new, Codex must assign the next sequential `PRD-XX`, create exactly one canonical file at `docs/product/prd/prd-XX-<feature-name>.md`, and register the mapping in `docs/product/feature-system.csv`.
- Canonical PRD filenames must use lowercase kebab-case and zero-padded numbering for `1` through `9`, for example `prd-01-...`, `prd-09-...`, `prd-10-...`.
- `docs/product/feature-system.csv` must include `prd_id` and `prd_file` so every feature maps to exactly one PRD file.
- `docs/product/prd/` is reserved for canonical PRDs only. Architecture notes, system briefs, and supporting implementation docs belong in `docs/engineering/` unless they are part of the canonical PRD itself.
- Every PRD must include:
- Objective
- User problem
- Scope
- Non-goals
- Implementation shape or system impact
- Dependencies and risks
- Acceptance criteria
- Evidence and confidence note for backfilled or historically reconstructed PRDs

## 3a. Documentation Routing Standard
- Optimize for truthful minimum documentation. Do not preserve misleading folder placement just because it already exists.
- Product control docs stay at `docs/product/`.
- Product briefs for meaningful feature work live at `docs/product/briefs/`.
- Canonical numbered PRDs live at `docs/product/prd/`.
- Meaningful defect records live at `docs/engineering/bug-fixes/`.
- Meaningful governance, process, release, or workflow failures live at `docs/engineering/incidents/`.
- Meaningful audits, migrations, consolidations, taxonomy changes, and repo-structure updates live at `docs/engineering/change-records/`.
- Meaningful validation reports and execution notes live at `docs/engineering/testing/`.
- Rules, checklists, templates, and standards live at `docs/engineering/protocols/`.
- "Meaningful" means the work materially changes behavior, implementation shape, operational expectations, or future maintenance understanding. Small copy tweaks and tiny mechanical edits do not need standalone docs.
- If a work item needs more than one supporting doc, choose the smallest truthful set instead of duplicating the same narrative in multiple places.

## 4. Codex Prompt Standard
- Every substantial prompt must include:
- branch decision
- scope boundaries
- protected files or systems
- testing instructions
- expected behavior
- documentation update requirement
- sanitization rule

## 5. Dev Server Rule
- Before starting the dev server:
- check port `3000`
- kill any existing process if needed
- then run `npm run dev`

## 6. Validation Sequence
- Validation order is `Local -> Vercel Preview -> Production`.
- Local is for code correctness, rendering checks, and fast debugging.
- Playwright is the default automated E2E and functional testing layer for UI flows, smoke coverage, and regression coverage.
- Preview is the real deployment-like truth layer.
- Production is for final sanity checks only.
- If auth, cookies, redirects, SSR, or environment logic has not been tested in preview, it is not validated.

## 7. Default Automated Testing Block
- Codex should run:
- `npm install`
- `npm run lint || true`
- `npm run test || true`
- `npm run build`
- the Dev Server Rule
- `npm run dev`
- Playwright is the default local E2E and functional automation layer for UI flows.
- After coding is complete, Codex should run the local Playwright workflow when technically possible.
- Minimum required local Playwright paths are `npx playwright test --project=chromium` and `npx playwright test --project=webkit`.
- Codex should broaden to `npx playwright test` when the feature scope meaningfully affects multiple UI flows.
- Release-sensitive browser coverage should prioritize Chromium baseline correctness plus WebKit smoke coverage for Safari-class behavior.
- Deterministic auth/session smoke should cover signed-out truth, auth entry state, and callback-error or redirect handling when those checks are safely automatable.
- basic smoke validation
- a concise test report
- a repo-safe docs update
- Build failure is blocking.
- Lint and test failures must be reported explicitly.
- Codex must report the exact commands run, Local URL, Playwright results, preview-required checks, and human-only checks.
- Local Playwright passing does not replace preview validation for auth, cookies, redirects, SSR, or env-sensitive behavior.

## 8. Human Validation Requirements
- The user must validate in preview when relevant:
- OAuth flow
- session persistence
- redirects
- signed-in versus signed-out truth
- SSR behavior
- env-dependent behavior
- After merge to `main`, the user must perform a concise production sanity check.
- Preview remains the source of truth for auth, cookies, redirects, SSR, and environment-specific behavior.
- Production is not a debugging ground.

## 9. Branching Strategy and Branch Cleanup Policy
- This policy exists to keep scope isolated, reduce merge confusion, prevent branch sprawl, and make it obvious which branch owns each feature, fix, or documentation update.
- One feature or fix equals one branch.
- Never stack new work on top of an older feature branch.
- If branch purpose overlaps another active branch, stop and resolve branch strategy before coding.

### Naming Patterns
- `feature/prd-<number>-<short-name>`
- `fix/<short-name>`
- `docs/<short-name>`
- `chore/<short-name>`

### Clean Start Requirement
- Always start clean from updated `main`.
- Use this exact flow before creating a new branch:

```bash
cd "/Users/bm/Documents/daily-intelligence-aggregator-main"
pwd
git checkout main
git pull
git checkout -b feature/prd-<number>-<short-name>
```

### Non-Negotiable Rules
- Never push WIP, backup, or final-state helper branches such as `*-wip`, `*-backup`, or `*-final`.
- If more work is needed for the same feature or fix and that branch has not been merged, continue on the same branch.
- If the prior branch for that feature or fix has already been merged, start again from updated `main` and create the correct new branch for the next scoped task.
- Do not create a new branch when the work actually belongs to an already-active branch for the same exact feature or fix.

### Wrong vs Correct Examples
- Wrong: implementing PRD-12 on `feature/prd-11-auth-hardening`
- Correct: implementing PRD-12 on `feature/prd-12-<short-name>`
- Wrong: finishing a bug fix on `fix/login-timeout-final`
- Correct: finishing the bug fix on `fix/login-timeout`
- Wrong: starting docs governance work on `feature/prd-18-dashboard`
- Correct: starting docs governance work on `docs/branching-strategy-governance`
- Wrong: creating `feature/prd-14-data-ingest-backup` because the branch feels risky
- Correct: keep the single scoped branch and rely on commits and PR review instead of backup branches

### Post-Merge Cleanup Requirement
- Delete merged branches immediately after merge, both locally and remotely.
- Use this exact cleanup flow:

```bash
git checkout main
git pull
git branch -d feature/<name>
git push origin --delete feature/<name>
```

### Prompt Requirement For Future Development
- Every future development prompt must explicitly state whether to use an existing branch or create a new one.
- Every future development prompt must explicitly state the exact branch name.
- Every future development prompt must explicitly state why that branch choice is correct.
- Every future development prompt must explicitly state the cleanup step required after merge.

## 10. Git and Branch Discipline
- One feature or fix per branch.
- No unrelated changes in the same branch.
- No direct experimentation in `main`.
- Merge only after validation and docs updates are complete.

## 10a. Governance Hotspot Workflow
- Treat `docs/product/feature-system.csv`, `AGENTS.md`, `docs/engineering/protocols/engineering-protocol.md`, `docs/engineering/protocols/prd-template.md`, and `docs/product/documentation-rules.md` as serialized hotspot files.
- Hotspot changes should be short-lived and should sync with `origin/main` immediately before PR creation and again before merge.
- Avoid parallel hotspot branches when possible; if overlap exists, prefer rebasing or stacking on the latest branch instead of letting both drift.
- If a hotspot PR becomes stale, it should usually be superseded by port-forwarding the still-needed logic into a fresh branch from `main` instead of force-merging the stale branch.
- See `docs/engineering/protocols/governance-gate-map.md` for governance tiering, hotspot ownership, and file responsibility boundaries.

## 10b. Sequential Prompt Execution Protocol

This section governs the approved pattern for PM-directed multi-prompt
execution plans. It does not override the one-branch-per-feature rule — it
clarifies how that rule applies when multiple prompts are pre-authored and
executed sequentially.

### When This Pattern Applies
A Sequential Prompt Execution Plan is approved when all of the following
are true:
- The PM has pre-authored a set of prompts in a defined execution order
- Each prompt is explicitly scoped to exactly one branch
- Each prompt targets a single isolated feature, fix, or documentation update
- The prompts are executed one at a time, not in parallel
- Each branch is merged and main is pulled before the next prompt begins

### Rules That Apply Within This Pattern
- Every prompt in the plan must include: branch decision, branch name,
  branch reason, scope boundaries, protected files, PRD requirement,
  implementation steps, testing instructions, expected behavior,
  documentation update requirement, sanitization rule, and cleanup step
- The one-branch-per-feature rule still applies within each prompt —
  a single prompt may not mix unrelated features onto one branch
- Dependency order must be stated explicitly in the plan and respected
  during execution — a prompt that depends on a prior merge must not
  begin until that merge is confirmed
- No prompt in the plan may be skipped unless the PM explicitly approves
  the skip and the dependency chain is re-evaluated
- If a prompt fails validation or build, that prompt must be resolved
  before the next prompt begins — do not advance the plan on a broken state

### What This Pattern Explicitly Does Not Allow
- Parallel branch execution across multiple prompts simultaneously
- Stacking a new prompt on top of an unmerged prior branch
- Combining two sequential prompts into a single branch to save time
- Starting prompt N+1 before prompt N is merged into main

### Codex Behavior Under This Pattern
- At the start of each prompt, Codex must confirm it is starting from
  updated main by running: git checkout main && git pull
- Codex must state which prompt number it is executing and confirm the
  prior prompt's branch has been merged before proceeding
- If Codex cannot confirm the prior merge, it must stop and ask the PM
  to confirm before continuing
- Codex must not infer or assume merge status — it must verify

### PM Responsibility Under This Pattern
- The PM is responsible for providing the full sequential prompt plan
  before execution begins
- The PM must confirm each merge before instructing Codex to proceed to
  the next prompt
- The PM must not instruct Codex to skip validation steps to accelerate
  the plan

## 10c. Local Repo and Worktree Discipline

- The canonical local project root is `/Users/bm/Documents/daily-intelligence-aggregator-main`.
- Do not use `/Users/bm/Documents/Daily news intel aggregator` for Git or Codex work; it is a symlink alias and increases directory-confusion risk.
- Before installs, edits, tests, refactors, or any prompt step that assumes branch context, Codex must confirm the active workspace identity.
- Before every Git or Codex task, run:

```bash
pwd
git branch --show-current
git status
git worktree list
```

- Codex must report the current folder, current branch, full worktree list, whether the requested branch is already owned by another worktree, and whether the current session is attached to the correct owning worktree for the task.
- If the requested branch is already used by another worktree, Codex must not run `git checkout` for that branch, must not use `--ignore-other-worktrees`, must not create a duplicate worktree for the same branch, and must stop and instruct the user to open or use the owning worktree directly.
- All work on an existing feature, fix, docs, or chore branch must happen inside that branch's owning worktree folder.
- Use additional worktrees only when intentionally isolating parallel branch work.
- Before removing any worktree, run `git status --short` inside that exact worktree.
- Never auto-clean a worktree that contains modified or untracked files; preserve ambiguous work before cleanup.

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

## 11. Merge Checklist
- Branch is correct and isolated.
- Local validation passed.
- Preview validation passed.
- Docs updated.
- No blockers remain.

## 12. Debugging Protocol
- Classify the environment first.
- Classify the issue type next.
- Fix the issue at the lowest valid layer.
- Retest upward from local to preview to production sanity.

## 13. Documentation Security Policy
- Allowed:
- PRD summaries
- feature briefs
- bug-fix summaries
- testing notes
- Forbidden:
- secrets
- tokens
- OAuth credentials
- auth vulnerabilities
- exploit steps
- sensitive logs
- cookies
- headers
- callback payloads
- infrastructure weaknesses
- Decision rule: "Does this help a future maintainer more than an attacker?"

## 14. Expected Docs Structure
- `docs/product/`
- `docs/product/prd/`
- `docs/product/briefs/`
- `docs/engineering/bug-fixes/`
- `docs/engineering/incidents/`
- `docs/engineering/change-records/`
- `docs/engineering/testing/`
- `docs/engineering/protocols/`

## 15. Enforcement Behavior
- Do not recommend merge when:
- preview validation is missing for env, auth, cookies, redirects, or SSR work
- required Playwright local automation has not been run for the branch scope
- required Playwright coverage is failing for the branch scope
- scope is mixed
- docs are missing
- build is broken
- known blockers remain
- For bug-fix-signaled work, the truthful documentation lane is usually `docs/engineering/bug-fixes/`; see `docs/engineering/protocols/bug-tracking-governance.md`.
