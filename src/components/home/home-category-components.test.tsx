import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { BriefingCardCategory } from "@/components/home/BriefingCardCategory";
import { CategoryTabStrip } from "@/components/home/CategoryTabStrip";
import type { HomepageCategorySection, HomepageEvent } from "@/lib/homepage-model";

function createEvent(overrides: Partial<HomepageEvent> = {}): HomepageEvent {
  return {
    id: overrides.id ?? "event-1",
    topicName: overrides.topicName ?? "Tech",
    title: overrides.title ?? "AI chip capacity expands",
    whatHappened: overrides.whatHappened ?? "Chip makers are expanding capacity for AI platforms.",
    keyPoints: overrides.keyPoints ?? ["Point one", "Point two", "Point three"],
    summary: overrides.summary ?? "Chip makers are expanding capacity.",
    trustLayer: overrides.trustLayer ?? {
      heading: "Why it matters",
      body: "Capacity changes platform plans.",
      supportingSignals: [],
      tier: "medium",
    },
    whyItMatters: overrides.whyItMatters ?? "Capacity changes platform plans.",
    whyThisIsHere: overrides.whyThisIsHere ?? "It cleared the homepage threshold.",
    relatedArticles: overrides.relatedArticles ?? [],
    timeline: overrides.timeline ?? [],
    estimatedMinutes: overrides.estimatedMinutes ?? 3,
    rankingSignals: overrides.rankingSignals ?? [],
    rankingDisplaySignals: overrides.rankingDisplaySignals ?? [],
    matchedKeywords: overrides.matchedKeywords ?? ["AI", "chips"],
    priority: overrides.priority ?? "top",
    signalRole: overrides.signalRole ?? "core",
    rankScore: overrides.rankScore ?? 10,
    sourceCount: overrides.sourceCount ?? 2,
    classification: overrides.classification ?? {
      primaryCategory: "tech",
      secondaryCategories: [],
      confidence: 0.8,
      scores: { tech: 9, finance: 0, politics: 0 },
      matchedSignals: { tech: ["AI"], finance: [], politics: [] },
    },
    intelligence: overrides.intelligence ?? {
      sourceCount: 2,
      sourceLabel: "2 sources",
      impactLabel: "High impact",
      confidenceLabel: "High confidence",
      confidenceTone: "high",
      recencyLabel: "Fresh",
      timelineIndicator: "New",
      keyEntities: ["Nvidia"],
      isEarlySignal: false,
      rankingReason: "It cleared the homepage threshold.",
    },
    personalization: overrides.personalization ?? {
      active: false,
      bonus: 0,
      matchedTopics: [],
      matchedEntities: [],
      reason: null,
      shortReason: null,
    },
    semanticFingerprint: overrides.semanticFingerprint ?? "tech:nvidia:ai-chip",
    eventIntelligence: overrides.eventIntelligence,
    importanceLabel: overrides.importanceLabel,
  };
}

function createSection(overrides: Partial<HomepageCategorySection>): HomepageCategorySection {
  return {
    key: overrides.key ?? "tech",
    label: overrides.label ?? "Tech",
    description: overrides.description ?? "Technology coverage.",
    events: overrides.events ?? [],
    fallbackEvents: overrides.fallbackEvents ?? [],
    placeholderCount: overrides.placeholderCount ?? 0,
    state: overrides.state ?? "empty",
    emptyReason: overrides.emptyReason ?? "No events.",
    excludedReasons: overrides.excludedReasons ?? [],
  };
}

