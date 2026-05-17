import { beforeEach, describe, expect, it } from "vitest";

function clearSentryEnv() {
  delete process.env.SENTRY_DSN;
  delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  delete process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE;
  delete process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE;
}

describe("Sentry configuration", () => {
  beforeEach(() => {
    clearSentryEnv();
  });

  it("requires NEXT_PUBLIC_SENTRY_DSN for browser-side Sentry", async () => {
    process.env.SENTRY_DSN = "https://server-dsn.example";

    const { isSentryConfigured, readSentryDsn } = await import("@/lib/sentry-config");

    expect(readSentryDsn("server")).toBe("https://server-dsn.example");
    expect(readSentryDsn("client")).toBe("");
    expect(isSentryConfigured("client")).toBe(false);
  });

  it("enables browser-side Sentry when the public DSN is configured", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://public-dsn.example";

    const { isSentryConfigured, readSentryDsn } = await import("@/lib/sentry-config");

    expect(readSentryDsn("client")).toBe("https://public-dsn.example");
    expect(isSentryConfigured("client")).toBe(true);
  });

  it("clamps replay sampling env values", async () => {
    process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE = "2";
    process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE = "-1";

    const { readSentryReplaysOnErrorSampleRate, readSentryReplaysSessionSampleRate } = await import(
      "@/lib/sentry-config"
    );

    expect(readSentryReplaysOnErrorSampleRate()).toBe(1);
    expect(readSentryReplaysSessionSampleRate()).toBe(0);
  });
});

describe("isFilteredRssNoiseEvent (PRD-65 Phase 4.5)", () => {
  it("drops events whose exception.values[].value starts with 'Feed request retry exhausted for '", async () => {
    const { isFilteredRssNoiseEvent } = await import("@/lib/sentry-config");
    const event = {
      exception: {
        values: [
          {
            type: "RssError",
            value: "Feed request retry exhausted for Reuters: timeout",
          },
        ],
      },
    };
    expect(isFilteredRssNoiseEvent(event)).toBe(true);
  });

  it("drops events whose top-level message matches the pattern (captureMessage path)", async () => {
    const { isFilteredRssNoiseEvent } = await import("@/lib/sentry-config");
    expect(
      isFilteredRssNoiseEvent({ message: "Feed request retry exhausted for FlakyFeed" }),
    ).toBe(true);
  });

  it("does not drop other RssError variants", async () => {
    const { isFilteredRssNoiseEvent } = await import("@/lib/sentry-config");
    const event = {
      exception: {
        values: [
          {
            type: "RssError",
            value: "Feed returned zero articles for Reuters",
          },
        ],
      },
    };
    expect(isFilteredRssNoiseEvent(event)).toBe(false);
  });

  it("does not drop unrelated errors", async () => {
    const { isFilteredRssNoiseEvent } = await import("@/lib/sentry-config");
    const event = {
      exception: {
        values: [
          { type: "TypeError", value: "Cannot read property 'foo' of undefined" },
        ],
      },
    };
    expect(isFilteredRssNoiseEvent(event)).toBe(false);
  });

  it("returns false on malformed or missing event payload", async () => {
    const { isFilteredRssNoiseEvent } = await import("@/lib/sentry-config");
    expect(isFilteredRssNoiseEvent(null)).toBe(false);
    expect(isFilteredRssNoiseEvent(undefined)).toBe(false);
    expect(isFilteredRssNoiseEvent({})).toBe(false);
    expect(isFilteredRssNoiseEvent({ exception: { values: [{}] } })).toBe(false);
  });
});
