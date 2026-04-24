import { describe, expect, it } from "vitest";

import {
  buildHomepageEvents,
  buildVolumeLayersViewModel,
  selectCategoryPreviewEvents,
  selectDevelopingNowEvents,
} from "@/lib/homepage-model";
import type { BriefingItem } from "@/lib/types";

function createItem(overrides: Partial<BriefingItem>): BriefingItem {
  return {
    id: overrides.id ?? "item-1",
    topicId: overrides.topicId ?? "topic-1",
    topicName: overrides.topicName ?? "General",
    title: overrides.title ?? "Generic event",
    whatHappened: overrides.whatHappened ?? "A generic development happened.",
    keyPoints: overrides.keyPoints ?? ["Point one", "Point two", "Point three"],
    whyItMatters: overrides.whyItMatters ?? "It matters because it changes expectations.",
    publishedWhyItMatters: overrides.publishedWhyItMatters,
    publishedWhyItMattersStructured: overrides.publishedWhyItMattersStructured,
    editorialWhyItMatters: overrides.editorialWhyItMatters,
    editorialStatus: overrides.editorialStatus,
    sources:
      overrides.sources ?? [
        { title: "Reuters", url: "https://www.reuters.com/world/example" },
        { title: "AP", url: "https://apnews.com/example" },
      ],
    estimatedMinutes: overrides.estimatedMinutes ?? 4,
    read: overrides.read ?? false,
    priority: overrides.priority ?? "top",
    matchedKeywords: overrides.matchedKeywords ?? [],
    matchScore: overrides.matchScore ?? 8,
    publishedAt: overrides.publishedAt ?? "2026-04-15T08:00:00.000Z",
    sourceCount: overrides.sourceCount ?? 2,
    relatedArticles: overrides.relatedArticles,
    importanceScore: overrides.importanceScore ?? 82,
    importanceLabel: overrides.importanceLabel ?? "High",
    rankingSignals: overrides.rankingSignals ?? ["Fresh reporting in the current cycle."],
    eventIntelligence: overrides.eventIntelligence,
    homepageClassification:
      overrides.homepageClassification ?? {
        primaryCategory: "tech",
        secondaryCategories: [],
        confidence: 0.8,
        scores: { tech: 10, finance: 0, politics: 0 },
        matchedSignals: { tech: ["fixture"], finance: [], politics: [] },
      },
    explanationPacket: overrides.explanationPacket,
    signalRole: overrides.signalRole ?? "core",
    displayState: overrides.displayState ?? "new",
  };
}

function buildEvents(items: BriefingItem[]) {
  return buildHomepageEvents(items);
}

