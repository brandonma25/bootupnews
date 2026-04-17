# AGENTS.md — Codex Operating Rules

## 1. Required Reading
Before ANY substantial implementation work, you MUST read:

- `docs/engineering/engineering-protocol.md`
- `docs/engineering/test-checklist.md`
- `docs/engineering/prd-template.md`
- `docs/engineering/release-machine.md`

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
- `/docs/product/feature-system.csv` is the ONLY source of truth for:
  - feature list
  - priority
  - status
  - build order
  - decision (build / delay / kill)
  - dependencies

### PRD Rules
- Each feature has ONLY ONE canonical PRD file:
  `/docs/prd/prd-<number>-<short-name>.md`
- DO NOT create multiple PRD versions (no v2, final, updated files)
- If a PRD needs changes, UPDATE the existing file instead of creating a new one

### When to Create a PRD
Create a PRD ONLY if:
- the feature is system-level or multi-file
- the feature affects architecture or logic

DO NOT create PRDs for:
- UI tweaks
- copy changes
- minor fixes

### Feature Execution Rules
Before implementing ANY feature:
1. Read `/docs/product/feature-system.csv`
2. Select the next feature where:
   - `decision = build`
   - lowest `build_order`

After implementation:
1. Update:
   - status → Built
   - last_updated
2. Commit the updated CSV

### Anti-Bloat Rule
- DO NOT create redundant documentation
- DO NOT duplicate feature descriptions across files
- DO NOT create “summary”, “final”, or “v2” files

### Principle
One feature = one source of truth
