import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CategoryPreviewGrid } from "@/components/home/CategoryPreviewGrid";
import type { HomepageCategoryPreviewMap, HomepageEvent } from "@/lib/homepage-model";

function createEvent(
  id: string,
  title: string,
  category: HomepageEvent["classification"]["primaryCategory"],
): HomepageEvent {
  return {
    id,
    topicName: title,
    title,
    whatHappened: `${title} summary`,
    keyPoints: ["Point one", "Point two", "Point three"],
    summary: `${title} summary`,
    trustLayer: {
      sourceLabel: "2 sources",
      sourceTone: "supported",
      confidenceLabel: "High confidence",
      confidenceTone: "supported",
      recencyLabel: "Fresh",
      impactLabel: "High impact",
      impactTone: "supported",
      corroborationLabel: "Multi-source",
      corroborationTone: "supported",
      sourceNames: ["Source One"],
      explanationMode: "deterministic",
      unknowns: [],
      debugLines: [],
    },
    whyItMatters: "It matters.",
    whyThisIsHere: "It belongs here.",
    relatedArticles: [{ title, url: `https://example.com/${id}`, sourceName: "Source One" }],
    timeline: [],
    estimatedMinutes: 4,
    importanceLabel: "High",
    rankingSignals: ["Fresh reporting"],
    rankingDisplaySignals: ["Fresh reporting"],
    matchedKeywords: ["keyword"],
    priority: "top",
    publishedAt: "2026-04-15T08:00:00.000Z",
    signalRole: "core",
    rankScore: 100,
    sourceCount: 2,
    classification: {
      primaryCategory: category,
      secondaryCategories: [],
      confidence: 0.8,
      scores: { tech: category === "tech" ? 10 : 0, finance: category === "finance" ? 10 : 0, politics: category === "politics" ? 10 : 0 },
      matchedSignals: { tech: [], finance: [], politics: [] },
    },
    intelligence: {
      sourceLabel: "2 sources",
      confidenceLabel: "High confidence",
      confidenceTone: "supported",
      corroborationLabel: "Multi-source",
      corroborationTone: "supported",
      impactLabel: "High impact",
      impactTone: "supported",
      recencyLabel: "Fresh",
      isEarlySignal: false,
      sourceCount: 2,
      sourceDiversity: 2,
      confidenceScore: 0.8,
      recencyScore: 0.8,
      velocityScore: 0.5,
      rankingReason: "Fresh reporting",
      keyEntities: ["Entity"],
    },
    personalization: {
      matchedTopicIds: [],
      matchedSourceIds: [],
      matchedEntityNames: [],
      score: 0,
      explanation: "No personalization boost.",
    },
    semanticFingerprint: `${category}:${id}`,
  };
}

describe("CategoryPreviewGrid", () => {
  it("hides the entire By Category grid when every category preview is empty", () => {
    const { container } = render(
      <CategoryPreviewGrid
        categoryPreviews={{
          tech: [],
          finance: [],
          politics: [],
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("heading", { name: "Tech" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Finance" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Politics" })).not.toBeInTheDocument();
  });

  it("renders three category subsections with the correct labels when at least one category has events", () => {
    render(
      <CategoryPreviewGrid
        categoryPreviews={{
          tech: [],
          finance: [createEvent("finance-1", "Finance event", "finance")],
          politics: [],
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tech" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Finance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Politics" })).toBeInTheDocument();
  });

  it("renders events in each subsection matching the input", () => {
    const categoryPreviews: HomepageCategoryPreviewMap = {
      tech: [createEvent("tech-1", "Tech event", "tech")],
      finance: [createEvent("finance-1", "Finance event", "finance")],
      politics: [createEvent("politics-1", "Politics event", "politics")],
    };

    render(<CategoryPreviewGrid categoryPreviews={categoryPreviews} />);

    expect(screen.getByText("Tech event")).toBeInTheDocument();
    expect(screen.getByText("Finance event")).toBeInTheDocument();
    expect(screen.getByText("Politics event")).toBeInTheDocument();
  });

  it("renders an empty-state message for any category with zero events", () => {
    render(
      <CategoryPreviewGrid
        categoryPreviews={{
          tech: [],
          finance: [createEvent("finance-1", "Finance event", "finance")],
          politics: [],
        }}
      />,
    );

    expect(screen.getByText("No tech stories in today's briefing.")).toBeInTheDocument();
    expect(screen.getByText("No politics stories in today's briefing.")).toBeInTheDocument();
  });

  it("preserves category ordering as Tech, Finance, Politics", () => {
    render(
      <CategoryPreviewGrid
        categoryPreviews={{
          tech: [createEvent("tech-1", "Tech event", "tech")],
          finance: [createEvent("finance-1", "Finance event", "finance")],
          politics: [createEvent("politics-1", "Politics event", "politics")],
        }}
      />,
    );

    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .filter((heading) => heading.id.startsWith("category-preview-"))
      .map((heading) => heading.textContent);

    expect(headings).toEqual(["Tech", "Finance", "Politics"]);
  });
});
