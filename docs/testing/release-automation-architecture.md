# Release Automation Architecture — Testing Report

## Release Metadata
- Date: 2026-04-17
- Branch: `codex/release-automation-architecture`
- PR: pending

## Commands Run
- `npm run release:local`
- `npm run release:preview -- --base-url <preview-url>`
- `npm run release:production -- --base-url <production-url>`

## Automated Results
- Local gate: passed after rerunning outside the sandbox so the dev server could bind to `127.0.0.1:3000`
- PR gate: workflow YAML validated locally with Ruby `YAML.load_file`; runtime execution still depends on GitHub Actions
- Preview gate: script/workflow implemented, but not run against a live Vercel preview in this session
- Production verification gate: script/workflow implemented, but not run against a live production URL in this session
- Standard wrapper entrypoints:
  - `bash scripts/release-check.sh` passed
  - `node scripts/preview-check.js http://127.0.0.1:3000` passed against a live local server
  - `node scripts/prod-check.js http://127.0.0.1:3000` passed against a live local server

## Human Auth / Session Results
- Google OAuth: not run locally; intentionally left as human-only preview validation
- Email/password: not run locally; intentionally left as human-only preview validation when auth-sensitive work is involved
- Callback redirect: not run locally; intentionally left as human-only preview validation
- Refresh persistence: not run locally; intentionally left as human-only preview validation
- Sign-out: not run locally; intentionally left as human-only preview validation

## Remaining Risks
- GitHub branch protection and Vercel handoff wiring still need to be configured outside the repo.
- The Next.js build emits an existing workspace-root warning because another lockfile exists above the repo root.
- `npm install` still reports one pre-existing high severity vulnerability that was not changed by this release-automation work.
- This branch is not yet on remote because the current Git credential still lacks the `workflow` scope required to push changes under `.github/workflows/`.
