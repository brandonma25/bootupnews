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
  - route probes for `/` and `/dashboard`
- Build failure is blocking.
- Lint, unit-test, and Playwright failures are reported explicitly and still return a non-zero exit code.

### 2. PR Gate
- Workflow: [ci.yml](/Users/bm/Documents/daily-intelligence-aggregator-main/.github/workflows/ci.yml)
- Required protected-branch checks:
  - `pr-lint`
  - `pr-unit-tests`
  - `pr-build`
  - `pr-e2e-chromium`
  - `pr-summary`
  - `release-governance-gate`
- These jobs automate install, lint, build, unit/integration tests, Chromium Playwright smoke coverage, artifact upload, and PR summary generation.

### 2a. Release Governance Gate
- Workflow: [release-governance-gate.yml](/Users/bm/Documents/daily-intelligence-aggregator-main/.github/workflows/release-governance-gate.yml)
- Script entrypoint: `python scripts/release-governance-gate.py`
- Reuses the feature-system CSV validator and inspects the PR diff.
- Classification:
  - docs-only
  - trivial-code-change
  - material-feature-change
  - new-feature-or-system
- Enforcement:
  - docs-only changes pass when CSV validation still passes
  - trivial code changes pass when CSV validation still passes
  - material feature or system changes require at least one supporting docs update in `docs/product/briefs/`, `docs/product/prd/`, `docs/engineering/bug-fixes/`, `docs/engineering/incidents/`, `docs/engineering/change-records/`, `docs/engineering/testing/`, or `docs/engineering/protocols/`
  - new feature or system changes require a canonical `PRD-XX` file in `docs/product/prd/` plus a matching `docs/product/feature-system.csv` mapping

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

### 4. Human Auth/Session Gate
- Checklist: [human-auth-session-gate.md](/Users/bm/Documents/daily-intelligence-aggregator-main/docs/engineering/protocols/human-auth-session-gate.md)
- Human-only truth remains required for:
  - Google OAuth/provider login
  - callback redirect correctness
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

### 6. Release Documentation Gate
- Template scaffolder: `npm run release:docs -- --slug your-release-slug --title "Your Release Title"`
- Reusable templates live in:
  - [docs/engineering/testing/templates/release-testing-report-template.md](/Users/bm/Documents/daily-intelligence-aggregator-main/docs/engineering/testing/templates/release-testing-report-template.md)
  - [docs/engineering/bug-fixes/templates/release-bug-fix-template.md](/Users/bm/Documents/daily-intelligence-aggregator-main/docs/engineering/bug-fixes/templates/release-bug-fix-template.md)
  - [docs/product/briefs/templates/release-brief-template.md](/Users/bm/Documents/daily-intelligence-aggregator-main/docs/product/briefs/templates/release-brief-template.md)

## Automated Versus Human
### Automated
- dependency install
- lint
- unit/integration tests
- build
- local Chromium Playwright smoke
- preview route probe
- production route probe
- PR summary generation
- release doc scaffolding
- protected-branch required checks

### Human
- provider/OAuth truth
- callback truth
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
- GitHub branch protection should require the PR checks listed above.
- Vercel preview automation must provide a preview URL to the Preview Gate workflow.
- GitHub repo variable `PRODUCTION_BASE_URL` should point at the canonical production URL for automatic post-merge verification.
- No secrets are stored in repo scripts or workflows; placeholder env values are used for build-safe automation.

## Documentation Placement
- Release automation is governed as engineering documentation, not as a standalone PRD family.
- Supporting architecture notes, operating guides, and rollout briefs must live in `docs/engineering/change-records/`, `docs/engineering/protocols/`, `docs/engineering/testing/`, or `docs/engineering/bug-fixes/` as appropriate.
- `docs/product/prd/` should contain only canonical `PRD-XX` feature documents.
