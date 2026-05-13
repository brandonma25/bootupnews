import type { ReactNode } from "react";

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PersonalizedDashboard from "@/components/dashboard/personalized-dashboard";
import type { BriefingItem, DashboardData } from "@/lib/types";

vi.mock("@/app/actions", () => ({
  markAllReadAction: vi.fn(),
  toggleReadAction: vi.fn(),
}));

vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/dashboard/manual-refresh-trigger", () => ({
  ManualRefreshTrigger: () => <div>refresh-trigger</div>,
}));

vi.mock("@/components/guest-value-preview", () => ({
  GuestValuePreview: () => <div>guest-preview</div>,
}));

vi.mock("@/components/page-header", () => ({
  PageHeader: ({ title, description, aside }: { title: string; description: string; aside?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {aside}
    </div>
  ),
}));

function createItem(overrides: Partial<BriefingItem> = {}): BriefingItem {
  const id = overrides.id ?? "item-1";
  const rank = overrides.importanceScore ?? 50;

  return {
    id,
    topicId: overrides.topicId ?? `topic-${id}`,
    topicName: overrides.topicName ?? "Tech",
    title: overrides.title ?? `Signal ${id}`,
    whatHappened: overrides.whatHappened ?? `What happened for ${id}`,
    keyPoints: overrides.keyPoints ?? ["Point one", "Point two", "Point three"],
    whyItMatters: overrides.whyItMatters ?? `Why ${id} matters`,
    sources:
      overrides.sources ?? [
        { title: "Source One", url: `https://example.com/${id}/1` },
        { title: "Source Two", url: `https://example.com/${id}/2` },
      ],
    estimatedMinutes: overrides.estimatedMinutes ?? 4,
    read: overrides.read ?? false,
    priority: overrides.priority ?? "normal",
    matchedKeywords: overrides.matchedKeywords ?? ["AI"],
    sourceCount: overrides.sourceCount ?? 2,
    importanceScore: rank,
    importanceLabel:
      overrides.importanceLabel ?? (rank >= 80 ? "Critical" : rank >= 65 ? "High" : "Watch"),
    publishedAt: overrides.publishedAt ?? "2026-04-19T08:00:00.000Z",
    rankingSignals: overrides.rankingSignals ?? ["High signal"],
    eventIntelligence: overrides.eventIntelligence ?? {
      id: `intelligence-${id}`,
      title: overrides.title ?? `Signal ${id}`,
      summary: "Summary",
      primaryChange: "Primary change",
      entities: ["OpenAI"],
      sourceNames: ["Source One", "Source Two"],
      eventType: "market",
      primaryImpact: "business",
      affectedMarkets: ["tech"],
      timeHorizon: "short",
      signalStrength: "strong",
      keyEntities: ["OpenAI"],
      topics: [overrides.topicName ?? "Tech"],
      signals: {
        articleCount: overrides.sourceCount ?? 2,
        sourceDiversity: overrides.sourceCount ?? 2,
        recencyScore: 90,
        velocityScore: 75,
      },
      rankingScore: rank,
      rankingReason: `Ranked ${rank}`,
      confidenceScore: 80,
      isHighSignal: true,
      createdAt: overrides.publishedAt ?? "2026-04-19T08:00:00.000Z",
    },
  };
}

function createDashboardData(items: BriefingItem[]): DashboardData {
  return {
    mode: "public",
    briefing: {
      id: "briefing-1",
      briefingDate: "2026-04-19T08:00:00.000Z",
      title: "Bootup News",
      intro: "Intro",
      readingWindow: "20 minutes",
      items,
    },
    topics: [
      {
        id: "topic-tech",
        name: "Tech",
        description: "Tech coverage",
        color: "#1F4F46",
      },
    ],
    sources: [],
  };
}

describe("PersonalizedDashboard", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
    });
  });

  it("caps the display at five ranked signals and splits them into core and context tiers", () => {
    const items = [
      createItem({ id: "sixth", title: "Sixth ranked", importanceScore: 40 }),
      createItem({ id: "second", title: "Second ranked", importanceScore: 90 }),
      createItem({ id: "fifth", title: "Fifth ranked", importanceScore: 60 }),
      createItem({ id: "first", title: "First ranked", importanceScore: 98 }),
      createItem({ id: "fourth", title: "Fourth ranked", importanceScore: 70 }),
      createItem({ id: "third", title: "Third ranked", importanceScore: 80 }),
    ];

    render(
      <PersonalizedDashboard
        searchParams={{}}
        data={createDashboardData(items)}
        viewer={null}
        isAiConfigured
      />,
    );

    expect(screen.getByRole("heading", { name: "Core Signals" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Context Signals" })).toBeInTheDocument();
    expect(screen.getAllByText("Core Signal")).toHaveLength(3);
    expect(screen.getAllByText("Context Signal")).toHaveLength(2);
    expect(screen.getByText("First ranked")).toBeInTheDocument();
    expect(screen.getByText("Second ranked")).toBeInTheDocument();
    expect(screen.getByText("Third ranked")).toBeInTheDocument();
    expect(screen.getByText("Fourth ranked")).toBeInTheDocument();
    expect(screen.getByText("Fifth ranked")).toBeInTheDocument();
    expect(screen.queryByText("Sixth ranked")).not.toBeInTheDocument();
    const hiddenMetric = screen.getByText("Hidden beyond cap").closest("div");
    expect(hiddenMetric).not.toBeNull();
    expect(within(hiddenMetric as HTMLElement).getByText("1")).toBeInTheDocument();
  });

  it("renders a clean empty state when no signals are available", () => {
    render(
      <PersonalizedDashboard
        searchParams={{}}
        data={createDashboardData([])}
        viewer={null}
        isAiConfigured
      />,
    );

    expect(
      screen.getByText(/no signals qualified for this briefing yet/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Core Signals" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Context Signals" })).not.toBeInTheDocument();
  });
});
