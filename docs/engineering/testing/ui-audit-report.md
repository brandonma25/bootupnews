# UI Audit Playwright Report

- Generated: 2026-04-21T02:42:56.668Z
- Base URL: `http://localhost:3000`
- Audit mode: `local`
- Summary source: `test-results/playwright-results.json`

## Pass / Fail Summary

| Total | Passed | Failed | Skipped |
| ---: | ---: | ---: | ---: |
| 22 | 22 | 0 | 0 |

## Projects / Viewports

- chromium
- webkit

## Routes Covered

- `/`
- `/dashboard`
- `/topics`
- `/sources`
- `/history`
- `/settings`

## Behaviors Covered

- Desktop sidebar traversal across first-class app routes.
- Mobile drawer open, close, and route-change close behavior.
- Signed-out homepage CTA and auth-entry modal.
- Signed-out dashboard rendering, visible content, and named controls.
- Route-level screenshots attached to Playwright artifacts.
- Console, page, and failed-request diagnostics attached when detected.

## Failed Tests

- None in the latest generated summary.

## Artifacts Produced

- HTML report: `playwright-report/index.html`
- JSON summary: `test-results/ui-audit-summary.json`
- Raw Playwright JSON: `test-results/playwright-results.json`
- Per-test screenshots and diagnostics: `test-results/**`
- Traces: retained on failure by Playwright configuration.

## Known Gaps

- Real OAuth completion, provider callback truth, session persistence, and sign-out require human validation with a configured preview environment.
- Production mode is read-only traversal only; tests avoid submitting forms or mutating account data.
- Authenticated write flows are intentionally not automated without a dedicated test account.
- External news/source links are checked for safe attributes instead of being navigated in production-safe audit mode.

## How To Rerun

```bash
npm run test:e2e:audit
npm run test:e2e:audit:chromium
npm run test:e2e:headed -- tests/audit tests/navigation tests/routes tests/responsive tests/smoke
npm run test:e2e:report
PLAYWRIGHT_BASE_URL="https://your-preview-url.vercel.app" UI_AUDIT_MODE=preview npm run test:e2e:audit:chromium
PLAYWRIGHT_BASE_URL="https://your-production-url.example" UI_AUDIT_MODE=production npm run test:e2e:audit:chromium
npm run audit:ui:report
```
