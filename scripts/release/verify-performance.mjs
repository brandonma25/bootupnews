import process from "node:process";

import { chromium } from "@playwright/test";

import {
  createStep,
  exitForSteps,
  parseArgs,
  printSummary,
} from "./common.mjs";
import {
  evaluatePerformance,
  resolvePerformanceConfig,
} from "./performance-evaluator.mjs";

function byteLength(value) {
  return Buffer.byteLength(value, "utf8");
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatMs(value) {
  return Number.isFinite(value) ? `${Math.round(value)}ms` : "unavailable";
}

async function getHomepageHtmlSize(url) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html",
    },
    redirect: "follow",
  });
  const body = await response.text();

  return {
    status: response.status,
    bytes: byteLength(body),
  };
}

async function measureHomepagePerformance(url, perfConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const requestUrls = new Set();
  let scriptBytes = 0;

  // Emulate a mid-tier phone via the Chrome DevTools Protocol so the gate
  // reflects the RES-60 field population rather than a fast desktop runner.
  const client = await page.context().newCDPSession(page);
  if (perfConfig.cpuThrottleRate > 1) {
    await client.send("Emulation.setCPUThrottlingRate", { rate: perfConfig.cpuThrottleRate });
  }
  if (perfConfig.networkProfile) {
    await client.send("Network.enable");
    await client.send("Network.emulateNetworkConditions", perfConfig.networkProfile);
  }

  page.on("request", (request) => {
    requestUrls.add(request.url());
  });

  page.on("response", async (response) => {
    if (response.request().resourceType() !== "script") {
      return;
    }

    try {
      const body = await response.body();
      scriptBytes += body.byteLength;
    } catch {
      const contentLength = Number(response.headers()["content-length"]);
      if (Number.isFinite(contentLength) && contentLength > 0) {
        scriptBytes += contentLength;
      }
    }
  });

  await page.addInitScript(() => {
    window.__bootupPerformance = {
      lcp: 0,
      tbt: 0,
    };

    try {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];

        if (lastEntry) {
          window.__bootupPerformance.lcp = lastEntry.startTime;
        }
      });

      observer.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      window.__bootupPerformance.lcp = 0;
    }

    try {
      // Total Blocking Time proxy: sum of (longtask duration - 50ms) over all
      // long tasks. This is the metric a hydration regression inflates under a
      // CPU throttle — reconciling many heavy nodes produces long tasks.
      const tbtObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const blocking = entry.duration - 50;
          if (blocking > 0) {
            window.__bootupPerformance.tbt += blocking;
          }
        }
      });

      tbtObserver.observe({ type: "longtask", buffered: true });
    } catch {
      window.__bootupPerformance.tbt = 0;
    }
  });

  const startedAt = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 45_000 });
  let networkIdleMs = Number.NaN;
  await page
    .waitForLoadState("networkidle", { timeout: 15_000 })
    .then(() => {
      networkIdleMs = Date.now() - startedAt;
    })
    .catch(() => undefined);
  await page.waitForTimeout(1000);

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    const loadEventEnd =
      navigation && "loadEventEnd" in navigation
        ? navigation.loadEventEnd
        : performance.timing.loadEventEnd - performance.timing.navigationStart;

    return {
      fcp: fcp?.startTime ?? Number.NaN,
      lcp: window.__bootupPerformance?.lcp ?? Number.NaN,
      tbt: window.__bootupPerformance?.tbt ?? Number.NaN,
      loadEventEnd,
    };
  });

  await browser.close();

  return {
    ...metrics,
    elapsedMs: Date.now() - startedAt,
    networkIdleMs,
    routeRequestCount: requestUrls.size,
    scriptBytes,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = args["base-url"] || args.url || process.env.RELEASE_BASE_URL;
  const step = createStep("homepage performance gate");
  const startedAt = Date.now();

  if (!baseUrl) {
    step.status = "failed";
    step.details = "Provide --base-url or set RELEASE_BASE_URL.";
    printSummary({
      label: "production performance",
      steps: [step],
    });
    exitForSteps([step]);
  }

  let perfConfig;
  try {
    perfConfig = resolvePerformanceConfig(args, process.env);
  } catch (error) {
    step.status = "failed";
    step.details = error instanceof Error ? error.message : String(error);
    printSummary({ label: "production performance", steps: [step] });
    exitForSteps([step]);
  }

  const { thresholds } = perfConfig;
  const homepageUrl = new URL("/", baseUrl).toString();
  const emulation = `${perfConfig.cpuThrottleRate}x CPU / ${perfConfig.networkProfileName} network`;

  try {
    const [htmlSize, metrics] = await Promise.all([
      getHomepageHtmlSize(homepageUrl),
      measureHomepagePerformance(homepageUrl, perfConfig),
    ]);

    step.durationMs = Date.now() - startedAt;
    step.details = [
      `URL: ${homepageUrl}`,
      `emulation: ${emulation}`,
      `LCP: ${formatMs(metrics.lcp)} (target ${thresholds.lcpTargetMs}ms, hard fail ${thresholds.lcpHardFailMs}ms)`,
      `FCP: ${formatMs(metrics.fcp)}`,
      `TBT: ${formatMs(metrics.tbt)} (hard fail ${thresholds.tbtHardFailMs}ms)`,
      `load event: ${formatMs(metrics.loadEventEnd)}`,
      `network idle: ${formatMs(metrics.networkIdleMs)} (hard fail ${thresholds.networkIdleHardFailMs}ms)`,
      `HTML size: ${formatBytes(htmlSize.bytes)} decompressed (HTTP ${htmlSize.status})`,
      `script bytes: ${formatBytes(metrics.scriptBytes)}`,
      `route requests: ${metrics.routeRequestCount}`,
      `browser elapsed: ${formatMs(metrics.elapsedMs)}`,
    ].join("; ");

    const result = evaluatePerformance(metrics, thresholds);
    step.status = result.status;
    if (result.reasons.length) {
      step.details += `; ${result.reasons.join(" ")}`;
    }
  } catch (error) {
    step.status = "failed";
    step.durationMs = Date.now() - startedAt;
    step.details = error instanceof Error ? error.message : String(error);
  }

  printSummary({
    label: "production performance",
    steps: [step],
    extraLines: [`Base URL: ${baseUrl}`, `Emulation: ${emulation}`],
  });

  exitForSteps([step]);
}

await main();
