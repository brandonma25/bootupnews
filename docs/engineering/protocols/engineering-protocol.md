# Daily Intelligence Aggregator — Engineering & Product Management Protocol

## System Authority
- `AGENTS.md` = execution rules enforced by Codex
- `engineering-protocol.md` = canonical system definition
- `test-checklist.md` = validation reference
- `prd-template.md` = planning standard
- `pull_request_template.md` = merge enforcement
- GitHub repo documentation = canonical source of truth for bug-fix, remediation, branch-cleanup, validation, release, and governance history
- `docs/product/feature-system.csv` = repo-side feature control layer for PRD mapping and build order
- Google Sheet / Google Work Log records = historical reference inputs only

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
- `docs/product/feature-system.csv` is the repo-side feature/PRD control file for mappings, build order, dependencies, decisions, and durable feature metadata.
- Google Sheet / Google Work Log records are not canonical and must not be updated for routine closeout.
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
- Branch cleanup reconciliation lives at `docs/operations/branch-cleanup/`.
- `docs/bugs/` and `docs/changes/` are deprecated and non-canonical. Do not add new records there.
- Durable history in deprecated folders must be migrated or consolidated into the canonical lane, leaving at most a redirect note.
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

## 4a. Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`.
- Use Article, Story Cluster, Signal, Card, and Surface Placement according to the canonical definitions.
- Do not use cluster, signal, story, or card interchangeably.
- Every substantial PRD or implementation prompt must identify which object level the work modifies: Article, Story Cluster, Signal, Card, or Surface Placement.
- New variable, file, function, component, and database terminology must not blur Cluster vs Signal vs Card.
- If legacy naming is inconsistent, document the mismatch instead of silently expanding it.

Implementation checklist:
- [ ] Confirmed object level before coding: Article, Story Cluster, Signal, Card, or Surface Placement.
- [ ] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [ ] If legacy naming is inconsistent, document it instead of silently expanding it.

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
cd "/Users/bm/dev/daily-intelligence-aggregator"
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
- Before deleting any remediation, bug-fix, hotfix, Codex, feature, or docs branch, capture the branch name, PR number or `no PR found`, recoverable head SHA, merge state, canonical documentation path, cleanup date, and cleanup reason.
- Bulk branch deletion events require a reconciliation record in `docs/operations/branch-cleanup/`.
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

- This rule prevents dirty-tree confusion, wrong-branch continuation, duplicate branch ownership, and accidental cross-lane contamination.
- The canonical local project root is `/Users/bm/dev/daily-intelligence-aggregator`.
- New worktrees for this repo should live under `/Users/bm/dev/worktrees/`.
- Treat old `/Users/bm/Documents/...` and iCloud wrapper paths as stale unless the user explicitly points back to them and Git identity checks prove they are real checkouts.
- A branch may have only one owning worktree at a time in normal operation. The owner is the path shown by `git worktree list`.
- Before installs, edits, tests, branch switches, continuation work, refactors, or any prompt step that assumes branch context, Codex must confirm the active workspace identity.
- Run this identity check first:

```bash
pwd
git branch --show-current
git status --short --branch
git worktree list
```

- Codex must report the current folder, current branch, full worktree list, whether the requested branch already exists, whether the requested branch is already owned by another worktree, and whether the current session is attached to the correct owning worktree for the task.
- If the requested branch is shown in `git worktree list` at another path, Codex must stop before installs, edits, tests, or branch switches, report the owning worktree path, and ask the user to continue from that folder.
- Codex must never run `git checkout` for a branch already owned by another worktree.
- Codex must never create a duplicate worktree for a branch already owned by another worktree.
- Codex must never use `--force` or `--ignore-other-worktrees` to bypass branch/worktree safety for ordinary repo work.
- If the current folder is not the requested branch's owning worktree, Codex must stop before making changes and switch to or create the correct worktree first.
- All work on an existing feature, fix, docs, or chore branch must continue inside that branch's owning worktree folder.
- If the correct owning worktree already exists, use it; do not improvise a new folder.
- New scoped work must start from updated `main` on exactly one freshly scoped branch.
- When using worktrees for new scoped work, create a dedicated named worktree for that branch from updated `main`.
- Use additional worktrees only when intentionally isolating branch work.
- Before removing any worktree, run `git status --short` inside that exact worktree.
- Never auto-clean a worktree that contains modified or untracked files; preserve ambiguous work before cleanup.

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

## 11. Merge Checklist
- Branch is correct and isolated.
- Local validation passed.
- Preview validation passed.
- Docs updated.
- [ ] Terminology check completed against `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`.
- [ ] Confirmed object level before coding: Article, Story Cluster, Signal, Card, or Surface Placement.
- [ ] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [ ] If legacy naming is inconsistent, document it instead of silently expanding it.
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
