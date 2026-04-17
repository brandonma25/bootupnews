# Release Automation System — Internal PRD

## Title
- Release Automation System

## Objective
- Establish a reusable release machine for this repo so most release validation is automated, while auth/session truth and final merge approval remain explicitly human-gated.

## Problem
- Release readiness has been inconsistent across branches because validation, preview checks, docs, and merge-readiness reporting were previously spread across ad hoc commands and partial workflows.

## Why This System Is Needed
- The repo has protected-branch PR requirements, Vercel preview deployments, and auth/session behavior that cannot be treated as fully local-only concerns.
- A standard release machine reduces missed checks, makes Codex behavior more predictable, and keeps future rollout work aligned with the repo’s protocol.

## In Scope
- Local release validation entrypoint
- PR validation workflow
- Preview route verification
- Production route verification
- Release templates and concise testing/bug-fix docs
- Human auth/session checklist
- Repo guidance that tells Codex to follow the release machine by default

## Out Of Scope
- Real third-party OAuth automation with personal accounts
- Subjective UX sign-off
- Bypassing protected branch rules
- Storing tokens, cookies, headers, or secrets in the repo

## Release Stages / Gates
- Local Gate
- Preview Gate
- Human Auth / Session Gate
- PR Gate
- Production Verification Gate
- Documentation Gate

## What Is Automated
- dependency install
- lint
- unit/integration tests
- build
- local Playwright smoke coverage
- local route probes
- PR CI checks
- preview route checks
- production route checks
- release doc scaffolding
- PR summary generation

## What Remains Human-Only
- Google OAuth or provider-login truth
- callback redirect truth
- session persistence after refresh
- signed-in versus signed-out truth across navigation
- sign-out correctness
- final product judgment for auth-sensitive behavior

## GitHub / Vercel Dependencies
- GitHub branch protection must require the PR gate jobs
- GitHub credentials used for rollout must have `workflow` scope if `.github/workflows/*` changes are being pushed
- GitHub repo variable `PRODUCTION_BASE_URL` is required for automatic post-merge production verification
- Vercel preview automation must provide a preview URL to the preview gate workflow or manual dispatch

## Success Criteria
- `main` contains the release automation scripts, workflows, templates, and guidance
- Codex is required to read release-machine guidance before serious implementation work
- Standard entrypoints exist and work:
  - `./scripts/release-check.sh`
  - `node scripts/preview-check.js <preview-url>`
  - `node scripts/prod-check.js <production-url>`
- Future serious branches can follow one repeatable release path without ad hoc reinvention

## Known Limitations
- Preview and production verification still depend on GitHub/Vercel runtime and environment wiring outside the repo
- Human auth/session checks cannot be fully automated safely
- Local validation in sandboxed environments may require elevated permissions to bind the dev server on port `3000`
