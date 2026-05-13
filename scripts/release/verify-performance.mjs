import process from "node:process";

import { chromium } from "@playwright/test";

import {
  createStep,
  exitForSteps,
  parseArgs,
  printSummary,
} from "./common.mjs";

const DEFAULT_LCP_THRESHOLD_MS = 3000;
const DEFAULT_LCP_TARGET_MS = 2000;

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

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

async function measureHomepagePerformance(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const requestUrls = new Set();
  let scriptBytes = 0;

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
  });

  const startedAt = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
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
      loadEventEnd,
    };
  });

  await browser.close();

  return {
    ...metrics,
    elapsedMs: Date.now() - startedAt,
    routeRequestCount: requestUrls.size,
    scriptBytes,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = args["base-url"] || args.url || process.env.RELEASE_BASE_URL;
  const lcpThresholdMs = parseNumber(
    args["lcp-threshold-ms"] || process.env.RELEASE_LCP_THRESHOLD_MS,
    DEFAULT_LCP_THRESHOLD_MS,
  );
  const lcpTargetMs = parseNumber(
    args["lcp-target-ms"] || process.env.RELEASE_LCP_TARGET_MS,
    DEFAULT_LCP_TARGET_MS,
  );
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

  const homepageUrl = new URL("/", baseUrl).toString();

  try {
    const [htmlSize, metrics] = await Promise.all([
      getHomepageHtmlSize(homepageUrl),
      measureHomepagePerformance(homepageUrl),
    ]);

    step.durationMs = Date.now() - startedAt;
    step.details = [
      `URL: ${homepageUrl}`,
      `LCP: ${formatMs(metrics.lcp)} (target ${lcpTargetMs}ms, hard fail ${lcpThresholdMs}ms)`,
      `FCP: ${formatMs(metrics.fcp)}`,
      `load event: ${formatMs(metrics.loadEventEnd)}`,
      `HTML size: ${formatBytes(htmlSize.bytes)} decompressed (HTTP ${htmlSize.status})`,
      `script bytes: ${formatBytes(metrics.scriptBytes)}`,
      `route requests: ${metrics.routeRequestCount}`,
      `browser elapsed: ${formatMs(metrics.elapsedMs)}`,
    ].join("; ");

    if (!Number.isFinite(metrics.lcp) || metrics.lcp <= 0) {
      step.status = "failed";
      step.details += "; LCP was not reported by Chromium.";
    } else if (metrics.lcp > lcpThresholdMs) {
      step.status = "failed";
      step.details += `; homepage LCP exceeded ${lcpThresholdMs}ms.`;
    } else {
      step.status = "passed";
    }
  } catch (error) {
    step.status = "failed";
    step.durationMs = Date.now() - startedAt;
    step.details = error instanceof Error ? error.message : String(error);
  }

  printSummary({
    label: "production performance",
    steps: [step],
    extraLines: [`Base URL: ${baseUrl}`],
  });

  exitForSteps([step]);
}

await main();
