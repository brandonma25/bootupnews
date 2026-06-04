# Homepage Render-Blocking Sentry Replay — Bug-Fix Record

- **Related PRD:** None (cross-cutting client-performance fix; not owned by a single feature PRD)
- **Date:** 2026-06-04
- **Affected object level:** Public homepage (`/`) client render path; all public routes share the client instrumentation hook.

## Summary

- **Problem addressed:** Field Core Web Vitals on `/` regressed to **FCP 3.92s / LCP 5.91s** (Vercel Speed Insights, RES 60) despite a healthy **TTFB of 0.16s** — i.e. the server responds fast and the cost is render-blocking client JS, not the backend. The lab perf gate (`scripts/release/verify-performance.mjs`) reported LCP ~1.4s and stayed green because it runs an unthrottled desktop-class headless browser, so it never saw the device-class regression.
- **Root cause (this fix's slice):** `src/instrumentation-client.ts` initialized Sentry **synchronously** at client-instrumentation load with the heavy `replayIntegration` in the `Sentry.init({ integrations: [...] })` array. Session Replay's instantiation and recording start are real synchronous main-thread work, and they ran **inside the render-blocking window before First Contentful Paint** on every page load. On mid-tier devices this measurably delayed FCP/LCP. (The May 24 foldback-v2 hydration weight is a separate, larger contributor addressed in a follow-up PR; this record covers only the Sentry-replay slice.)

## Fix

Apply PR #233's existing analytics-defer pattern (the 3000ms PostHog deferral) to Sentry:

- **Sentry core stays synchronous.** `Sentry.init` still runs at instrumentation load with `dsn`, `beforeSend`/`beforeBreadcrumb` sanitizers, trace sampling, and replay sample rates unchanged — error/exception/trace capture is active from t=0 and is not affected.
- **Replay is attached after first paint.** A new `scheduleDeferredSentryReplay(attach, opts)` helper in `src/lib/sentry-config.ts` runs the replay attachment on the first `requestIdleCallback` (3000ms `setTimeout` fallback, matching PostHog). `instrumentation-client.ts` now calls `Sentry.addIntegration(Sentry.replayIntegration({...}))` inside that deferred callback instead of listing it in `Sentry.init`.
- The helper is injectable (`schedule`, `onError`) and unit-tested in `src/lib/sentry-config.test.ts`: the attach callback does not run synchronously, runs once scheduled, and any failure is swallowed so replay can never break error capture or the app.

### Honest scope note

Replay **bytes** remain in the shared client chunk (`main-*.js`, ~587 KB, unchanged). The synchronous `onRouterTransitionStart` export forces a static `import * as Sentry from "@sentry/nextjs"`, and a dynamic import of the same module resolves to that same chunk — so replay cannot be code-split out without breaking that export. The realized win is removing replay's synchronous **execution** from the pre-paint window, which is the cost the field regression attributed to it. Quantitative FCP/LCP confirmation comes from the throttled perf gate (separate follow-up PR) and post-deploy field RES recovery.

## Verification

- `scheduleDeferredSentryReplay` unit tests (3) pass.
- Full vitest suite green; lint clean; production build green.
- Build inspection: `main-*.js` size unchanged before/after (586,841 → 587,172 bytes), confirming the change is execution-deferral, not a bundle delta.
- Error capture intact by construction: `Sentry.init` is byte-for-byte equivalent minus the `integrations` array; replay sample-rate config is preserved.

## Non-Goals

- Does NOT collapse homepage signal cards. Cards remain SSR-rendered and visually expanded by default (locked product decision). This PR does not touch `SignalCard.tsx`.
- Does NOT address the foldback-v2 hydration weight or the unthrottled perf gate — those are separate PRs in the same remediation series.
