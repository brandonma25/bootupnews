import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureException = vi.fn(() => "event-id");
const captureMessage = vi.fn(() => "message-id");
const captureCheckIn = vi.fn(() => "check-in-id");
const addBreadcrumb = vi.fn();
const flush = vi.fn(async () => true);
const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

function createScope() {
  return {
    setLevel: vi.fn(),
    setTag: vi.fn(),
    setContext: vi.fn(),
  };
}

const scope = createScope();

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb,
  captureCheckIn,
  captureException,
  captureMessage,
  flush,
  logger,
  startSpan: vi.fn((_options, callback) => callback()),
  withScope: vi.fn((callback) => callback(scope)),
}));

describe("RSS Sentry observability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(scope, createScope());
    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.RSS_CRON_MONITOR_SLUG;
    (globalThis as typeof globalThis & { __bootUpRssRuntimeState?: unknown }).__bootUpRssRuntimeState = undefined;
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.doUnmock("@/adapters/donors");
    vi.doUnmock("@/lib/source-manifest");
    vi.restoreAllMocks();
  });

  it("does not call Sentry capture when no DSN is configured", async () => {
    const { captureRssFailure } = await import("@/lib/observability/rss");

    captureRssFailure(new Error("Feed request failed"), {
      failureType: "rss_fetch_network_error",
      phase: "fetch",
      feedUrl: "https://example.com/rss?token=secret",
      feedName: "Example",
    });

    expect(captureException).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it("captures classified RSS failures with bounded tags and sanitized context", async () => {
    process.env.SENTRY_DSN = "https://public@example.ingest.sentry.io/1";
    const { captureRssFailure } = await import("@/lib/observability/rss");

    captureRssFailure(new Error("Feed request failed with status 429"), {
      failureType: "rss_fetch_rate_limited",
      phase: "fetch",
      feedUrl: "https://feeds.example.com/rss.xml?api_key=secret",
      feedId: "feed-1",
      feedName: "Example Feed",
      statusCode: 429,
    });

    expect(scope.setTag).toHaveBeenCalledWith("component", "rss");
    expect(scope.setTag).toHaveBeenCalledWith("rss.failure_type", "rss_fetch_rate_limited");
    expect(scope.setTag).toHaveBeenCalledWith("rss.phase", "fetch");
    expect(scope.setTag).toHaveBeenCalledWith("rss.feed_host", "feeds.example.com");
    expect(scope.setTag).toHaveBeenCalledWith("rss.feed_id", "feed-1");
    expect(scope.setContext).toHaveBeenCalledWith(
      "rss",
      expect.objectContaining({
        feed_url: "https://feeds.example.com/rss.xml",
        status_code: 429,
      }),
    );
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("classifies common fetch and parse failure shapes", async () => {
    const { classifyRssFailure } = await import("@/lib/observability/rss");

    expect(classifyRssFailure(Object.assign(new Error("aborted"), { name: "AbortError" }))).toBe("rss_fetch_timeout");
    expect(classifyRssFailure(new Error("getaddrinfo ENOTFOUND feeds.example.com"))).toBe("rss_fetch_dns_error");
    expect(classifyRssFailure(new Error("Feed request failed with status 500"))).toBe("rss_fetch_http_error");
    expect(classifyRssFailure(new Error("unexpected close tag"))).toBe("rss_parse_invalid_xml");
  });

  it("reports failed health before any successful RSS fetch and ok after a fresh success", async () => {
    const { getRssHealthSnapshot, recordRssFetchSuccess } = await import("@/lib/observability/rss");
    const failed = getRssHealthSnapshot({ now: new Date("2026-04-27T10:00:00.000Z") });

    expect(failed.status).toBe("failed");
    expect(failed.criticalFailure).toBe(true);

    recordRssFetchSuccess({
      feedUrl: "https://feeds.example.com/rss.xml?token=secret",
      feedId: "feed-1",
      feedName: "Example Feed",
      fetchedAt: "2026-04-27T09:55:00.000Z",
    });

    const ok = getRssHealthSnapshot({ now: new Date("2026-04-27T10:00:00.000Z") });

    expect(ok.status).toBe("ok");
    expect(ok.lastSuccessfulFetchAt).toBe("2026-04-27T09:55:00.000Z");
    expect(ok.criticalFailure).toBe(false);
  });

  it("sends the single RSS cron monitor slug check-in when Sentry is configured", async () => {
    process.env.SENTRY_DSN = "https://public@example.ingest.sentry.io/1";
    process.env.RSS_CRON_MONITOR_SLUG = "rss-feed-refresh";
    const { captureRssCronCheckIn } = await import("@/lib/observability/rss");

    const checkInId = captureRssCronCheckIn("in_progress");
    captureRssCronCheckIn("ok", checkInId, 1.25);

    expect(captureCheckIn).toHaveBeenNthCalledWith(
      1,
      {
        monitorSlug: "rss-feed-refresh",
        status: "in_progress",
      },
      expect.objectContaining({
        schedule: {
          type: "crontab",
          value: "0 10 * * *",
        },
      }),
    );
    expect(captureCheckIn).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        checkInId: "check-in-id",
        duration: 1.25,
        monitorSlug: "rss-feed-refresh",
        status: "ok",
      }),
      expect.any(Object),
    );
  });

  it("captures boot validation failures with RSS boot tags", async () => {
    process.env.SENTRY_DSN = "https://public@example.ingest.sentry.io/1";
    vi.resetModules();
    vi.doMock("@/adapters/donors", () => ({
      getDefaultDonorFeeds: () => [],
      getProbationaryRuntimeFeeds: () => [],
    }));
    vi.doMock("@/lib/source-manifest", () => ({
      getSourcesForPublicSurface: () => [],
    }));
    const { initializeRssMonitoringAtBoot, getRssHealthSnapshot } = await import("@/lib/observability/rss");

    await initializeRssMonitoringAtBoot();

    expect(scope.setTag).toHaveBeenCalledWith("component", "rss");
    expect(scope.setTag).toHaveBeenCalledWith("rss.failure_type", "rss_config_missing");
    expect(scope.setTag).toHaveBeenCalledWith("rss.phase", "boot");
    expect(getRssHealthSnapshot({ persistedLastSuccessfulFetchAt: new Date().toISOString() }).bootStatus).toBe("degraded");
  });
});
