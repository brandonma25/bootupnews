import { render, screen } from "@testing-library/react";
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
    expect(screen.getByRole("link", { name: "Read more →" })).toHaveClass("hover:text-[var(--bu-text-primary)]");
  });
});