describe("CategoryTabStrip", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders top events by default and keeps category tabs visible even when some are empty", () => {
    render(
      <CategoryTabStrip
        topEvents={[createEvent({ id: "top-1", title: "Top ranked event" })]}
        categorySections={[
          createSection({ key: "tech", label: "Tech", events: [createEvent({ id: "tech-1", title: "Tech category event" })], state: "sparse" }),
          createSection({ key: "finance", label: "Finance", events: [] }),
        ]}
        renderTopEvent={(event) => <article>{event.title}</article>}
        renderCategoryEvent={(event) => <article>{event.title}</article>}
      />,
    );

    expect(screen.getByRole("tab", { name: "Top Events" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Tech" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Finance" })).toBeInTheDocument();
    expect(screen.getByText("Top ranked event")).toBeInTheDocument();
  });

  it("switches visible cards on tab click without requesting new data", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
    const renderTopEvent = vi.fn((event: HomepageEvent) => <article>{event.title}</article>);
    const renderCategoryEvent = vi.fn((event: HomepageEvent) => <article>{event.title}</article>);

    render(
      <CategoryTabStrip
        topEvents={[createEvent({ id: "top-1", title: "Top ranked event" })]}
        categorySections={[
          createSection({ key: "politics", label: "Politics", events: [createEvent({ id: "politics-1", title: "Politics category event" })], state: "sparse" }),
        ]}
        renderTopEvent={renderTopEvent}
        renderCategoryEvent={renderCategoryEvent}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Politics" }));

    expect(screen.queryByText("Top ranked event")).not.toBeInTheDocument();
    expect(screen.getByText("Politics category event")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("lets signed-in users open populated category tabs without the soft gate", () => {
    render(
      <CategoryTabStrip
        topEvents={[createEvent({ id: "top-1", title: "Top ranked event" })]}
        categorySections={[
          createSection({
            key: "tech",
            label: "Tech",
            events: [createEvent({ id: "tech-1", title: "Tech category event" })],
            state: "sparse",
          }),
          createSection({ key: "finance", label: "Finance", events: [] }),
        ]}
        isAuthenticated
        gatedCategoryState={<div>Sign up to be notified when new signals are published.</div>}
        renderTopEvent={(event) => <article>{event.title}</article>}
        renderCategoryEvent={(event) => <article>{event.title}</article>}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Tech" }));

    expect(screen.getByRole("tab", { name: "Tech" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Tech category event")).toBeInTheDocument();
    expect(screen.queryByText("Top ranked event")).not.toBeInTheDocument();
    expect(screen.queryByText("Sign up to be notified when new signals are published.")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Finance" })).toBeInTheDocument();
  });

  it("keeps signed-in category tabs visible even when a section is empty", () => {
    render(
      <CategoryTabStrip
        topEvents={[createEvent({ id: "top-1", title: "Top ranked event" })]}
        categorySections={[
          createSection({ key: "tech", label: "Tech", events: [] }),
          createSection({ key: "finance", label: "Finance", events: [] }),
          createSection({ key: "politics", label: "Politics", events: [] }),
        ]}
        isAuthenticated
        renderTopEvent={(event) => <article>{event.title}</article>}
        renderCategoryEvent={(event) => <article>{event.title}</article>}
      />,
    );

    expect(screen.getByRole("tab", { name: "Top Events" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Tech" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Finance" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Politics" })).toBeInTheDocument();
    expect(screen.getByText("Top ranked event")).toBeInTheDocument();
  });

  it("renders a dismissible inline gate for signed-out category tabs without duplicating Top Events", () => {
    render(
      <CategoryTabStrip
        topEvents={[createEvent({ id: "top-1", title: "Top ranked event" })]}
        categorySections={[
          createSection({ key: "tech", label: "Tech", events: [createEvent({ id: "tech-1", title: "Tech category event" })], state: "sparse" }),
        ]}
        isAuthenticated={false}
        gatedCategoryState={({ onDismiss }) => (
          <div>
            <p>Sign up to be notified when new signals are published.</p>
            <button type="button" onClick={onDismiss}>Dismiss</button>
          </div>
        )}
        renderTopEvent={(event) => <article>{event.title}</article>}
        renderCategoryEvent={(event) => <article>{event.title}</article>}
      />,
    );

    expect(screen.queryByText("Sign up to be notified when new signals are published.")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Top Events" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "Tech" }));

    expect(screen.getByText("Sign up to be notified when new signals are published.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tech" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText("Top ranked event")).not.toBeInTheDocument();
    expect(screen.getByText("Tech category event")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.getByRole("tab", { name: "Top Events" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText("Sign up to be notified when new signals are published.")).not.toBeInTheDocument();
    expect(screen.getByText("Top ranked event")).toBeInTheDocument();
  });

  it("keeps signed-out category tabs available and shows an honest empty state when a section is empty", () => {
    render(
      <CategoryTabStrip
        topEvents={[createEvent({ id: "top-1", title: "Top ranked event" })]}
        categorySections={[
          createSection({ key: "tech", label: "Tech", events: [], emptyReason: "No major tech signals in today's briefing." }),
          createSection({ key: "finance", label: "Finance", events: [], emptyReason: "No major finance signals in today's briefing." }),
          createSection({ key: "politics", label: "Politics", events: [], emptyReason: "No major politics signals in today's briefing." }),
        ]}
        isAuthenticated={false}
        gatedCategoryState={<div>Sign up to be notified when new signals are published.</div>}
        renderTopEvent={(event) => <article>{event.title}</article>}
        renderCategoryEvent={(event) => <article>{event.title}</article>}
      />,
    );

    expect(screen.getByRole("tab", { name: "Tech" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Finance" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Politics" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Finance" }));

    expect(screen.queryByText("Sign up to be notified when new signals are published.")).not.toBeInTheDocument();
    expect(screen.getByText("No major finance signals in today's briefing.")).toBeInTheDocument();
    expect(screen.queryByText("Top ranked event")).not.toBeInTheDocument();
  });
});

describe("BriefingCardCategory", () => {
  it("renders title, what happened, and source pills from source titles", () => {
    render(
      <BriefingCardCategory
        item={{
          title: "Bank earnings reset expectations",
          whatHappened: "Banks are changing guidance after earnings.",
          sources: [
            { title: "Reuters", url: "https://www.reuters.com/example" },
            { title: "Bloomberg", url: "https://www.bloomberg.com/example" },
          ],
        }}
      />,
    );

    expect(screen.getByText("Bank earnings reset expectations")).toBeInTheDocument();
    expect(screen.getByText("Banks are changing guidance after earnings.")).toBeInTheDocument();
    expect(screen.getByText("Reuters")).toBeInTheDocument();
    expect(screen.getByText("Bloomberg")).toBeInTheDocument();
    expect(screen.queryByText(/why it matters/i)).not.toBeInTheDocument();
  });

  it("renders loading and error states", () => {
    const { rerender } = render(<BriefingCardCategory loading />);

    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "true");

    rerender(<BriefingCardCategory errorMessage="Category card failed" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Category card failed");
  });
});
