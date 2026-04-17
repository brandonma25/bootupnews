# AGENTS.md — Codex Operating Rules

## 1. Required Reading
Before ANY substantial implementation work, you MUST read:

- `docs/engineering/engineering-protocol.md`
- `docs/engineering/test-checklist.md`
- `docs/engineering/prd-template.md`
- `docs/engineering/release-machine.md`
- `docs/engineering/release-automation-operating-guide.md`

## Branch Discipline Rules (Mandatory)

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

## 8. Merge Conditions
- Do not recommend merge unless build passes, local validation is complete, preview validation is confirmed, and docs are updated.

## DOCUMENTATION SYSTEM RULE (MANDATORY)

This repository uses a strict documentation system to prevent bloat and maintain clarity.

### Source of Truth
- `PRD-XX` is the single source of truth for feature identity across the repo.
- `/docs/product/feature-system.csv` is the source of truth for feature order, status, dependencies, decisions, and PRD mapping.

### PRD Rules
- Every feature must have a unique PRD ID using the format `PRD-XX` where `XX` is the canonical numeric identifier.
- Each PRD ID maps to exactly one canonical PRD file:
  `/docs/prd/prd-XX-<feature-name>.md`
- Create a PRD only for meaningful system-level or multi-file features.
- Use `/docs/engineering/prd-template.md` when a PRD is needed.
- One PRD ID equals one document. Do not create multiple PRD versions. Update the existing canonical PRD instead.
- Before creating any PRD, Codex MUST:
  1. check `/docs/prd/` for an existing `PRD-XX` file
  2. check `/docs/product/feature-system.csv` for an existing `prd_id`
  3. update the existing document instead of creating a new file when that `prd_id` already exists
- If a new feature is created, Codex MUST:
  1. assign the next sequential `PRD-XX`
  2. create exactly one file at `/docs/prd/prd-XX-<feature-name>.md`
  3. register both `prd_id` and `prd_file` in `/docs/product/feature-system.csv`
- Codex MUST NOT create “architecture”, “system”, or “brief” documents in `/docs/prd/` for an existing PRD ID.
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
- Each `prd_id` in `/docs/product/feature-system.csv` must map to exactly one file in `/docs/prd/`.
- Each PRD filename in `/docs/prd/` must include its `PRD-XX` identifier.
- Codex must not create multiple PRD-level documents for the same feature identity.
- If duplicate PRD-level documentation is discovered, consolidate it into the canonical PRD or move non-PRD material into `/docs/engineering/`.
