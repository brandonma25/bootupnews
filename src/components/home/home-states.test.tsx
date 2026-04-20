import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import { HomeErrorState } from "@/components/home/HomeErrorState";
import { RetryButton } from "@/components/shared/RetryButton";

describe("HomeEmptyState", () => {
  it("renders the provided message and expected generation time without a retry button", () => {
    render(
      <HomeEmptyState
        message="Today's briefing is still being prepared."
        expectedGenerationTime="8:30 AM ET"
      />,
    );

    expect(screen.getByText("Today's briefing is still being prepared.")).toBeInTheDocument();
    expect(screen.getByText(/Expected generation time:/)).toHaveTextContent("8:30 AM ET");
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });
});

describe("HomeErrorState", () => {
  it("renders an error message and delegates retry to the callback", () => {
    const onRetry = vi.fn();

    render(<HomeErrorState onRetry={onRetry} isRetrying={false} />);

    expect(screen.getByRole("alert")).toHaveTextContent("We could not load today's briefing.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows loading state while retrying", () => {
    const onRetry = vi.fn();

    render(<HomeErrorState onRetry={onRetry} isRetrying />);

    expect(screen.getByRole("button", { name: "Try again" })).toBeDisabled();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });
});

describe("RetryButton", () => {
  it("fires only the provided retry callback", () => {
    const onRetry = vi.fn();

    render(<RetryButton onRetry={onRetry} isRetrying={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("is non-interactive with a spinner while retrying", () => {
    const onRetry = vi.fn();

    render(<RetryButton onRetry={onRetry} isRetrying />);

    expect(screen.getByRole("button", { name: "Try again" })).toBeDisabled();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
