# Release Automation Operating Guide

## Purpose
- Define the reusable release gate architecture for this repo.
- Keep roughly 90% of release validation automated while preserving a small human gate for auth/session truth and final merge approval.

## Branch Flow
- Create a scoped branch from `main`.
- Open a pull request back into `main`.
- Let PR automation complete before preview and human auth checks.
- Merge only after the automated gates pass, preview is verified, the human auth checklist is completed, and release docs are updated.
- Production verification happens after merge to `main`.

## Release Gates
### 1. Local Gate
- Command: `npm run release:local`
- Standard wrapper: `./scripts/release-check.sh`
- Runs deterministic local validation in repo protocol order:
  - `npm install`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - Dev Server Rule on port `3000`
  - `npx playwright test --project=chromium`
  - `npx playwright test --project=webkit`
  - route probes for `/` and `/dashboard`
- Build failure is blocking.
- Lint, unit-test, and Playwright failures are reported explicitly and still return a non-zero exit code.

### 1a. Feature Tracking Sync Gate
- Workflow: [github-sheets-status-sync.yml](/Users/bm/Documents/daily-intelligence-aggregator-main/.github/workflows/github-sheets-status-sync.yml)
- Script entrypoint: `node scripts/github-sheets-sync.mjs --event pr-merge --payload-file <path>`
- Permanent rules:
  - Google Sheets workbook `Features Table` is the live feature-tracking system.
  - Tracker update is part of Definition of Done for feature, fix, refactor, UX, and governance work.
  - `Sheet1` is the governed table for approved mapped work.
  - `Intake Queue` is the only destination for unmapped, spontaneous, or ambiguous merged work.
  - `Record ID` in `Sheet1` is immutable and may only be used as the exact-match lookup key.
  - The automation must validate the expected headers before writing and may update only approved automation-managed columns.
  - A merge to `main` may update one exact `Record ID` match to `Merged`.
  - A merge must never auto-create a new governed `Sheet1` row.
  - Codex closeout must verify a live sheet update, or create a fallback tracker-sync markdown file in `docs/operations/tracker-sync/` with the exact manual update payload.

### 2. PR Gate
- Workflow: [ci.yml](/Users/bm/Documents/daily-intelligence-aggregator-main/.github/workflows/ci.yml)
- Required protected-branch checks:
  - `pr-lint`
  - `pr-unit-tests`
  - `pr-build`
  - `pr-e2e-chromium`
  - `pr-e2e-webkit`
  - `pr-summary`
  - `release-governance-gate`
- GitHub branch protection must separately require those checks; the repo workflows alone do not make them blocking.
- These jobs automate install, lint, build, unit/integration tests, Chromium plus WebKit Playwright smoke coverage, artifact upload, and PR summary generation.

### 2a. Release Governance Gate
- Workflow: [release-governance-gate.yml](/Users/bm/Documents/daily-intelligence-aggregator-main/.github/workflows/release-governance-gate.yml)
- Script entrypoint: `python scripts/release-governance-gate.py`
- Shared classifier: `python scripts/governance_common.py` consumers
- Audit companion: `python scripts/pr-governance-audit.py`
- Standalone coverage validator: `python scripts/validate-documentation-coverage.py`
- Reuses the feature-system CSV validator and inspects the PR diff.
- In CI PR mode, the gate inspects only the explicit `base...head` PR diff so generated or untracked runner artifacts cannot change classification. Local validation remains allowed to include staged, unstaged, and untracked working-tree changes when run intentionally.
- Monitored change areas include `src/`, `supabase/`, `scripts/`, `.github/workflows/`, and key root config files such as `package.json`, `next.config.ts`, `playwright.config.ts`, and `tsconfig.json`.
- Classification:
  - docs-only
  - trivial-code-change
  - bug-fix
  - material-feature-change
  - new-feature-or-system
- Governance tiers:
  - baseline
  - documented
  - promoted
  - hotspot
- Enforcement:
  - docs-only changes pass when CSV validation still passes
  - trivial code changes pass when CSV validation still passes
  - bug-fix changes require the `docs/engineering/bug-fixes/` lane
  - material feature or system changes require at least one supporting docs update in `docs/product/briefs/`, `docs/product/prd/`, `docs/engineering/bug-fixes/`, `docs/engineering/incidents/`, `docs/engineering/change-records/`, `docs/engineering/testing/`, `docs/engineering/protocols/`, `docs/product/documentation-rules.md`, or `AGENTS.md`
  - new feature or system changes require a canonical `PRD-XX` file in `docs/product/prd/` plus a matching `docs/product/feature-system.csv` mapping
  - material hotspot work must also update governance-facing documentation and contain the latest `origin/main` commit
  - new scripts or workflow files are treated as material governance changes by default, not as new feature/system declarations by themselves

### 3. Preview Gate
- Workflow: [preview-gate.yml](/Users/bm/Documents/daily-intelligence-aggregator-main/.github/workflows/preview-gate.yml)
- Script entrypoint: `npm run release:preview -- --base-url https://preview.example.com`
- Standard wrapper: `node scripts/preview-check.js https://preview.example.com`
- Verifies:
  - `/`
  - `/dashboard`
  - HTTP `200`
  - expected signed-out markers
  - absence of obvious `500` or framework error pages
