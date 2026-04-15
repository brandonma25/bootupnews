import { describe, expect, it } from "vitest";

import {
  calculateReadingTime,
  calculateReadingWindow,
  formatReadingDelta,
  formatReadingWindow,
  interpretReadingWindow,
  parseReadingWindowMinutes,
} from "@/lib/reading-window";
import type { BriefingItem } from "@/lib/types";

describe("reading window helpers", () => {
  it("calculates deterministic reading time from event content", () => {
    const item = createItem({
      title: "A".repeat(20),
      whatHappened: "word ".repeat(120),
      whyItMatters: "impact ".repeat(90),
    });

    expect(calculateReadingTime(item)).toBeGreaterThanOrEqual(2);
  });

  it("computes total and completed progress from existing read state", () => {
    const unread = createItem({
      title: "Market update",
      whatHappened: "word ".repeat(120),
      whyItMatters: "impact ".repeat(60),
      read: false,
    });
    const read = createItem({
      title: "Policy shift",
      whatHappened: "word ".repeat(140),
      whyItMatters: "impact ".repeat(80),
      read: true,
    });

    const metrics = calculateReadingWindow([unread, read], 3);

    expect(metrics.totalMinutes).toBeGreaterThan(metrics.completedMinutes);
    expect(metrics.completedMinutes).toBeGreaterThan(0);
    expect(metrics.progressLabel).toContain("min completed");
    expect(metrics.deltaVsYesterday).toBe(metrics.totalMinutes - 3);
  });

  it("interprets day intensity from configurable thresholds", () => {
    expect(interpretReadingWindow(6)).toBe("Light");
    expect(interpretReadingWindow(18)).toBe("Normal");
    expect(interpretReadingWindow(32)).toBe("Heavy");
  });

  it("parses historical reading window strings", () => {
    expect(parseReadingWindowMinutes("18 min")).toBe(18);
    expect(parseReadingWindowMinutes("34 minutes")).toBe(34);
    expect(parseReadingWindowMinutes("")).toBeNull();
  });

  it("formats reading window and delta copy", () => {
    expect(formatReadingWindow(18)).toBe("18 min");
    expect(formatReadingDelta(5)).toBe("+5 min vs yesterday");
    expect(formatReadingDelta(0)).toBe("No change vs yesterday");
    expect(formatReadingDelta(null)).toBe("First tracked day");
  });
});

function createItem(overrides: Partial<BriefingItem>): BriefingItem {
  return {
    id: overrides.id ?? "item-1",
    topicId: overrides.topicId ?? "topic-1",
    topicName: overrides.topicName ?? "Finance",
    title: overrides.title ?? "Generic event",
    whatHappened: overrides.whatHappened ?? "A generic development happened.",
    keyPoints: overrides.keyPoints ?? ["Point one", "Point two", "Point three"],
    whyItMatters: overrides.whyItMatters ?? "It matters because it changes expectations.",
    sources: overrides.sources ?? [{ title: "Reuters", url: "https://example.com" }],
    estimatedMinutes: overrides.estimatedMinutes ?? 4,
    read: overrides.read ?? false,
    priority: overrides.priority ?? "normal",
  };
}
