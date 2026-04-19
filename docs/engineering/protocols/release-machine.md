# Release Machine Protocol

## Purpose
This file defines the mandatory release system for all future feature work, bug fixes, consolidations, and releases.

Codex must follow this system by default. It is not optional and must not be skipped merely because a task seems small.

If this file is not followed, any merge recommendation or release recommendation is invalid.

---

## 1. When This Applies
This protocol applies to:
- any new feature branch
- any bug-fix branch
- any UI-affecting change
- any auth, routing, SSR, cookie, session, or environment-sensitive change
- any PR opened against `main`
- any release or production promotion

---

## 2. Required Branch Decision
Before implementation starts, Codex must explicitly decide and report:
- whether to use an existing branch or create a new one
- why that branch decision is correct
- what scope is included
- what scope is excluded

Rules:
- one feature or fix per branch unless this is an intentional consolidation branch
- do not mix unrelated work
- do not work directly on `main`
- do not treat dirty local state as release-ready work

---

## 3. Mandatory Release Gates
Every serious implementation must move through these gates in order.

### Gate 1 — Local Gate
Codex must run the repo's local validation entrypoint before recommending PR creation or merge.

Minimum required validation:
- dependency install
- lint
- build
- tests
- Chromium and WebKit Playwright smoke when technically appropriate
- local smoke validation

### Gate 2 — Preview Gate
For any web-visible change, Codex must validate the deployed preview environment.

Preview validation must focus on:
- homepage rendering
- dashboard rendering
- SSR behavior
- signed-out truth
- redirects / callbacks when automatable
- environment-sensitive regressions

### Gate 3 — Human Auth/Session Gate
Codex must require human validation for:
- Google OAuth or other provider login
- callback redirect truth
- session persistence after refresh
- signed-in vs signed-out truth across navigation
- sign-out correctness

### Gate 4 — PR Gate
Changes to `main` must land through a pull request if branch protection requires it.

Codex must not treat a local-only merge into `main` as success.

### Gate 5 — Production Verification Gate
After a PR merges into `main`, Codex must verify production health.

Minimum production verification:
- homepage `/`
- dashboard `/dashboard`
- HTTP 200
- no obvious 500/deployment failure
- SSR content returns correctly

### Gate 6 — Documentation Gate
For every serious feature, fix, consolidation, or release, Codex must update concise repo-safe docs.

### Gate 7 — Tracker Closeout Gate
Before a task is considered complete, Codex must update the Google Sheets workbook `Features Table`.

Required tracker closeout:
- If direct Sheets access is available, update the existing mapped row and verify the row after writing.
- If the work is unmapped or ambiguous, route it to the appropriate review lane instead of creating a duplicate governed row.
- If direct Sheets access is unavailable, create a concise fallback tracker-sync markdown file in `docs/operations/tracker-sync/` with the exact manual update payload.
- Do not mark the task complete until the live sheet is verified or the fallback file exists.

---

## 4. Required Commands and Entrypoints
Codex must prefer repo entrypoints/scripts over ad hoc command sequences whenever the repo provides them.

Mandatory standard entrypoints:
- `./scripts/release-check.sh`
- `node scripts/preview-check.js <preview-url>`
- `node scripts/prod-check.js <production-url>`

If these scripts exist, Codex must use them by default for release validation and verification.

If such scripts are missing or broken, Codex may run equivalent commands temporarily, but should favor restoring the standard entrypoints over repeating one-off command chains.

---

## 5. Dev Server Rule
Before starting any dev server, Codex must:
1. cd into the correct repo folder
2. run `pwd`
3. check for existing Next.js / node dev-server processes
4. kill conflicting processes
5. start the dev server only after cleanup
6. report the exact Local URL from terminal output

---

## 6. What Must Be Automated
Codex should automate as much of the release system as possible.

Target automation includes:
- local validation
- PR validation in CI
- preview route checks
- production route checks
- release note / testing note drafts
- merge eligibility checks

---

## 7. What Must Remain Human
Codex must not pretend these are fully automated if they are not.

Human-only checks include:
- real provider login
- real provider callback truth
- real session persistence
- real sign-out correctness
- subjective UX judgment where appropriate

---

## 8. Merge Rules
Codex must not recommend merge into `main` unless:
- local gate is acceptable
- preview gate is acceptable
- human auth/session gate is satisfied when relevant
- docs are updated
- the branch is safer than current `main`

If any gate is incomplete, Codex must clearly state the blocker.

---

## 9. Required Docs After Serious Work
Codex must update or create concise repo-safe docs for:
- testing summary
- bug-fix summary when applicable
- feature / PRD summary when applicable
- project status if the repo state materially changed

Docs must be:
- concise
- structured
- maintenance-friendly
- safe for a public repo

---

## 10. Output Requirements
For serious implementation or release work, Codex should report in a structured way:
1. branch decision
2. files changed
3. validation performed
4. preview status
5. human-only checks still needed
6. Google Sheets tracker status or fallback tracker-sync file
7. merge decision
8. exact git result
9. docs updated

---

## 11. Reusable Codex Closeout Block
Before closing this task, update the Google Sheets tracker. If direct update is unavailable, create a tracker-sync markdown file in the repo with the exact manual update payload. Do not mark the task complete until one of these two paths is done.

---

## 12. Failure Rule
If Codex skips these release gates, any merge recommendation is invalid.
