import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DateBadge } from "@/components/signals/DateBadge";
import { SignalCard, stripCitationMarkers } from "@/components/signals/SignalCard";
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
    // #274 follow-up: collapsed card face shows the unlabeled teaser
    // preview (testid signal-card-teaser). The v1 "Why this matters"
    // label was removed — the foldback owns the labeled rendering.
    expect(screen.queryByText("Why this matters")).not.toBeInTheDocument();
    expect(screen.getByTestId("signal-card-teaser")).toBeInTheDocument();
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

    // Collapsed: no foldback labels, no supporting coverage. Teaser
    // preview is the only WITM-derived rendering.
    expect(screen.queryByText("The Signal")).not.toBeInTheDocument();
    expect(screen.queryByText("Before This")).not.toBeInTheDocument();
    expect(screen.queryByText("The Ripple")).not.toBeInTheDocument();
    expect(screen.queryByText("Supporting coverage")).not.toBeInTheDocument();
    expect(screen.getByTestId("signal-card-teaser")).toBeInTheDocument();

    rerender(<SignalCard signal={signal} rank={2} expanded />);

    // Expanded: foldback shows the three editorial layers + supporting
    // coverage. The teaser is hidden so WITM appears only once in DOM.
    expect(screen.getByText("The Signal")).toBeInTheDocument();
    expect(screen.getByText("Before This")).toBeInTheDocument();
    expect(screen.getByText("The Ripple")).toBeInTheDocument();
    expect(screen.getByText("Supporting coverage")).toBeInTheDocument();
    expect(screen.queryByTestId("signal-card-teaser")).not.toBeInTheDocument();
    expect(screen.queryByText("What happened")).not.toBeInTheDocument();
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
    // Collapsed: foldback labels absent; teaser visible.
    expect(screen.queryByText("The Signal")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Read more →" })).toBeNull();
    expect(screen.getByTestId("signal-card-teaser")).toBeInTheDocument();

    const toggle = screen.getByTestId("signal-card-toggle");
    expect(toggle).toHaveAccessibleName(/expand/i);

    fireEvent.click(toggle);

    expect(card).toHaveAttribute("data-signal-expanded", "true");
    // Expanded: foldback shows "The Signal" + Before This + The Ripple.
    // Teaser is hidden so WITM only appears once in DOM.
    expect(screen.getByText("The Signal")).toBeInTheDocument();
    expect(screen.getByText("Before This")).toBeInTheDocument();
    expect(screen.getByText("The Ripple")).toBeInTheDocument();
    expect(screen.queryByTestId("signal-card-teaser")).not.toBeInTheDocument();
    expect(screen.queryByText("What happened")).not.toBeInTheDocument();
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
    expect(screen.getByText("The Signal")).toBeInTheDocument();
    expect(screen.getByTestId("signal-card-toggle")).toHaveAccessibleName(/collapse/i);
  });

  // #274 follow-up: the foldback's editorial layers are all serif. The
  // factual "What happened" layer was removed entirely; the sans-vs-
  // serif typography differentiation is no longer relevant because the
  // foldback now renders ONLY editorial-voice content.
  it("renders all three foldback layers in serif (editorial voice)", () => {
    const signal = {
      id: "signal-serif",
      title: "Typography uniformity in the foldback",
      whatHappened: "Factual source-headline body — must NOT appear in foldback.",
      whyItMatters: "Editorial reasoning lives in serif voice.",
      sourceName: "Reuters",
      sourceUrl: "https://www.reuters.com/story",
    };

    render(<SignalCard signal={signal} rank={1} defaultExpanded />);

    // The Signal body (from whyItMatters) — exactly one rendering, serif.
    const signalBodies = screen.getAllByText("Editorial reasoning lives in serif voice.");
    expect(signalBodies).toHaveLength(1);
    expect(signalBodies[0]).toHaveClass("font-heading");

    // The "What happened" body must NOT be in DOM at all.
    expect(
      screen.queryByText(/Factual source-headline body/),
    ).not.toBeInTheDocument();
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
    // #274 follow-up: when expanded, the teaser is hidden so each layer's
    // body text appears EXACTLY ONCE in DOM. Duplicate WITM render was
    // the explicit bug this PR fixed.
    expect(
      screen.getAllByText("The Signal body — what this means right now."),
    ).toHaveLength(1);
    expect(
      screen.getAllByText("The Before This body — what conditions produced it."),
    ).toHaveLength(1);
    expect(
      screen.getAllByText("The Ripple body — what this implies next."),
    ).toHaveLength(1);

    // Foldback contains EXACTLY the three editorial layers in order.
    // No "What happened" label; no v1 labels.
    expect(screen.queryByText("What happened")).not.toBeInTheDocument();
    expect(screen.queryByText("Why this matters")).not.toBeInTheDocument();
    expect(screen.queryByText("What led to this")).not.toBeInTheDocument();
    expect(screen.queryByText("What it connects to")).not.toBeInTheDocument();

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

  // #278 — MVP render hygiene: editorial citation markers ([A], [A1],
  // [P2], [F1], [V3]…) are stripped from the displayed prose so readers
  // see clean text. This is render-only; the markers stay in the stored
  // published_* columns. The full reader-verifiable-citations feature
  // (footnotes/hover sources) is a separate post-MVP follow-up.
  describe("stripCitationMarkers (#278)", () => {
    it("matches the brief's contract example", () => {
      // From the brief: stripCitationMarkers("X slipped [A]. Y rose [A1] and [P2].")
      // === "X slipped. Y rose and."
      expect(
        stripCitationMarkers("X slipped [A]. Y rose [A1] and [P2]."),
      ).toBe("X slipped. Y rose and.");
    });

    it("removes every editorial-shape marker — [A], [A1], [A12], [P#], [F#], [V#]", () => {
      const input =
        "Rates moved [A]. Spreads tightened [A1] and widened [A12]. Policy [P1] and [P2], fiscal [F3], FX [V1].";
      const output = stripCitationMarkers(input);
      expect(output).not.toMatch(/\[[A-Z]\d*\]/);
    });

    it("collapses double spaces and ' .' artifacts left by mid-sentence markers", () => {
      const input =
        "Memory chips [A] and helium [A1] are climbing [P2].  Markets [F1] reacted [V3] .";
      const output = stripCitationMarkers(input);
      expect(output).not.toMatch(/ {2,}/);
      expect(output).not.toMatch(/ \./);
      expect(output).not.toMatch(/\[[A-Z]\d*\]/);
    });

    it("leaves lowercase-bracket tokens and non-citation brackets untouched", () => {
      // The validator's UNRESOLVED_VARIABLE_PATTERN catches genuine
      // placeholders like [topic] (lowercase, multi-letter) before
      // publish. We don't strip those — they should never reach prod
      // text. But if they do, leaving them in lets the bug surface
      // visibly rather than getting silently scrubbed.
      expect(stripCitationMarkers("Edge case [topic] survives.")).toBe(
        "Edge case [topic] survives.",
      );
      // Bracket with digits-first (e.g. citation reference style) is not
      // an editorial marker — leave untouched.
      expect(stripCitationMarkers("Reference [1] cited.")).toBe("Reference [1] cited.");
    });

    it("handles empty input and pure-marker input safely", () => {
      expect(stripCitationMarkers("")).toBe("");
      expect(stripCitationMarkers("[A] [B] [C]")).toBe("");
    });
  });

  // #278 — the SignalCard render must strip citation markers from all
  // three editorial layer bodies. The stored prop values can contain
  // [A] / [A1] / [P2] etc.; the rendered DOM must not.
  it("strips citation markers from The Signal, Before This, and The Ripple in the rendered card (#278)", () => {
    render(
      <SignalCard
        rank={1}
        defaultExpanded
        signal={{
          id: "signal-citation-marker-strip",
          title: "Card with citation markers in all three layers",
          publishedWhyItMatters:
            "Memory-chip prices climbed [A]. Helium supply tightened [A1].",
          publishedWhatLedToIt:
            "Strait closure triggered the supply shock [P1] and [P2].",
          publishedWhatItConnectsTo:
            "Fed will reassess rate path next quarter [F1] [V3].",
          sourceName: "Reuters",
          sourceUrl: "https://www.reuters.com/story",
        }}
      />,
    );

    // Labels are intact.
    expect(screen.getByText("The Signal")).toBeInTheDocument();
    expect(screen.getByText("Before This")).toBeInTheDocument();
    expect(screen.getByText("The Ripple")).toBeInTheDocument();

    // No editorial marker shape survives anywhere in the rendered DOM.
    const card = screen.getByTestId("signal-card");
    expect(card.textContent ?? "").not.toMatch(/\[[A-Z]\d*\]/);

    // Each layer body still reads as clean prose — the prefix before the
    // first marker is preserved.
    expect(
      screen.getByText(/Memory-chip prices climbed\. Helium supply tightened\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Strait closure triggered the supply shock and\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Fed will reassess rate path next quarter\./),
    ).toBeInTheDocument();
  });
});
