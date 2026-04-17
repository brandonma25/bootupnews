# Daily Intelligence Aggregator — Engineering & Product Management Protocol

## System Authority
- `AGENTS.md` = execution rules enforced by Codex
- `engineering-protocol.md` = canonical system definition
- `test-checklist.md` = validation reference
- `prd-template.md` = planning standard
- `pull_request_template.md` = merge enforcement
- `docs/product/feature-system.csv` = feature control layer and build order source of truth

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
- Before creating a PRD, Codex must check both `docs/product/prd/` and `docs/product/feature-system.csv` for an existing `PRD-XX`.
- If the PRD ID already exists, Codex must update the existing document instead of creating a new file.
- If the feature is new, Codex must assign the next sequential `PRD-XX`, create exactly one canonical file at `docs/product/prd/prd-XX-<feature-name>.md`, and register the mapping in `docs/product/feature-system.csv`.
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
- Minimum required local Playwright path is `npx playwright test --project=chromium`.
- Codex should broaden to `npx playwright test` when the feature scope meaningfully affects multiple UI flows.
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
