import { describe, expect, it } from "vitest";

import { applyPublishedHomepageEditorialOverrides } from "@/lib/homepage-editorial-overrides";
import type { BriefingItem } from "@/lib/types";

function createBriefingItem(overrides: Partial<BriefingItem> = {}): BriefingItem {
  return {
    id: overrides.id ?? "generated-1",
    topicId: overrides.topicId ?? "topic-1",
    topicName: overrides.topicName ?? "Markets",
    title: overrides.title ?? "Fed signals rate path shift",
    whatHappened: overrides.whatHappened ?? "A generated event summary.",
    keyPoints: overrides.keyPoints ?? [
      "First generated point.",
      "Second generated point.",
      "Third generated point.",
    ],
    whyItMatters: overrides.whyItMatters ?? "Generated why it matters.",
    sources: overrides.sources ?? [
      {
        title: "Example Source",
        url: "https://example.com/story",
      },
    ],
    estimatedMinutes: overrides.estimatedMinutes ?? 4,
    read: overrides.read ?? false,
    priority: overrides.priority ?? "top",
    relatedArticles: overrides.relatedArticles,
  };
}

describe("homepage editorial overrides", () => {
  it("prioritizes published editorial Why it matters over generated homepage copy", () => {
    const [item] = applyPublishedHomepageEditorialOverrides(
      [createBriefingItem()],
      [
        {
          title: "Fed signals rate path shift",
          sourceUrl: "https://example.com/story",
          whyItMatters: "Human-published editorial explanation.",
          structuredWhyItMatters: null,
        },
      ],
    );

    expect(item.whyItMatters).toBe("Human-published editorial explanation.");
    expect(item.publishedWhyItMatters).toBe("Human-published editorial explanation.");
    expect(item.editorialStatus).toBe("published");
  });

  it("carries structured published editorial content into the homepage item", () => {
    const structuredWhyItMatters = {
      preview: "Human teaser.",
      thesis: "Human thesis.",
      sections: [{ title: "First read", body: "The signal changes near-term interpretation." }],
    };
    const [item] = applyPublishedHomepageEditorialOverrides(
      [createBriefingItem()],
      [
        {
          title: "Fed signals rate path shift",
          sourceUrl: "https://example.com/story",
          whyItMatters: "Human thesis.\n\nFirst read: The signal changes near-term interpretation.",
          structuredWhyItMatters,
        },
      ],
    );

    expect(item.editorialWhyItMatters).toEqual(structuredWhyItMatters);
    expect(item.publishedWhyItMattersStructured).toEqual(structuredWhyItMatters);
    expect(item.editorialStatus).toBe("published");
  });

  it("falls back to title matching when a published editorial source URL is missing", () => {
    const [item] = applyPublishedHomepageEditorialOverrides(
      [createBriefingItem()],
      [
        {
          title: " Fed   signals rate path shift ",
          sourceUrl: "",
          whyItMatters: "Published title-only editorial explanation.",
          structuredWhyItMatters: null,
        },
      ],
    );

    expect(item.whyItMatters).toBe("Published title-only editorial explanation.");
  });

  it("keeps generated copy when there is no published editorial match", () => {
    const [item] = applyPublishedHomepageEditorialOverrides(
      [createBriefingItem()],
      [
        {
          title: "Different signal",
          sourceUrl: "https://example.com/other",
          whyItMatters: "Should not replace this card.",
          structuredWhyItMatters: null,
        },
      ],
    );

    expect(item.whyItMatters).toBe("Generated why it matters.");
    expect(item.publishedWhyItMatters).toBeUndefined();
  });
});
