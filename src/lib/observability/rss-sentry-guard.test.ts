import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Track 2 PART 5 regression guard.
//
// Simulate an UNINITIALIZED Sentry SDK — the exact state of a plain node/tsx/CI
// process (the dry-run harness, any CLI). The namespace exists but withScope /
// captureException / captureMessage / logger are all undefined. Before the fix
// this crashed ingestion with "Sentry.withScope is not a function" on the FIRST
// feed failure, taking the whole RSS leg down instead of degrading gracefully.
// Exports are DEFINED but undefined-valued — mirroring the real ESM namespace
// (where these names always exist) while the underlying SDK fns are not wired.
// `typeof Sentry.withScope` is then "undefined", which the guard handles.
vi.mock("@sentry/nextjs", () => ({
  withScope: undefined,
  captureException: undefined,
  captureMessage: undefined,
  addBreadcrumb: undefined,
  logger: undefined,
}));

import { captureRssFailure } from "@/lib/observability/rss";

describe("captureRssFailure survives an uninitialized Sentry SDK (PART 5)", () => {
  beforeEach(() => {
    // DSN present → isSentryConfigured('server') is true, so we reach the Sentry
    // leg and exercise the typeof-withScope guard (not an early env-gated return).
    process.env.SENTRY_DSN = "https://public@example.ingest.sentry.io/1";
  });

  afterEach(() => {
    delete process.env.SENTRY_DSN;
    vi.restoreAllMocks();
  });

  it("does not throw and returns null when the SDK fns are undefined", () => {
    let result: ReturnType<typeof captureRssFailure> | undefined;
    expect(() => {
      result = captureRssFailure(new Error("Feed request failed with status 429"), {
        failureType: "rss_fetch_rate_limited",
        phase: "fetch",
        feedUrl: "https://feeds.example.com/rss.xml?api_key=secret",
        feedId: "feed-1",
        feedName: "Example Feed",
        statusCode: 429,
      });
    }).not.toThrow();
    expect(result).toBeNull();
  });

  it("does not throw for an all-feeds-failed style network error either", () => {
    expect(() =>
      captureRssFailure(new Error("all feeds failed"), {
        failureType: "rss_fetch_network_error",
        phase: "fetch",
        feedUrl: "https://example.com/rss",
        feedName: "Example",
      }),
    ).not.toThrow();
  });
});
