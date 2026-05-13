import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DateBadge } from "@/components/signals/DateBadge";
import { SignalCard } from "@/components/signals/SignalCard";
import { TierBadge } from "@/components/signals/TierBadge";

describe("Boot Up visual system components", () => {
  it("renders the Core tier marker with a zero-padded rank", () => {
    render(<TierBadge tier="core" rank={3} />);

    expect(screen.getByText("Core signal · 03")).toBeInTheDocument();
  });

  it("renders the date badge with the weekday accent text", () => {
    render(<DateBadge date={new Date("2026-05-13T12:00:00.000Z")} />);

    expect(screen.getByText("Wednesday")).toBeInTheDocument();
    expect(screen.getByText(/May 13, 2026/)).toBeInTheDocument();
  });

  it("renders a collapsed SignalCard face without old chrome", () => {
    render(
      <SignalCard
        rank={1}
        signal={{
          id: "signal-1",
          title: "Congress resets the privacy fight",
          whyItMatters: "The decision changes what young readers need to know about surveillance and platform accountability.",
          sourceName: "The Verge",
          sourceUrl: "https://www.theverge.com/story",
          relatedArticles: [
            {
              title: "Privacy fight resumes",
              sourceName: "The Verge",
              url: "https://www.theverge.com/story",
            },
          ],
        }}
        readMoreHref="/briefing/2026-05-13"
      />,
    );

    expect(screen.getByText("Core signal · 01")).toBeInTheDocument();
    expect(screen.getByText("Why this matters")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read more →" })).toHaveAttribute(
      "href",
      "/briefing/2026-05-13",
    );
    expect(screen.queryByText(/min read/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Details")).not.toBeInTheDocument();
    expect(screen.queryByText("Tech")).not.toBeInTheDocument();
  });

  it("renders expanded structured sections and supporting coverage only in expanded mode", () => {
    const signal = {
      id: "signal-2",
      title: "Markets reprice rate expectations",
      whatHappened: "Bond markets moved after the latest inflation print.",
      whyItMatters: "Higher-for-longer rates can change borrowing costs and risk appetite.",
      sourceName: "Reuters",
      sourceUrl: "https://www.reuters.com/story",
      relatedArticles: [
        {
          title: "Markets reprice rates",
          sourceName: "Reuters",
          url: "https://www.reuters.com/story",
        },
      ],
    };

    const { rerender } = render(<SignalCard signal={signal} rank={2} />);

    expect(screen.queryByText("What happened")).not.toBeInTheDocument();
    expect(screen.queryByText("Supporting coverage")).not.toBeInTheDocument();

    rerender(<SignalCard signal={signal} rank={2} expanded />);

    expect(screen.getByText("What happened")).toBeInTheDocument();
    expect(screen.getByText("Supporting coverage")).toBeInTheDocument();
  });

  it("opens its own depth in place when defaultExpanded is provided", () => {
    const signal = {
      id: "signal-interactive",
      title: "Interactive expansion test",
      whatHappened: "Bond markets moved after the latest inflation print.",
      whyItMatters: "Higher-for-longer rates change borrowing costs and risk appetite.",
      sourceName: "Reuters",
      sourceUrl: "https://www.reuters.com/story",
    };

    render(<SignalCard signal={signal} rank={1} defaultExpanded={false} />);

    const card = screen.getByTestId("signal-card");
    expect(card).toHaveAttribute("data-signal-expanded", "false");
    expect(screen.queryByText("What happened")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Read more →" })).toBeNull();

    const toggle = screen.getByTestId("signal-card-toggle");
    expect(toggle).toHaveAccessibleName(/expand/i);

    fireEvent.click(toggle);

    expect(card).toHaveAttribute("data-signal-expanded", "true");
    expect(screen.getByText("What happened")).toBeInTheDocument();
    expect(toggle).toHaveAccessibleName(/collapse/i);
  });

  it("starts expanded when defaultExpanded is true", () => {
    const signal = {
      id: "signal-default-open",
      title: "Briefing detail surface card",
      whatHappened: "Source headline body.",
      whyItMatters: "Editorial body.",
      sourceName: "Reuters",
      sourceUrl: "https://www.reuters.com/story",
    };

    render(<SignalCard signal={signal} rank={1} defaultExpanded />);

    const card = screen.getByTestId("signal-card");
    expect(card).toHaveAttribute("data-signal-expanded", "true");
    expect(screen.getByText("What happened")).toBeInTheDocument();
    expect(screen.getByTestId("signal-card-toggle")).toHaveAccessibleName(/collapse/i);
  });

  it("renders What happened in sans and the other depth sections in serif", () => {
    const signal = {
      id: "signal-sans-vs-serif",
      title: "Typography differentiation",
      whatHappened: "Factual source-headline body for the What happened layer.",
      whyItMatters: "Editorial reasoning lives in serif voice.",
      sourceName: "Reuters",
      sourceUrl: "https://www.reuters.com/story",
    };

    render(<SignalCard signal={signal} rank={1} defaultExpanded />);

    // What happened body — sans treatment for the factual layer.
    const whatHappenedBody = screen.getByText(
      /Factual source-headline body for the What happened layer/,
    );
    expect(whatHappenedBody).toHaveClass("font-sans");
    expect(whatHappenedBody).not.toHaveClass("font-heading");

    // Why this matters body appears in two places when expanded: the
    // preview (line-clamped, above the footer) and the depth section
    // (full, below the footer). Both must use the editorial serif
    // family so the brand voice stays consistent across modes.
    const whyItMattersBodies = screen.getAllByText("Editorial reasoning lives in serif voice.");
    expect(whyItMattersBodies.length).toBeGreaterThan(0);
    for (const body of whyItMattersBodies) {
      expect(body).toHaveClass("font-heading");
    }
  });

  it("renders the italic empty-state for What led to this when data is missing", () => {
    const signal = {
      id: "signal-empty-led",
      title: "Card without structural context yet",
      whyItMatters: "Editorial body only.",
      sourceName: "Reuters",
      sourceUrl: "https://www.reuters.com/story",
    };

    render(<SignalCard signal={signal} rank={1} defaultExpanded />);

    expect(screen.getByText("What led to this")).toBeInTheDocument();
    const placeholder = screen.getByText("No structural context yet for this signal.");
    expect(placeholder).toHaveClass("italic");
    expect(placeholder).toHaveClass("text-[var(--bu-text-tertiary)]");
  });

  it("keeps compact signals neutral for the secondary list surface", () => {
    render(
      <SignalCard
        compact
        rank={1}
        signal={{
          id: "signal-compact",
          title: "Compact signal",
          whyItMatters: "Compact list copy stays readable without adding accent emphasis.",
          sourceName: "Reuters",
          sourceUrl: "https://www.reuters.com/story",
        }}
      />,
    );

    expect(screen.getByText("Core signal · 01")).toHaveClass("text-[var(--bu-text-tertiary)]");
    // The source link is a standalone external-link icon on the right
    // side of the footer — visible on the collapsed face without
    // needing to expand. The accessible name and href point at the
    // original article URL.
    const sourceLink = screen.getByTestId("signal-card-source-link");
    expect(sourceLink).toHaveAttribute("href", "https://www.reuters.com/story");
    expect(sourceLink).toHaveAttribute("target", "_blank");
    expect(sourceLink).toHaveAccessibleName(/read source/i);
  });
});
