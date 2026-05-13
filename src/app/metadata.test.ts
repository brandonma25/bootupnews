import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter_Tight: () => ({ variable: "--bu-font-sans" }),
  Source_Serif_4: () => ({ variable: "--bu-font-serif" }),
}));

describe("public page metadata", () => {
  it("uses the Boot Up brand in homepage metadata without premium dashboard copy", async () => {
    const { metadata } = await import("@/app/layout");

    expect(metadata.title).toBe("Boot Up");
    expect(String(metadata.title)).toContain("Boot Up");
    expect(metadata.description).not.toMatch(/premium|dashboard/i);
    expect(String(metadata.description).length).toBeLessThanOrEqual(160);
  });

  it("exposes canonical and social URL metadata for the public homepage", async () => {
    const { metadata } = await import("@/app/page");

    expect(metadata.metadataBase?.toString()).toBe("https://bootupnews.com/");
    expect(metadata.alternates).toEqual({
      canonical: "https://bootupnews.com/",
    });
    expect(metadata.openGraph).toEqual({
      url: "https://bootupnews.com/",
    });
    expect(metadata.other).toEqual({
      "twitter:url": "https://bootupnews.com/",
    });
  });

  it("uses reader-facing public signals metadata", async () => {
    const { metadata } = await import("@/app/signals/page");

    expect(metadata.title).toBe("Boot Up — All signals");
  });

  it("uses a formatted briefing date in public detail metadata", async () => {
    const { generateMetadata } = await import("@/app/briefing/[date]/page");

    await expect(generateMetadata({ params: Promise.resolve({ date: "2026-05-06" }) })).resolves.toEqual({
      title: "Boot Up — Briefing, May 6, 2026",
    });
  });
});
