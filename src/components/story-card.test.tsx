import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StoryCard } from "@/components/story-card";
import type { BriefingItem } from "@/lib/types";

function createItem(overrides: Partial<BriefingItem>): BriefingItem {
  return {
    id: overrides.id ?? "item-1",
    topicId: overrides.topicId ?? "topic-1",
    topicName: overrides.topicName ?? "Finance",
    title: overrides.title ?? "Fed signals rates will stay elevated",
    whatHappened: overrides.whatHappened ?? "Markets are repricing after the latest Fed signal.",
    keyPoints: overrides.keyPoints ?? ["Point one", "Point two", "Point three"],
    whyItMatters: overrides.whyItMatters ?? "It matters because markets are repricing.",
    sources: overrides.sources ?? [{ title: "Reuters", url: "https://example.com/story" }],
    estimatedMinutes: overrides.estimatedMinutes ?? 4,
    read: overrides.read ?? false,
    priority: overrides.priority ?? "top",
    matchedKeywords: overrides.matchedKeywords ?? ["fed"],
    sourceCount: overrides.sourceCount ?? 1,
    timeline: overrides.timeline,
    rankingSignals: overrides.rankingSignals ?? [],
    eventIntelligence: overrides.eventIntelligence,
  };
}

describe("StoryCard timeline", () => {
  it("renders grouped timeline entries", () => {
    render(
      <StoryCard
        item={createItem({
          timeline: [
            {
              dateKey: "2026-04-10",
              dateLabel: "Apr 10",
              entries: [
                {
                  title: "First update",
                  summary: "Initial report",
                  source: "Reuters",
                },
                {
                  title: "Second update",
                  summary: "Follow-up report",
                  source: "Bloomberg",
                },
              ],
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText("Apr 10")).toBeInTheDocument();
    expect(screen.getByText("First update")).toBeInTheDocument();
    expect(screen.getByText("Second update")).toBeInTheDocument();
  });

  it("renders the developing-story state for a single timeline article", () => {
    render(
      <StoryCard
        item={createItem({
          timeline: [
            {
              dateKey: "2026-04-10",
              dateLabel: "Apr 10",
              entries: [
                {
                  title: "Only update",
                  summary: "Initial report",
                  source: "Reuters",
                },
              ],
            },
          ],
        })}
      />,
    );

    expect(screen.getByText(/Developing story/i)).toBeInTheDocument();
  });

  it("renders the no-timeline state when data is missing", () => {
    render(<StoryCard item={createItem({ timeline: [] })} />);

    expect(screen.getByText("No timeline available yet")).toBeInTheDocument();
  });

  it("shows compact ranking explainability signals on the card", () => {
    render(
      <StoryCard
        item={createItem({
          publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          eventIntelligence: {
            id: "intel-1",
            title: "Fed signals rates will stay elevated",
            summary: "Markets are repricing after the latest Fed signal.",
            primaryChange: "Fed signaled rates will stay elevated",
            entities: ["Federal Reserve"],
            eventType: "macro_market_move",
            primaryImpact: "The signal could change rate expectations and sector pricing.",
            affectedMarkets: ["rates", "equities"],
            timeHorizon: "medium",
            signalStrength: "strong",
            keyEntities: ["Federal Reserve"],
            topics: ["finance"],
            signals: {
              articleCount: 5,
              sourceDiversity: 3,
              recencyScore: 88,
              velocityScore: 80,
            },
            rankingScore: 79,
            rankingReason:
              "Broad coverage around the Federal Reserve across 5 articles from 3 sources.",
            confidenceScore: 77,
            isHighSignal: true,
            createdAt: "2026-04-15T08:00:00.000Z",
          },
        })}
      />,
    );

    expect(screen.getByText("Why this ranks")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Broad coverage around the Federal Reserve across 5 articles from 3 sources/i)
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Covered by 5 articles")).toBeInTheDocument();
    expect(screen.getByText("Seen across 3 sources")).toBeInTheDocument();
  });

  it("prefers the mapped why-it-matters copy when event intelligence is present", () => {
    render(
      <StoryCard
        item={createItem({
          whyItMatters: "Google's Chrome rollout matters because 4 articles from 3 sources tie Google and Chrome to a measurable shift in browsing behavior.",
          eventIntelligence: {
            id: "intel-2",
            title: "Google adds AI Mode to Chrome",
            summary: "The feature extends browser-integrated AI navigation inside Chrome.",
            primaryChange: "Google added AI Mode to Chrome",
            entities: ["Google", "Chrome"],
            eventType: "product",
            primaryImpact: "The change could alter search behavior and Chrome engagement.",
            affectedMarkets: ["adoption", "competitive feature dynamics"],
            timeHorizon: "medium",
            signalStrength: "moderate",
            keyEntities: ["Google", "Chrome"],
            topics: ["tech"],
            signals: {
              articleCount: 4,
              sourceDiversity: 3,
              recencyScore: 81,
              velocityScore: 62,
            },
            rankingScore: 72,
            rankingReason: "Broad coverage centered on Chrome's AI-assisted browsing changes.",
            confidenceScore: 79,
            isHighSignal: true,
            createdAt: "2026-04-19T08:00:00.000Z",
          },
        })}
      />,
    );

    expect(
      screen.getByText(
        "Google's Chrome rollout matters because 4 articles from 3 sources tie Google and Chrome to a measurable shift in browsing behavior.",
      ),
    ).toBeInTheDocument();
  });
});
