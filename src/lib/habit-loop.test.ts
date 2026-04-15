import { describe, expect, it } from "vitest";

import {
  classifyEventDisplayState,
  createContinuityFingerprint,
  createContinuityKey,
  summarizeSessionStates,
} from "@/lib/habit-loop";
import type { BriefingItem } from "@/lib/types";

describe("habit loop helpers", () => {
  it("keeps continuity keys stable across small title wording changes", () => {
    const key = createContinuityKey(
      "topic-1",
      [
        "Fed signals rates may stay higher for longer",
        "Markets reprice after fresh Fed comments",
      ],
      ["fed", "rates", "markets"],
    );

    const similarKey = createContinuityKey(
      "topic-1",
      [
        "Fresh Fed signal keeps rates higher for longer",
        "Markets reprice after the latest Fed update",
      ],
      ["fed", "rates", "markets"],
    );

    expect(similarKey).toBe(key);
  });

  it("classifies unread items as new", () => {
    expect(
      classifyEventDisplayState({
        lastViewedAt: null,
        previousFingerprint: null,
        currentFingerprint: "fingerprint-a",
        previousImportanceScore: null,
        currentImportanceScore: 42,
      }),
    ).toBe("new");
  });

  it("classifies a large score jump as escalated", () => {
    expect(
      classifyEventDisplayState({
        lastViewedAt: "2026-04-14T09:00:00.000Z",
        previousFingerprint: "fingerprint-a",
        currentFingerprint: "fingerprint-b",
        previousImportanceScore: 40,
        currentImportanceScore: 52,
      }),
    ).toBe("escalated");
  });

  it("classifies a fingerprint change without a large score jump as changed", () => {
    expect(
      classifyEventDisplayState({
        lastViewedAt: "2026-04-14T09:00:00.000Z",
        previousFingerprint: "fingerprint-a",
        currentFingerprint: "fingerprint-b",
        previousImportanceScore: 40,
        currentImportanceScore: 44,
      }),
    ).toBe("changed");
  });

  it("counts session summary buckets", () => {
    const items = [
      createItem({ id: "1", read: true, displayState: "new" }),
      createItem({ id: "2", read: false, displayState: "changed" }),
      createItem({ id: "3", read: true, displayState: "escalated" }),
      createItem({ id: "4", read: false, displayState: "unchanged" }),
    ];

    expect(summarizeSessionStates(items)).toEqual({
      reviewedCount: 2,
      newCount: 1,
      changedCount: 1,
      escalatedCount: 1,
    });
  });

  it("changes fingerprint when the cluster payload changes", () => {
    const original = createContinuityFingerprint({
      articleSignals: ["a", "b"],
      importanceScore: 40,
      publishedAt: "2026-04-15T08:00:00.000Z",
      sourceCount: 2,
    });
    const updated = createContinuityFingerprint({
      articleSignals: ["a", "b", "c"],
      importanceScore: 40,
      publishedAt: "2026-04-15T08:00:00.000Z",
      sourceCount: 3,
    });

    expect(updated).not.toBe(original);
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
    displayState: overrides.displayState ?? "unchanged",
  };
}
