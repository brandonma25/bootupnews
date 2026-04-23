# Vercel Speed Insights Root Integration

- Date: 2026-04-23
- Branch: `vercel/install-vercel-speed-insights-pxxd61`
- PR: `#2`

## Summary

This change updates the existing Vercel Speed Insights PR so it can merge against the current application shell. The branch now keeps the current root layout font setup, adds the Speed Insights package, and mounts the Vercel component required for Next.js App Router projects.

## Implementation

- Add `@vercel/speed-insights` to application dependencies.
- Import `SpeedInsights` from `@vercel/speed-insights/next`.
- Render `<SpeedInsights />` after the root layout children only when `VERCEL=1`, so Core Web Vitals collection can initialize after deployment without causing local browser tests to fetch the external script.

## Validation Notes

- Local install, build, lint, tests, and browser smoke validation are required before merge readiness.
- Vercel preview validation remains required to confirm deployed collection behavior.
- Human validation remains required in the Vercel dashboard to confirm Speed Insights data appears after traffic reaches the preview or production deployment.
