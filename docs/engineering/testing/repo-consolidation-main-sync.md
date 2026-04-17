# Repo Consolidation — Testing Report

## Branch Under Test
- `feature/repo-consolidation-main-sync`

## Commands Run
- `npm install`
- `npm run lint`
- `npm run build`
- `npm run test`
- `pwd`
- `ps aux | rg "next dev|node .*3000|npm run dev"`
- `lsof -iTCP:3000 -sTCP:LISTEN -n -P`
- `kill 35841 35860 35861`
- `npm run dev -- --hostname 127.0.0.1`
- `npx playwright test`

## Results
- `npm install`
  Passed. Dependency audit still reports `1 high severity vulnerability`.
- `npm run lint`
  Passed.
- `npm run build`
  Passed.
- `npm run test`
  Passed.
  - `24` test files passed
  - `113` tests passed
- `npx playwright test`
  Passed once the repo dev server was running on port `3000`.
  - `9` tests passed across Chromium, Firefox, and WebKit
- Local dev run
  Passed.
  Local URL:
  - `http://127.0.0.1:3000`
- Local smoke
  Passed through Playwright route coverage:
  - homepage `/`
  - signed-out dashboard `/dashboard`
  - homepage sign-in entry flow

## Validation Status
- Install: Passed
- Lint: Passed
- Build: Passed
- Tests: Passed
- Playwright / E2E: Passed
- Local run: Passed
- Local smoke: Passed

## Playwright Note
- This repo does not auto-start its web server for Playwright unless `PLAYWRIGHT_MANAGED_WEBSERVER` is set.
- Without a running dev server, `npx playwright test` fails with connection-refused errors rather than app assertions.

## Final Merge Gate Status
- Local merge gate: Passed
- Preview validation in this session: Not run
- Final merge decision in this report: Deferred to repo operating rules for preview confirmation
