import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DateBadge } from "@/components/signals/DateBadge";
import { SignalCard } from "@/components/signals/SignalCard";
import { TierBadge } from "@/components/signals/TierBadge";

describe("Bootup News visual system components", () => {
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

  // #274 renamed "What led to this" → "Before This" in the foldback and
  // wired it to read published_what_led_to_it. When published_* is null
  // the layer shows the empty state in italic tertiary text.
  it("renders the italic empty-state for Before This when published_what_led_to_it is missing", () => {
    const signal = {
      id: "signal-empty-led",
      title: "Card without prior context yet",
      whyItMatters: "Editorial body only.",
      sourceName: "Reuters",
      sourceUrl: "https://www.reuters.com/story",
    };

    render(<SignalCard signal={signal} rank={1} defaultExpanded />);

    expect(screen.getByText("Before This")).toBeInTheDocument();
    const placeholder = screen.getByText("No prior context yet for this signal.");
    expect(placeholder).toHaveClass("italic");
    expect(placeholder).toHaveClass("text-[var(--bu-text-tertiary)]");
  });

  // #274 — when all three layers carry published content, the foldback
  // renders them with v2 labels in the order The Signal → Before This →
  // The Ripple. Each layer's body comes from its published_* column;
  // ai_*/edited_* must NOT be surfaced.
  it("renders all three editorial layers with v2 labels and cause-then-trajectory order when published_* is set (#274)", () => {
    render(
      <SignalCard
        rank={1}
        defaultExpanded
        signal={{
          id: "signal-three-layer",
          title: "Card with all three editorial layers published",
          publishedWhyItMatters: "The Signal body — what this means right now.",
          publishedWhatLedToIt: "The Before This body — what conditions produced it.",
          publishedWhatItConnectsTo: "The Ripple body — what this implies next.",
          sourceName: "Reuters",
          sourceUrl: "https://www.reuters.com/story",
        }}
      />,
    );

    expect(screen.getByText("The Signal")).toBeInTheDocument();
    expect(screen.getByText("Before This")).toBeInTheDocument();
    expect(screen.getByText("The Ripple")).toBeInTheDocument();
    // The Signal body appears twice — once as the card-face preview
    // (testid signal-why-this-matters) and once in the expanded foldback.
    // Both pull from publishedWhyItMatters; presence at least once is the
    // assertion that matters.
    expect(screen.getAllByText("The Signal body — what this means right now.").length).toBeGreaterThan(0);
    expect(
      screen.getByText("The Before This body — what conditions produced it."),
    ).toBeInTheDocument();
    expect(screen.getByText("The Ripple body — what this implies next.")).toBeInTheDocument();

    // Render order: walk all section labels and assert the editorial-layer
    // sequence is Signal → Before This → Ripple.
    const labels = screen
      .getAllByText(/^(The Signal|Before This|The Ripple)$/u)
      .map((node) => node.textContent);
    expect(labels).toEqual(["The Signal", "Before This", "The Ripple"]);
  });

  // #274 — when published_what_led_to_it and published_what_it_connects_to
  // are null, the foldback MUST show the empty state for each layer and
  // MUST NOT fall back to ai_*/edited_*/human_* (publish-gate bypass).
  it("shows empty state for Before This / The Ripple when published_* is null and never leaks ai_* content (#274)", () => {
    render(
      <SignalCard
        rank={1}
        defaultExpanded
        signal={{
          id: "signal-empty-layers",
          title: "Card with unreviewed layer content",
          publishedWhyItMatters: "The Signal published body.",
          // published_* is null/undefined for the new layers. We deliberately
          // also do NOT pass ai_*/edited_*/human_* — those are not part of
          // SignalCardSignal. If they were ever added, the card must still
          // refuse to surface them.
          sourceName: "Reuters",
          sourceUrl: "https://www.reuters.com/story",
        }}
      />,
    );

    // Labels show.
    expect(screen.getByText("Before This")).toBeInTheDocument();
    expect(screen.getByText("The Ripple")).toBeInTheDocument();

    // Empty-state strings render in italic tertiary text.
    const beforeEmpty = screen.getByText("No prior context yet for this signal.");
    const rippleEmpty = screen.getByText("No downstream trajectory yet for this signal.");
    expect(beforeEmpty).toHaveClass("italic");
    expect(rippleEmpty).toHaveClass("italic");
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
