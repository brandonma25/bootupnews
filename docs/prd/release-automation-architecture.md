# Release Automation Architecture — Release Brief

## Objective
- Build a reusable release architecture for this repo that automates the majority of release validation while preserving a deliberate human gate for auth/session truth and final merge approval.

## Scope
- Add a single local release-validation entrypoint.
- Upgrade GitHub Actions PR validation so protected-branch checks are explicit and reusable.
- Add preview and production route verification entrypoints.
- Add reusable human auth/session and release-doc templates.
- Document the release operating model and required external setup.
- Align the newer `release-machine` protocol wrappers on `main` with the stronger release automation system so future Codex work follows one consistent release path.

## Explicit Exclusions
- Real third-party OAuth automation with personal accounts
- Subjective UX judgment
- Bypassing protected branch rules

## Acceptance Criteria
- Local, PR, preview, and production release gates are defined and reusable.
- Human auth/session truth remains explicit and required.
- Release documentation can be scaffolded quickly for future releases.
- GitHub branch protection can reference clear PR check names.
- Preview and production verification can run without repo secrets by accepting a base URL as input.
- `AGENTS.md` requires release-machine guidance and release-automation guidance by default before serious implementation work.
- The standard wrapper entrypoints from `release-machine.md` delegate to the same underlying release automation instead of drifting separately.

## Risks
- Auth or session risk:
- Automated probes cannot prove real provider login truth, callback truth with a live third-party account, or refresh persistence after a real browser session.
- SSR versus client mismatch risk:
- Signed-out route probes catch obvious deployment failures, but preview remains the truth layer for env-sensitive SSR behavior.
- Environment mismatch risk:
- GitHub Actions and local scripts use build-safe placeholder env values; preview and production still depend on Vercel/Supabase configuration outside the repo.
- Data edge case risk:
- Route probes are intentionally lightweight and do not replace deeper product-specific E2E coverage.
- Regression risk:
- Branch protection must be updated to require the new PR jobs, or merge discipline can drift from the documented architecture.

## Testing Requirements
- Local validation:
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run release:local`
- Preview validation:
- `npm run release:preview -- --base-url <preview-url>`
- human auth/session checklist in preview
- Production sanity:
- `npm run release:production -- --base-url <production-url>` or the post-merge workflow on `main`

## Documentation Updates Required
- `docs/prd/`
- `docs/testing/`
- `docs/bug-fixes/`
- `docs/engineering/release-automation-operating-guide.md`
