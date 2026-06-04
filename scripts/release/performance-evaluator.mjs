/**
 * Pure performance-threshold evaluator + throttling profiles for the homepage
 * perf gate (scripts/release/verify-performance.mjs).
 *
 * Why this exists: the gate previously launched an UNthrottled desktop-class
 * Chromium on a fast CI network, so it reported homepage LCP ~1.4s while real
 * RES-60 (mid-tier mobile) field users saw LCP ~5.9s. It therefore could not
 * catch device-class regressions — e.g. the foldback-v2 hydration weight sailed
 * through. The gate now emulates a mid-tier phone (4x CPU throttle + Fast-3G
 * network) and additionally gates on Total Blocking Time, the metric most
 * sensitive to main-thread hydration cost.
 *
 * The evaluation is a pure function so it can be unit-tested deterministically
 * (good metrics pass; a foldback-v2-style regression fails) without a browser.
 */

export const DEFAULT_CPU_THROTTLE_RATE = 4;
export const DEFAULT_NETWORK_PROFILE = "fast-3g";

/**
 * Chrome DevTools Protocol Network.emulateNetworkConditions presets.
 * Throughput is bytes/second. Values mirror Lighthouse's mobile presets.
 */
export const NETWORK_PROFILES = {
  none: null,
  "fast-3g": {
    // ~1.6 Mbps down / 750 Kbps up / 150ms RTT (Lighthouse "Fast 3G").
    downloadThroughput: Math.round((1.6 * 1024 * 1024) / 8),
    uploadThroughput: Math.round((750 * 1024) / 8),
    latency: 150,
    offline: false,
  },
  "slow-3g": {
    downloadThroughput: Math.round((400 * 1024) / 8),
    uploadThroughput: Math.round((400 * 1024) / 8),
    latency: 400,
    offline: false,
  },
};

/**
 * Default hard-fail / target thresholds. When the gate runs throttled (the
 * default), thresholds are mobile-realistic and aligned to Core Web Vitals
 * mobile boundaries. When throttling is disabled, the original desktop-lab
 * thresholds apply so an unthrottled run is still meaningful.
 */
export const THROTTLED_THRESHOLDS = {
  // CWV mobile: LCP good < 2500ms, poor > 4000ms.
  lcpTargetMs: 2500,
  lcpHardFailMs: 4000,
  // CWV lab proxy: TBT good < 200ms, poor > 600ms. This is the metric a
  // hydration regression (e.g. 5 heavy cards reconciling) blows past under a
  // 4x CPU throttle.
  tbtHardFailMs: 600,
  // Network-bound under Fast 3G; kept as a backstop against bundle/request
  // bloat rather than a tight gate.
  networkIdleHardFailMs: 12_000,
};

export const UNTHROTTLED_THRESHOLDS = {
  lcpTargetMs: 2000,
  lcpHardFailMs: 3000,
  tbtHardFailMs: 350,
  networkIdleHardFailMs: 3000,
};

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Resolve the throttling + threshold configuration from CLI args and env.
 * Precedence: explicit flag → env var → throttle-aware default.
 */
export function resolvePerformanceConfig(args = {}, env = {}) {
  const cpuThrottleRate = parseNumber(
    args["cpu-throttle-rate"] ?? env.RELEASE_CPU_THROTTLE_RATE,
    DEFAULT_CPU_THROTTLE_RATE,
  );

  const networkProfileName = (
    args["network-profile"] ??
    env.RELEASE_NETWORK_PROFILE ??
    DEFAULT_NETWORK_PROFILE
  ).toString();

  if (!(networkProfileName in NETWORK_PROFILES)) {
    throw new Error(
      `Unknown --network-profile "${networkProfileName}". Valid: ${Object.keys(NETWORK_PROFILES).join(", ")}.`,
    );
  }

  const throttled = cpuThrottleRate > 1 || networkProfileName !== "none";
  const base = throttled ? THROTTLED_THRESHOLDS : UNTHROTTLED_THRESHOLDS;

  return {
    cpuThrottleRate,
    networkProfileName,
    networkProfile: NETWORK_PROFILES[networkProfileName],
    throttled,
    thresholds: {
      lcpTargetMs: parseNumber(args["lcp-target-ms"] ?? env.RELEASE_LCP_TARGET_MS, base.lcpTargetMs),
      lcpHardFailMs: parseNumber(
        args["lcp-threshold-ms"] ?? env.RELEASE_LCP_THRESHOLD_MS,
        base.lcpHardFailMs,
      ),
      tbtHardFailMs: parseNumber(args["tbt-threshold-ms"] ?? env.RELEASE_TBT_THRESHOLD_MS, base.tbtHardFailMs),
      networkIdleHardFailMs: parseNumber(
        args["network-idle-threshold-ms"] ?? env.RELEASE_NETWORK_IDLE_THRESHOLD_MS,
        base.networkIdleHardFailMs,
      ),
    },
  };
}

/**
 * Pure pass/fail evaluation. Returns { status: "passed" | "failed", reasons }.
 * `metrics` is { lcp, fcp, tbt, networkIdleMs }. Any missing/invalid LCP fails
 * closed (Chromium failed to report it), matching the prior gate behavior.
 */
export function evaluatePerformance(metrics, thresholds) {
  const reasons = [];
  const lcp = metrics?.lcp;
  const tbt = metrics?.tbt;
  const networkIdleMs = metrics?.networkIdleMs;

  if (!Number.isFinite(lcp) || lcp <= 0) {
    reasons.push("LCP was not reported by Chromium.");
  } else if (lcp > thresholds.lcpHardFailMs) {
    reasons.push(`homepage LCP ${Math.round(lcp)}ms exceeded ${thresholds.lcpHardFailMs}ms.`);
  }

  if (Number.isFinite(tbt) && tbt > thresholds.tbtHardFailMs) {
    reasons.push(`homepage TBT ${Math.round(tbt)}ms exceeded ${thresholds.tbtHardFailMs}ms.`);
  }

  if (!Number.isFinite(networkIdleMs) || networkIdleMs <= 0) {
    reasons.push("network idle was not reached within the measurement window.");
  } else if (networkIdleMs > thresholds.networkIdleHardFailMs) {
    reasons.push(`homepage network idle ${Math.round(networkIdleMs)}ms exceeded ${thresholds.networkIdleHardFailMs}ms.`);
  }

  return { status: reasons.length === 0 ? "passed" : "failed", reasons };
}