describe("homepage volume layers", () => {
  it("selectDevelopingNowEvents excludes IDs already used in Top 5", () => {
    const events = buildEvents([
      createItem({ id: "top-1", title: "Top event" }),
      createItem({ id: "candidate-1", title: "Developing event" }),
    ]);

    const result = selectDevelopingNowEvents(events, new Set(["top-1"]));

    expect(result.map((event) => event.id)).toEqual(["candidate-1"]);
  });

  it("selectDevelopingNowEvents prefers sources not already represented in Top 5", () => {
    const events = buildEvents([
      createItem({
        id: "top-1",
        title: "Top event",
        sources: [{ title: "Reuters World", url: "https://feeds.reuters.com/world" }],
      }),
      createItem({
        id: "same-source",
        title: "Same source follow-up",
        publishedAt: "2026-04-15T12:00:00.000Z",
        sources: [{ title: "Reuters Business", url: "https://feeds.reuters.com/business" }],
      }),
      createItem({
        id: "new-source",
        title: "Distinct source follow-up",
        publishedAt: "2026-04-15T12:00:00.000Z",
        sources: [{ title: "The Verge", url: "https://www.theverge.com/ai" }],
      }),
      createItem({
        id: "older-baseline",
        title: "Older baseline story",
        publishedAt: "2026-04-15T09:00:00.000Z",
        sources: [{ title: "Financial Times", url: "https://www.ft.com/content/example" }],
      }),
    ]);

    const result = selectDevelopingNowEvents(events, new Set(["top-1"]));

    expect(result[0]?.id).toBe("new-source");
  });

  it("selectDevelopingNowEvents breaks composite ties on freshness", () => {
    const events = buildEvents([
      createItem({
        id: "top-1",
        title: "Top event",
        sources: [{ title: "Reuters World", url: "https://feeds.reuters.com/world" }],
      }),
      createItem({
        id: "fresher-same-source",
        title: "Fresher same-source story",
        publishedAt: "2026-04-15T12:00:00.000Z",
        sources: [{ title: "Reuters Business", url: "https://feeds.reuters.com/business" }],
      }),
      createItem({
        id: "older-new-source",
        title: "Older distinct-source story",
        publishedAt: "2026-04-15T11:10:00.000Z",
        sources: [{ title: "The Verge", url: "https://www.theverge.com/ai" }],
      }),
      createItem({
        id: "oldest-baseline",
        title: "Oldest baseline story",
        publishedAt: "2026-04-15T10:20:00.000Z",
        sources: [{ title: "Financial Times", url: "https://www.ft.com/content/example" }],
      }),
    ]);

    const result = selectDevelopingNowEvents(events, new Set(["top-1"]));

    expect(result[0]?.id).toBe("fresher-same-source");
  });

  it("selectDevelopingNowEvents caps the list at 10 items", () => {
    const titles = [
      "Chip foundry roadmap shifts",
      "Treasury auction repricing lands",
      "White House sanctions debate grows",
      "Cloud contract renewal pressure builds",
      "Battery supply outlook changes",
      "Cyber insurance market resets",
      "Semiconductor export guidance tightens",
      "Ad market platform budgets soften",
      "Defense procurement review expands",
      "Retail margin warnings spread",
      "Telecom fiber spending rebounds",
      "Pharma trial sequencing changes",
    ];
    const items = [
      createItem({ id: "top-1", title: "Top event" }),
      ...titles.map((title, index) =>
        createItem({
          id: `candidate-${index + 1}`,
          title,
          topicId: `topic-${index + 1}`,
          topicName: `Topic ${index + 1}`,
          whatHappened: `${title} is evolving in its own topic area.`,
          matchedKeywords: [`keyword-${index + 1}`, `signal-${index + 1}`],
          publishedAt: `2026-04-15T${String(10 + index).padStart(2, "0")}:00:00.000Z`,
          sources: [{ title: `Source ${index + 1}`, url: `https://source${index + 1}.example.com/feed` }],
          homepageClassification: {
            primaryCategory: index % 3 === 0 ? "tech" : index % 3 === 1 ? "finance" : "politics",
            secondaryCategories: [],
            confidence: 0.8,
            scores: {
              tech: index % 3 === 0 ? 10 : 0,
              finance: index % 3 === 1 ? 10 : 0,
              politics: index % 3 === 2 ? 10 : 0,
            },
            matchedSignals: { tech: [], finance: [], politics: [] },
          },
        })),
    ];

    const result = selectDevelopingNowEvents(buildEvents(items), new Set(["top-1"]));

    expect(result).toHaveLength(10);
  });

  it("selectDevelopingNowEvents returns an empty array when the candidate pool is empty", () => {
    const events = buildEvents([createItem({ id: "top-1", title: "Top event" })]);

    const result = selectDevelopingNowEvents(events, new Set(["top-1"]));

    expect(result).toEqual([]);
  });

  it("selectDevelopingNowEvents preserves semantic dedup for repeat story families", () => {
    const events = buildEvents([
      createItem({
        id: "top-1",
        topicId: "finance",
        topicName: "Finance",
        title: "Treasury yields jump on inflation surprise",
        homepageClassification: {
          primaryCategory: "finance",
          secondaryCategories: [],
          confidence: 0.9,
          scores: { tech: 0, finance: 12, politics: 0 },
          matchedSignals: { tech: [], finance: ["rates"], politics: [] },
        },
      }),
      createItem({
        id: "apple-1",
        topicId: "tech",
        topicName: "Tech",
        title: "Apple delays Vision Pro launch timeline",
        whatHappened: "Multiple outlets say Apple is pushing back the Vision Pro schedule.",
        matchedKeywords: ["apple", "vision pro", "launch"],
        sources: [{ title: "The Verge", url: "https://www.theverge.com/apple-vision-pro-delay" }],
      }),
      createItem({
        id: "apple-2",
        topicId: "tech",
        topicName: "Tech",
        title: "Apple pushes back Vision Pro rollout plans",
        whatHappened: "A second cluster candidate describes the same Apple headset delay.",
        matchedKeywords: ["apple", "vision pro", "rollout"],
        publishedAt: "2026-04-15T12:30:00.000Z",
        sources: [{ title: "Ars Technica", url: "https://feeds.arstechnica.com/apple-vision-pro-rollout" }],
      }),
    ]);

    const result = selectDevelopingNowEvents(events, new Set(["top-1"]));

    const appleIds = result
      .map((event) => event.id)
      .filter((id) => id === "apple-1" || id === "apple-2");

    expect(appleIds).toHaveLength(1);
  });

  it("selectCategoryPreviewEvents filters to the matching category", () => {
    const events = buildEvents([
      createItem({
        id: "tech-1",
        homepageClassification: {
          primaryCategory: "tech",
          secondaryCategories: [],
          confidence: 0.8,
          scores: { tech: 11, finance: 0, politics: 0 },
          matchedSignals: { tech: ["fixture"], finance: [], politics: [] },
        },
      }),
      createItem({
        id: "finance-1",
        homepageClassification: {
          primaryCategory: "finance",
          secondaryCategories: [],
          confidence: 0.8,
          scores: { tech: 0, finance: 11, politics: 0 },
          matchedSignals: { tech: [], finance: ["fixture"], politics: [] },
        },
      }),
    ]);

    const result = selectCategoryPreviewEvents(events, new Set(), "tech");

    expect(result.map((event) => event.id)).toEqual(["tech-1"]);
  });

  it("selectCategoryPreviewEvents excludes already-used event IDs", () => {
    const events = buildEvents([
      createItem({ id: "tech-1" }),
      createItem({ id: "tech-2", publishedAt: "2026-04-15T12:00:00.000Z" }),
    ]);

    const result = selectCategoryPreviewEvents(events, new Set(["tech-2"]), "tech");

    expect(result.map((event) => event.id)).toEqual(["tech-1"]);
  });

  it("selectCategoryPreviewEvents respects the limit parameter", () => {
    const events = buildEvents([
      createItem({ id: "tech-1", publishedAt: "2026-04-15T10:00:00.000Z" }),
      createItem({ id: "tech-2", publishedAt: "2026-04-15T11:00:00.000Z" }),
      createItem({ id: "tech-3", publishedAt: "2026-04-15T12:00:00.000Z" }),
    ]);

    const result = selectCategoryPreviewEvents(events, new Set(), "tech", 2);

    expect(result.map((event) => event.id)).toEqual(["tech-3", "tech-2"]);
  });

  it("selectCategoryPreviewEvents returns an empty array when no eligible events exist", () => {
    const events = buildEvents([
      createItem({
        id: "finance-1",
        homepageClassification: {
          primaryCategory: "finance",
          secondaryCategories: [],
          confidence: 0.8,
          scores: { tech: 0, finance: 11, politics: 0 },
          matchedSignals: { tech: [], finance: ["fixture"], politics: [] },
        },
      }),
    ]);

    const result = selectCategoryPreviewEvents(events, new Set(), "politics");

    expect(result).toEqual([]);
  });

  it("buildVolumeLayersViewModel produces no overlap between Developing Now and category previews", () => {
    const events = buildEvents([
      createItem({
        id: "top-1",
        topicId: "finance",
        topicName: "Finance",
        title: "Treasury yields jump on inflation surprise",
        homepageClassification: {
          primaryCategory: "finance",
          secondaryCategories: [],
          confidence: 0.9,
          scores: { tech: 0, finance: 12, politics: 0 },
          matchedSignals: { tech: [], finance: ["rates"], politics: [] },
        },
        sources: [{ title: "Reuters World", url: "https://feeds.reuters.com/world" }],
      }),
      createItem({
        id: "developing-1",
        topicId: "tech",
        topicName: "Tech",
        title: "The Verge reports new AI server demand spike",
        publishedAt: "2026-04-15T12:00:00.000Z",
        sources: [{ title: "The Verge", url: "https://www.theverge.com/ai-demand" }],
      }),
      createItem({
        id: "developing-2",
        topicId: "tech",
        topicName: "Tech",
        title: "Ars follows the same server-demand thread",
        whatHappened: "A near-duplicate tech event describes the same shift.",
        matchedKeywords: ["ai", "server", "demand"],
        publishedAt: "2026-04-15T11:55:00.000Z",
        sources: [{ title: "Ars Technica", url: "https://feeds.arstechnica.com/ai-demand" }],
      }),
      createItem({
        id: "finance-1",
        topicId: "finance",
        topicName: "Finance",
        title: "Markets digest a fresh rate-cut repricing",
        publishedAt: "2026-04-15T11:00:00.000Z",
        homepageClassification: {
          primaryCategory: "finance",
          secondaryCategories: [],
          confidence: 0.8,
          scores: { tech: 0, finance: 11, politics: 0 },
          matchedSignals: { tech: [], finance: ["fixture"], politics: [] },
        },
      }),
      createItem({
        id: "politics-1",
        topicId: "politics",
        topicName: "Politics",
        title: "White House weighs another sanctions package",
        publishedAt: "2026-04-15T10:30:00.000Z",
        homepageClassification: {
          primaryCategory: "politics",
          secondaryCategories: [],
          confidence: 0.8,
          scores: { tech: 0, finance: 0, politics: 11 },
          matchedSignals: { tech: [], finance: [], politics: ["fixture"] },
        },
      }),
    ]);

    const result = buildVolumeLayersViewModel(events, new Set(["top-1"]));
    const developingIds = new Set(result.developingNow.map((event) => event.id));
    const categoryIds = Object.values(result.categoryPreviews).flat().map((event) => event.id);

    expect(categoryIds.some((id) => developingIds.has(id))).toBe(false);
  });
});
