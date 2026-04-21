import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DateGroupHeader } from "@/components/history/DateGroupHeader";
import { EarlySignalsSection } from "@/components/history/EarlySignalsSection";
import { HistoryEmptyState } from "@/components/history/HistoryEmptyState";
import { HistoryErrorState } from "@/components/history/HistoryErrorState";
import { HistoryLoadingState } from "@/components/history/HistoryLoadingState";
import { StoryPreviewRow } from "@/components/history/StoryPreviewRow";
import { RetryButton } from "@/components/shared/RetryButton";

describe("history components", () => {
  it("renders a formatted date group header with a full briefing link", () => {
    render(<DateGroupHeader date="2024-04-20" briefingDate="2024-04-20" />);

    expect(screen.getByRole("heading", { name: "Saturday, April 20" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open full briefing" })).toHaveAttribute(
      "href",
      "/briefing/2024-04-20",
    );
  });

  it("renders only a story preview title", () => {
    render(<StoryPreviewRow title="Markets brace for new Fed signals" />);

    expect(screen.getByText("Markets brace for new Fed signals")).toBeInTheDocument();
    expect(screen.queryByText(/summary/i)).not.toBeInTheDocument();
  });

  it("hides early signals when no items are present", () => {
    const { container } = render(<EarlySignalsSection items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders populated early signals", () => {
    render(
      <EarlySignalsSection
        items={[{ title: "AI chip demand shows early acceleration" }, { title: "Oil shipping costs rise" }]}
      />,
    );

    expect(screen.getByText("Early signals")).toBeInTheDocument();
    expect(screen.getByText("AI chip demand shows early acceleration")).toBeInTheDocument();
    expect(screen.getByText("Oil shipping costs rise")).toBeInTheDocument();
  });

  it("renders the history empty-state message and link CTAs", () => {
    render(<HistoryEmptyState />);

    expect(screen.getByText(/Your daily briefing history starts today/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders at least two loading date group placeholders", () => {
    render(<HistoryLoadingState />);

    expect(screen.getByLabelText("Loading briefing history")).toBeInTheDocument();
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThanOrEqual(4);
  });

  it("renders history error retry behavior", () => {
    const onRetry = vi.fn();

    render(<HistoryErrorState onRetry={onRetry} isRetrying={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("Briefing history unavailable")).toBeInTheDocument();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("disables RetryButton while retrying", () => {
    const onRetry = vi.fn();

    render(<RetryButton onRetry={onRetry} isRetrying />);

    expect(screen.getByRole("button", { name: "Try again" })).toBeDisabled();
  });
});
