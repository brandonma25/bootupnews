# Sentry RSS Monitoring Test Report

Date: 2026-04-27

Branch: `codex/sentry-rss-monitoring`

## Local Validation

```text
npm install @sentry/nextjs --save
npm install
npm run lint
npm run test -- src/lib/observability/rss.test.ts src/lib/rss.test.ts src/app/health/rss/route.test.ts src/app/api/cron/fetch-news/route.test.ts src/lib/signals-editorial.test.ts
npm run test
npm run build
git diff --check
npm run dev
curl -i http://localhost:3000/
curl -i http://localhost:3000/health/rss
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test --project=chromium
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test --project=webkit --workers=1
python3 scripts/validate-feature-system-csv.py
python3 scripts/release-governance-gate.py --base-sha origin/main --head-sha HEAD --branch-name codex/sentry-rss-monitoring --pr-title "Sentry RSS monitoring" --diff-mode local
```

## Results

- Dependency install: up to date; npm audit reports `2 vulnerabilities` (`1 moderate`, `1 high`) pre-existing/not remediated in this scope.
- Focused RSS/Sentry/editorial tests: `5 passed`, `50 passed`.
- Full Vitest suite: `67 passed`, `415 passed`.
- Lint: passed.
- Build: passed.
- `git diff --check`: passed.
- Local URL: `http://localhost:3000`.
- Home route: `200 OK`.
- RSS health route: `503 Service Unavailable` locally with safe JSON because no persisted RSS-backed run/Supabase service-role data is configured in this worktree.
- Chromium Playwright: `33 passed`.
- WebKit Playwright single-worker rerun: `33 passed`.
- Feature-system CSV validation: passed with existing slug warnings.
- Release governance gate: passed as `material-feature-change` with the documented no-PRD remediation exception.

## Preview And Production

Preview `/health/rss` was not run because no preview URL/deployment was available in this local validation step. Production was not deployed or modified. Sentry DSN and Vercel env setup were handled outside this code validation pass; uptime monitor creation remains blocked until production serves `/health/rss`.