- This gate is intended to run once the Vercel preview URL is known.
- It remains required for merge readiness because PR CI cannot prove real preview cookies, SSR, redirects, or environment truth by itself.

### 4. Human Auth/Session Gate
- Checklist: [human-auth-session-gate.md](/Users/bm/Documents/daily-intelligence-aggregator-main/docs/engineering/protocols/human-auth-session-gate.md)
- Human-only truth remains required for:
  - Google OAuth/provider login
  - real-provider callback redirect correctness
  - session persistence after refresh
  - signed-in versus signed-out truth across navigation
  - sign-out correctness
  - final product judgment on auth-sensitive behavior

### 5. Production Verification Gate
- Workflow: [production-verification.yml](/Users/bm/Documents/daily-intelligence-aggregator-main/.github/workflows/production-verification.yml)
- Script entrypoint: `npm run release:production -- --base-url https://app.example.com`
- Standard wrapper: `node scripts/prod-check.js https://app.example.com`
- Runs after merge to `main` or manually with a supplied production URL.
- Confirms `/` and `/dashboard` return `200` and do not expose obvious deployment failure markers.
- On success, the workflow may run `node scripts/github-sheets-sync.mjs --event production-verify ...` to promote a uniquely matched Google Sheets row from `Merged` to `Built`.
- If production verification fails or no unique governed row exists, the status must remain `Merged`.
- The promotion job prefers the merged PR whose `merge_commit_sha` exactly matches the verified `main` commit and falls back to the broader associated-PR lookup only if needed.

### 6. Release Documentation Gate
- Template scaffolder: `npm run release:docs -- --slug your-release-slug --title "Your Release Title"`
- Reusable templates live in:
  - [docs/engineering/testing/templates/release-testing-report-template.md](/Users/bm/Documents/daily-intelligence-aggregator-main/docs/engineering/testing/templates/release-testing-report-template.md)
  - [docs/engineering/bug-fixes/templates/release-bug-fix-template.md](/Users/bm/Documents/daily-intelligence-aggregator-main/docs/engineering/bug-fixes/templates/release-bug-fix-template.md)
  - [docs/product/briefs/templates/release-brief-template.md](/Users/bm/Documents/daily-intelligence-aggregator-main/docs/product/briefs/templates/release-brief-template.md)

### 7. Closeout Checklist
- Scope completed.
- Tests run and results recorded.
- Local validation complete.
- Preview validation complete when applicable.
- Production sanity check run only after preview is good.
- PRD summary stored in repo when applicable.
- Bug-fix report stored in repo when applicable.
- Google Sheets tracker updated and verified.
- If direct Sheets update is unavailable, fallback tracker-sync file created in `docs/operations/tracker-sync/`.

## Automated Versus Human
### Automated
- dependency install
- lint
- unit/integration tests
- build
- local Chromium Playwright smoke
- local WebKit Playwright smoke
- deterministic auth entry, signed-out refresh, and callback-error redirect smoke
- preview route probe
- production route probe
- PR summary generation
- release doc scaffolding
- protected-branch required checks

### Human
- provider/OAuth truth
- real-provider callback truth
- session persistence after refresh
- sign-out truth
- final merge approval
- final product judgment for auth-sensitive behavior

## Merge Rule
- Merge to `main` is allowed only when:
  - local gate is complete
  - PR gate is green
  - preview gate is green
  - the human auth/session checklist is completed
  - release docs are updated
  - no known blockers remain

## Required External Configuration
- GitHub branch protection must require the PR checks listed above.
- Vercel preview automation must provide a preview URL to the Preview Gate workflow.
- GitHub repo variable `PRODUCTION_BASE_URL` is optional overall and should point at the canonical production URL only if automatic post-merge verification and `Merged -> Built` promotion are desired.
- GitHub secrets `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_SHEET_ID` must be configured for Google Sheets status sync.
- No secrets are stored in repo scripts or workflows; placeholder env values are used for build-safe automation.

## Branch Protection Verification Checklist
- Open the GitHub branch protection or ruleset configuration for `main`.
- Confirm that these checks are required with the exact names shown in PR checks:
  - `feature-system-csv-validation`
  - `pr-lint`
  - `pr-unit-tests`
  - `pr-build`
  - `pr-e2e-chromium`
  - `pr-e2e-webkit`
  - `pr-summary`
  - `release-governance-gate`
- Confirm the rule applies to pull requests targeting `main`.
- Confirm a failing required check blocks merge instead of allowing a maintainer merge-through by default.
- Re-verify on a real pull request by checking that the merge box reports required checks and refuses merge when one required check is failing.
- Repo evidence note:
  - PR #34 proved that the workflow could fail without blocking merge before branch protection was aligned.
  - PR #46 proved the corrected workflow and classifier ran successfully after the governance patch merged.

## Documentation Placement
- Release automation is governed as engineering documentation, not as a standalone PRD family.
- Supporting architecture notes, operating guides, and rollout briefs must live in `docs/engineering/change-records/`, `docs/engineering/protocols/`, `docs/engineering/testing/`, or `docs/engineering/bug-fixes/` as appropriate.
- `docs/product/prd/` should contain only canonical `PRD-XX` feature documents.
