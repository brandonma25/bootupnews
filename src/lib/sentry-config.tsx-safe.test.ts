import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { captureExceptionSafe, captureMessageSafe, flushSafe } from "@/lib/sentry-config";

/**
 * Regression guard for the `pipeline:dry` crash: outside the Next.js server
 * runtime the @sentry/nextjs SDK functions can be undefined, so the previously
 * UNGUARDED `Sentry.captureMessage(...)` in the source-health / pipeline-log /
 * needs_review-sweep writers threw "Sentry.captureMessage is not a function" and
 * killed every RSS feed + the sweep, collapsing the dry-run to seed-fallback.
 * The tsx-safe wrappers must no-op (never throw) when Sentry is unconfigured.
 */
describe("tsx-safe Sentry wrappers no-op when Sentry is unconfigured", () => {
  let savedDsn: string | undefined;
  let savedPublic: string | undefined;

  beforeEach(() => {
    savedDsn = process.env.SENTRY_DSN;
    savedPublic = process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  afterEach(() => {
    if (savedDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = savedDsn;
    if (savedPublic === undefined) delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    else process.env.NEXT_PUBLIC_SENTRY_DSN = savedPublic;
  });

  it("captureMessageSafe does not throw and no-ops (the per-feed crash path)", () => {
    expect(() =>
      captureMessageSafe("Source health log writer no-op", {
        level: "warning",
        tags: { observability_surface: "source_health_log" },
      }),
    ).not.toThrow();
    expect(captureMessageSafe("noop")).toBeUndefined();
  });

  it("captureExceptionSafe does not throw and no-ops", () => {
    expect(() => captureExceptionSafe(new Error("boom"), { tags: { x: "y" } })).not.toThrow();
    expect(captureExceptionSafe(new Error("boom"))).toBeUndefined();
  });

  it("flushSafe resolves true without throwing (the sweep flush path)", async () => {
    await expect(flushSafe(10)).resolves.toBe(true);
  });
});
