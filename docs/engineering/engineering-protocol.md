# Daily Intelligence Aggregator — Engineering & Product Management Protocol

## System Authority
- `AGENTS.md` = execution rules enforced by Codex
- `engineering-protocol.md` = canonical system definition
- `test-checklist.md` = validation reference
- `prd-template.md` = planning standard
- `pull_request_template.md` = merge enforcement

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
- Every PRD must include:
- Objective
- Scope
- Explicit exclusions
- Acceptance criteria
- Risks
- Testing requirements
- Risks must explicitly consider:
- auth or session behavior
- SSR versus client mismatch
- environment mismatch
- data edge cases
- regression risk

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

## 9. Git and Branch Discipline
- One feature or fix per branch.
- No unrelated changes in the same branch.
- No direct experimentation in `main`.
- Merge only after validation and docs updates are complete.

## 10. Merge Checklist
- Branch is correct and isolated.
- Local validation passed.
- Preview validation passed.
- Docs updated.
- No blockers remain.

## 11. Debugging Protocol
- Classify the environment first.
- Classify the issue type next.
- Fix the issue at the lowest valid layer.
- Retest upward from local to preview to production sanity.

## 12. Documentation Security Policy
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

## 13. Expected Docs Structure
- `docs/prd-summaries/`
- `docs/bug-fixes/`
- `docs/testing/`

## 14. Enforcement Behavior
- Do not recommend merge when:
- preview validation is missing for env, auth, cookies, redirects, or SSR work
- required Playwright local automation has not been run for the branch scope
- required Playwright coverage is failing for the branch scope
- scope is mixed
- docs are missing
- build is broken
- known blockers remain
