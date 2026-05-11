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
