import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-inter" }),
  Lora: () => ({ variable: "--font-lora" }),
}));

describe("public page metadata", () => {
  it("uses the Boot Up brand in homepage metadata without premium dashboard copy", async () => {
    const { metadata } = await import("@/app/layout");

    expect(metadata.title).toBe("Boot Up");
    expect(String(metadata.title)).toContain("Boot Up");
    expect(metadata.description).not.toMatch(/premium|dashboard/i);
    expect(String(metadata.description).length).toBeLessThanOrEqual(160);
  });

  it("uses reader-facing public signals metadata", async () => {
    const { metadata } = await import("@/app/signals/page");

    expect(metadata.title).toBe("Boot Up — Today's Signals");
  });

  it("uses a formatted briefing date in public detail metadata", async () => {
    const { generateMetadata } = await import("@/app/briefing/[date]/page");

    await expect(generateMetadata({ params: Promise.resolve({ date: "2026-05-06" }) })).resolves.toEqual({
      title: "Boot Up — Briefing May 6, 2026",
    });
  });
});
