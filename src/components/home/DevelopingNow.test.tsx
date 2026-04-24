import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DevelopingNow } from "@/components/home/DevelopingNow";
import type { HomepageEvent } from "@/lib/homepage-model";

function createEvent(overrides: Partial<HomepageEvent> = {}): HomepageEvent {
  return {
    id: overrides.id ?? "event-1",
    topicName: overrides.topicName ?? "Tech",
    title: overrides.title ?? "AI server demand accelerates",
    whatHappened: overrides.whatHappened ?? "Vendors are expanding supply for AI infrastructure.",
    keyPoints: overrides.keyPoints ?? ["Point one", "Point two", "Point three"],
    summary: overrides.summary ?? "Vendors are expanding supply.",
    trustLayer: overrides.trustLayer ?? {
      sourceLabel: "2 sources",
      sourceTone: "supported",
      confidenceLabel: "High confidence",
      confidenceTone: "supported",
      recencyLabel: "Fresh",
      impactLabel: "High impact",
      impactTone: "supported",
      corroborationLabel: "Multi-source",
      corroborationTone: "supported",
      sourceNames: ["The Verge", "Ars Technica"],
      explanationMode: "deterministic",
      unknowns: [],
      debugLines: [],
    },
    whyItMatters: overrides.whyItMatters ?? "This changes platform planning.",
    whyThisIsHere: overrides.whyThisIsHere ?? "Top signal in Tech.",
    relatedArticles:
      overrides.relatedArticles ?? [
        {
          title: "AI demand story",
          url: "https://www.theverge.com/ai-demand",
          sourceName: "The Verge",
        },
      ],
    timeline: overrides.timeline ?? [],
    estimatedMinutes: overrides.estimatedMinutes ?? 4,
    importanceLabel: overrides.importanceLabel ?? "High",
    rankingSignals: overrides.rankingSignals ?? ["Fresh reporting"],
    rankingDisplaySignals: overrides.rankingDisplaySignals ?? ["Fresh reporting"],
    matchedKeywords: overrides.matchedKeywords ?? ["ai"],
    priority: overrides.priority ?? "top",
    publishedAt: overrides.publishedAt ?? "2026-04-15T08:00:00.000Z",
    signalRole: overrides.signalRole ?? "core",
    rankScore: overrides.rankScore ?? 100,
    sourceCount: overrides.sourceCount ?? 2,
    classification:
      overrides.classification ?? {
        primaryCategory: "tech",
        secondaryCategories: [],
        confidence: 0.8,
        scores: { tech: 10, finance: 0, politics: 0 },
        matchedSignals: { tech: ["fixture"], finance: [], politics: [] },
      },
    intelligence: overrides.intelligence ?? {
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
      keyEntities: ["AI"],
    },
    personalization: overrides.personalization ?? {
      matchedTopicIds: [],
      matchedSourceIds: [],
      matchedEntityNames: [],
      score: 0,
      explanation: "No personalization boost.",
    },
    semanticFingerprint: overrides.semanticFingerprint ?? "tech:ai:server-demand",
  };
}

describe("DevelopingNow", () => {
  it("renders a section heading when events are provided", () => {
    render(<DevelopingNow events={[createEvent()]} />);

    expect(screen.getByRole("heading", { name: "Developing Now" })).toBeInTheDocument();
  });

  it("renders one card per event", () => {
    render(
      <DevelopingNow
        events={[
          createEvent({ id: "event-1", title: "First event" }),
          createEvent({ id: "event-2", title: "Second event" }),
        ]}
      />,
    );

    expect(screen.getByText("First event")).toBeInTheDocument();
    expect(screen.getByText("Second event")).toBeInTheDocument();
  });

  it("returns null when the events array is empty", () => {
    const { container } = render(<DevelopingNow events={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
