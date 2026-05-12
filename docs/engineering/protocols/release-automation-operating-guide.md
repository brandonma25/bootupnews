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

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`.
- Use Article, Story Cluster, Signal, Card, and Surface Placement according to the canonical definitions.
- Do not use cluster, signal, story, or card interchangeably.
- [ ] Confirmed object level before coding: Article, Story Cluster, Signal, Card, or Surface Placement.
- [ ] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [ ] If legacy naming is inconsistent, document it instead of silently expanding it.

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

### 1a. Retired Google Tracker Compatibility
- Removed workflow: `.github/workflows/github-sheets-status-sync.yml`
- Removed script entrypoint: `node scripts/github-sheets-sync.mjs --event pr-merge --payload-file <path>`
- Current rule:
  - `docs/product/prd/` and `docs/product/feature-system.csv` remain the product source of truth for feature identity, scope, and registry metadata.
  - `DECISIONS.md` is the public home for durable product and engineering decisions.
  - PR bodies, PR checklists, GitHub metadata, and external/private archives are the home for per-run release evidence and operational detail.
  - Google Sheet / Google Work Log records are retired as source-of-truth systems and may be used only as historical reference inputs.
  - Codex must not update Google Sheets, claim tracker updates, or create routine public tracker records for closeout.
  - The old sync script, tests, and workflow have been removed; this guide does not treat Google Sheets sync as a release gate or compatibility runner.

### 2. PR Gate
- Workflow: `.github/workflows/ci.yml`
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
- Workflow: `.github/workflows/release-governance-gate.yml`
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
  - material feature or system changes require at least one supporting public-safe docs update in `docs/product/briefs/`, `docs/product/prd/`, `docs/engineering/bug-fixes/`, `docs/engineering/incidents/`, `docs/engineering/protocols/`, `docs/engineering/templates/`, `docs/product/documentation-rules.md`, `DECISIONS.md`, or `AGENTS.md`
  - new feature or system changes require a canonical `PRD-XX` file in `docs/product/prd/` plus a matching `docs/product/feature-system.csv` mapping
  - audit/remediation-backed additions may use a stable governance artifact instead of a new canonical PRD only when the artifact explicitly states that a canonical PRD is not required and cites an audit or remediation source of truth
  - material hotspot work must also update governance-facing documentation and contain the latest `origin/main` commit
  - new scripts or workflow files are treated as material governance changes by default, not as new feature/system declarations by themselves

### 3. Preview Gate
- Workflow: `.github/workflows/preview-gate.yml`
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
- Checklist: `docs/engineering/protocols/human-auth-session-gate.md`
- Human-only truth remains required for:
  - Google OAuth/provider login
  - real-provider callback redirect correctness
  - session persistence after refresh
  - signed-in versus signed-out truth across navigation
  - sign-out correctness
  - final product judgment on auth-sensitive behavior

### 5. Production Verification Gate
- Workflow: `.github/workflows/production-verification.yml`
- Script entrypoint: `npm run release:production -- --base-url https://app.example.com`
- Standard wrapper: `node scripts/prod-check.js https://app.example.com`
- Runs after merge to `main` or manually with a supplied production URL.
- Confirms `/` and `/dashboard` return `200` and do not expose obvious deployment failure markers.
- Prior Google Sheets promotion behavior has been removed from the workflow. Production verification results should be recorded in the PR body, PR checklist, GitHub metadata, or an external/private archive when operational detail is needed.

### 6. Release Documentation Gate
- Evidence summary generator: `npm run release:docs -- --slug your-release-slug --title "Your Release Title"`
- `scripts/release/generate-release-docs.mjs` emits PR-body-ready release evidence to stdout by default.
- Use `--output <path>` only when an explicit file destination is needed; the script does not default to a public operational docs folder.
- Reusable governance process lives in `docs/engineering/templates/llm-prompt-template-change-classification.md`.

### 7. Closeout Checklist
- Scope completed.
- [ ] Terminology check completed against `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`.
- [ ] Confirmed object level before coding: Article, Story Cluster, Signal, Card, or Surface Placement.
- [ ] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [ ] If legacy naming is inconsistent, document it instead of silently expanding it.
- Tests run and results recorded.
- Local validation complete.
- Preview validation complete when applicable.
- Production sanity check run only after preview is good.
- Product source-of-truth updates completed in `docs/product/prd/` and `docs/product/feature-system.csv` when applicable.
- Bug-fix report stored in repo when the change fixes a durable defect.
- Release evidence recorded in the PR body, PR checklist, GitHub metadata, or an external/private archive when operational detail is needed.
- `docs/product/feature-system.csv` updated when PRD/feature metadata changed.
- No Google Sheet update or routine public tracker fallback was claimed.

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
- release evidence summary generation
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
  - release evidence is recorded in the appropriate PR or durable public artifact
  - no known blockers remain

## Required External Configuration
- GitHub branch protection must require the PR checks listed above.
- Vercel preview automation must provide a preview URL to the Preview Gate workflow.
- GitHub repo variable `PRODUCTION_BASE_URL` is optional overall and should point at the canonical production URL only if automatic post-merge verification is desired.
- Retired third-party sync secrets are no longer part of the active source-of-truth closeout model.
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
- Supporting architecture notes, operating guides, and durable reviewer-facing process artifacts should live in `docs/engineering/protocols/`, `docs/engineering/templates/`, `docs/engineering/bug-fixes/`, `DECISIONS.md`, or product source-of-truth docs as appropriate.
- Per-run validation transcripts, closeout records, and operational details should live in PR bodies, GitHub metadata, or external/private archives unless a stable public artifact is explicitly needed.
- `docs/product/prd/` should contain only canonical `PRD-XX` feature documents.
