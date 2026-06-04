# Perf Gate Unthrottled Blind Spot — Bug-Fix Record

- **Related PRD:** None (release-tooling fix; not owned by a single feature PRD)
- **Date:** 2026-06-04
- **Affected surface:** `scripts/release/verify-performance.mjs` (the `release:performance` homepage gate run by `.github/workflows/production-verification.yml`).

## Summary

- **Problem addressed:** The homepage performance gate launched an UNthrottled, desktop-class headless Chromium on the CI runner's fast network. It reported homepage LCP ~1.4s and stayed green while real RES-60 (mid-tier mobile) field users saw **FCP 3.92s / LCP 5.91s** (Vercel Speed Insights). The gate therefore could not catch device-class regressions: the May-24 foldback-v2 hydration weight sailed straight through a passing gate. It also measured no main-thread-cost metric at all, so hydration regressions had no signal to trip on.
- **Root cause:** `chromium.launch()` with default args — no CPU throttle, no network emulation, no mobile preset — plus a metric set (LCP / FCP / network-idle) that omits Total Blocking Time, the metric most sensitive to hydration cost.

## Fix

- **Emulate a mid-tier phone by default.** Via a Chrome DevTools Protocol session: `Emulation.setCPUThrottlingRate` (default 4x) and `Network.emulateNetworkConditions` (default "fast-3g" — ~1.6 Mbps / 750 Kbps / 150ms RTT, Lighthouse's preset).
- **Add Total Blocking Time** (sum of `longtask` durations over 50ms). Under a 4x CPU throttle, a hydration regression (e.g. five heavy cards reconciling on the main thread) inflates TBT — this is the device-class signal the old gate lacked.
- **Throttle-aware default thresholds**, aligned to Core Web Vitals mobile boundaries: LCP target 2500ms / hard-fail 4000ms; TBT hard-fail 600ms; network-idle hard-fail raised to 12000ms (network-bound under 3G, kept as a bundle-bloat backstop). When throttling is disabled (`--cpu-throttle-rate 1 --network-profile none`) the original desktop thresholds apply, so an unthrottled run is still available.
- **Extracted a pure `evaluatePerformance(metrics, thresholds)`** + `resolvePerformanceConfig(args, env)` into `scripts/release/performance-evaluator.mjs` so the pass/fail logic is unit-tested deterministically without a browser.

All throttle and threshold values are overridable via flags or `RELEASE_*` env vars; the CI workflow command is unchanged (`npm run release:performance -- --base-url …`), it now simply runs throttled.

## Verification

- `scripts/release/performance-evaluator.test.mjs` (11 cases): a foldback-v2-style regression at the field-observed **LCP 5910ms + TBT 900ms FAILS** the gate; a genuinely fast page (LCP 2200ms / TBT 150ms) PASSES; high TBT alone fails; missing LCP fails closed; config defaults to 4x/Fast-3G with throttled thresholds and falls back to desktop thresholds when throttling is off.
- Live run vs `https://bootupnews.com`: the 4x CPU throttle raised measured **TBT from 7ms (unthrottled) to 229ms (throttled)** — the main-thread cost the old gate could not see. (Absolute LCP from any single lab run is noisy due to prod cold-start + network; the deterministic unit test is the authoritative discriminator.)
- Full unit suite green (833); lint clean.

## Non-Goals

- Does not change application code or the homepage. The companion PRs (defer Sentry replay; server-render Signal Cards) are the actual fixes; this PR ensures the gate can see the next regression.
- Does not add a Vercel Speed Insights field-data (RUM p75) check — a reasonable future addition, but out of scope here.
