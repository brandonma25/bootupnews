import { describe, expect, it } from "vitest";

import { recommendedSources } from "@/lib/source-catalog";

describe("source catalog governance", () => {
  it("keeps BBC and CNBC out of the onboarding catalog", () => {
    const serialized = JSON.stringify(recommendedSources).toLowerCase();

    expect(serialized).not.toContain("bbc");
    expect(serialized).not.toContain("cnbc");
  });

  it("keeps catalog entries separate from default ingestion", () => {
    expect(recommendedSources.some((source) => source.lifecycleStatus === "active_default")).toBe(false);
    expect(recommendedSources.every((source) => source.mvpDefaultAllowed === false)).toBe(true);
  });

  it("does not label broken, key-gated, or manual-only sources as importable", () => {
    const importableSources = recommendedSources.filter((source) => source.importStatus === "ready");

    expect(importableSources.length).toBeGreaterThan(0);
    expect(importableSources.every((source) => Boolean(source.feedUrl))).toBe(true);
    expect(
      importableSources.every(
        (source) =>
          source.validationStatus !== "failed" &&
          source.validationStatus !== "requires_key" &&
          source.validationStatus !== "manual_only",
      ),
    ).toBe(true);
  });
});
