# Release Automation Architecture — Bug-Fix Report

## Release Metadata
- Date: 2026-04-17
- Branch: `codex/release-automation-architecture`
- PR: pending

## Issue Summary
- Problem addressed:
  Release validation for this repo was partly manual and spread across ad hoc commands, leaving merge readiness, preview checks, and release docs inconsistent from branch to branch.
- Root cause:
  The repo had basic CI and Playwright coverage, but no single release entrypoint, no reusable preview/production route verifier, no automated PR summary layer, and no concise operating doc describing what remained human-only.

## Fix Applied
- Exact change:
  Added a scripted local release gate, deploy route probes, release-doc scaffolding, PR summary generation, clearer GitHub Actions workflows, a human auth/session checklist, release templates, and a concise release operating guide. After `origin/main` advanced with the separate release-machine protocol, merged that protocol into this branch and wired its standard wrapper entrypoints (`scripts/release-check.sh`, `scripts/preview-check.js`, `scripts/prod-check.js`) to the stronger release automation implementation.
- Files modified:
  - `AGENTS.md`
  - `.github/workflows/ci.yml`
  - `.github/workflows/preview-gate.yml`
  - `.github/workflows/production-verification.yml`
  - `package.json`
  - `scripts/release/common.mjs`
  - `scripts/release/validate-local.mjs`
  - `scripts/release/verify-deployment.mjs`
  - `scripts/release/generate-release-docs.mjs`
  - `scripts/release/generate-pr-summary.mjs`
  - `scripts/release-check.sh`
  - `scripts/preview-check.js`
  - `scripts/prod-check.js`
  - `docs/engineering/release-automation-operating-guide.md`
  - `docs/engineering/release-machine.md`
  - `docs/testing/human-auth-session-gate.md`
  - `docs/testing/templates/release-testing-report-template.md`
  - `docs/bug-fixes/templates/release-bug-fix-template.md`
  - `docs/prd/templates/release-brief-template.md`
  - `docs/testing/release-automation-architecture.md`
  - `docs/bug-fixes/release-automation-architecture.md`
  - `docs/prd/release-automation-architecture.md`
  - `README.md`
  - `src/lib/data.auth.test.ts`
  - `src/components/auth/auth-modal.test.tsx`

## Validation
- Automated checks:
  - `npm install`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `ruby -e 'require "yaml"; ARGV.each { |path| YAML.load_file(path) }; puts "workflow yaml ok"' .github/workflows/ci.yml .github/workflows/preview-gate.yml .github/workflows/production-verification.yml`
  - `npm run release:local`
  - `bash scripts/release-check.sh`
  - `node scripts/preview-check.js http://127.0.0.1:3000`
  - `node scripts/prod-check.js http://127.0.0.1:3000`
- Human checks:
  - Not run in this session by design; auth/session truth remains a human preview gate.

## Remaining Risks / Follow-up
- The Preview Gate workflow still needs a preview URL handoff from Vercel or a manual dispatch step.
- Automatic production verification requires the GitHub repo variable `PRODUCTION_BASE_URL`.
- Branch protection must be updated to require the new PR jobs before the architecture is fully enforced.
- The current GitHub credential still lacks `workflow` scope, so this branch cannot be pushed or merged through GitHub from the current auth context yet.
