import { describe, expect, it } from "vitest";

import {
  THROTTLED_THRESHOLDS,
  UNTHROTTLED_THRESHOLDS,
  evaluatePerformance,
  resolvePerformanceConfig,
} from "./performance-evaluator.mjs";

describe("resolvePerformanceConfig", () => {
  it("defaults to a throttled mid-tier-phone profile (4x CPU, Fast 3G)", () => {
    const config = resolvePerformanceConfig({}, {});
    expect(config.cpuThrottleRate).toBe(4);
    expect(config.networkProfileName).toBe("fast-3g");
    expect(config.throttled).toBe(true);
    expect(config.thresholds).toEqual(THROTTLED_THRESHOLDS);
    expect(config.networkProfile).toMatchObject({ latency: 150, offline: false });
  });

  it("uses unthrottled desktop thresholds when throttling is disabled", () => {
    const config = resolvePerformanceConfig(
      { "cpu-throttle-rate": "1", "network-profile": "none" },
      {},
    );
    expect(config.throttled).toBe(false);
    expect(config.networkProfile).toBeNull();
    expect(config.thresholds).toEqual(UNTHROTTLED_THRESHOLDS);
  });

  it("honors explicit threshold overrides via flags", () => {
    const config = resolvePerformanceConfig({ "lcp-threshold-ms": "4500", "tbt-threshold-ms": "800" }, {});
    expect(config.thresholds.lcpHardFailMs).toBe(4500);
    expect(config.thresholds.tbtHardFailMs).toBe(800);
  });

  it("reads env vars when flags are absent", () => {
    const config = resolvePerformanceConfig({}, { RELEASE_CPU_THROTTLE_RATE: "6" });
    expect(config.cpuThrottleRate).toBe(6);
  });

  it("throws on an unknown network profile", () => {
    expect(() => resolvePerformanceConfig({ "network-profile": "dialup" }, {})).toThrow(/Unknown/);
  });
});

describe("evaluatePerformance (throttled thresholds)", () => {
  const t = THROTTLED_THRESHOLDS;

  it("passes a genuinely fast page under throttling", () => {
    const result = evaluatePerformance(
      { lcp: 2200, fcp: 1500, tbt: 150, networkIdleMs: 6000 },
      t,
    );
    expect(result.status).toBe("passed");
    expect(result.reasons).toEqual([]);
  });

  it("FAILS a foldback-v2-style hydration regression (matches field LCP 5.9s)", () => {
    // Field-observed regressed numbers: LCP ~5910ms, heavy main-thread work.
    const result = evaluatePerformance(
      { lcp: 5910, fcp: 3920, tbt: 900, networkIdleMs: 7000 },
      t,
    );
    expect(result.status).toBe("failed");
    expect(result.reasons.join(" ")).toMatch(/LCP 5910ms exceeded 4000ms/);
    expect(result.reasons.join(" ")).toMatch(/TBT 900ms exceeded 600ms/);
  });

  it("FAILS on high TBT alone even when LCP is acceptable (the hydration-cost signal)", () => {
    const result = evaluatePerformance(
      { lcp: 2400, fcp: 1500, tbt: 750, networkIdleMs: 6000 },
      t,
    );
    expect(result.status).toBe("failed");
    expect(result.reasons.join(" ")).toMatch(/TBT 750ms exceeded 600ms/);
  });

  it("fails closed when Chromium does not report LCP", () => {
    const result = evaluatePerformance({ lcp: Number.NaN, tbt: 100, networkIdleMs: 5000 }, t);
    expect(result.status).toBe("failed");
    expect(result.reasons.join(" ")).toMatch(/LCP was not reported/);
  });

  it("does not fail on TBT when it is unavailable (NaN)", () => {
    const result = evaluatePerformance({ lcp: 2200, tbt: Number.NaN, networkIdleMs: 6000 }, t);
    expect(result.status).toBe("passed");
  });

  it("fails when network idle is never reached", () => {
    const result = evaluatePerformance({ lcp: 2200, tbt: 100, networkIdleMs: Number.NaN }, t);
    expect(result.status).toBe("failed");
    expect(result.reasons.join(" ")).toMatch(/network idle was not reached/);
  });
});
