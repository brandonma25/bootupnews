import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getDashboardPageState = vi.fn();
const landingHomepage = vi.fn(() => <div>landing-homepage</div>);

vi.mock("@/lib/data", () => ({
  getDashboardPageState,
}));

vi.mock("@/components/landing/homepage", () => ({
  default: (props: unknown) => landingHomepage(props),
}));

describe("homepage SSR auth snapshot", () => {
  it("uses a single dashboard page state lookup for the request", async () => {
    getDashboardPageState.mockResolvedValue({
      data: { mode: "live", briefing: { items: [] }, topics: [], sources: [], homepageDiagnostics: {} },
      viewer: {
        id: "viewer-1",
        email: "analyst@example.com",
        displayName: "Alex Analyst",
        initials: "AA",
      },
    });

    const Page = (await import("@/app/page")).default;
    const element = await Page({
      searchParams: Promise.resolve({ auth: "1" }),
    });
    render(element);

    expect(getDashboardPageState).toHaveBeenCalledTimes(1);
    expect(getDashboardPageState).toHaveBeenCalledWith("/");
    expect(landingHomepage).toHaveBeenCalledWith(
      expect.objectContaining({
        viewer: expect.objectContaining({
          email: "analyst@example.com",
        }),
      }),
    );
  });
});
