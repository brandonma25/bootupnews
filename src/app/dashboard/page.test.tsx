import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getDashboardPageState = vi.fn();
const personalizedDashboard = vi.fn(() => <div>personalized-dashboard</div>);

vi.mock("@/lib/data", () => ({
  getDashboardPageState,
}));

vi.mock("@/components/dashboard/personalized-dashboard", () => ({
  default: (props: unknown) => personalizedDashboard(props),
}));

describe("dashboard SSR auth snapshot", () => {
  it("uses a single shared page-state lookup for dashboard rendering", async () => {
    getDashboardPageState.mockResolvedValue({
      data: { mode: "live", briefing: { items: [] }, topics: [], sources: [], homepageDiagnostics: {} },
      viewer: {
        id: "viewer-1",
        email: "analyst@example.com",
        displayName: "Alex Analyst",
        initials: "AA",
      },
    });

    const DashboardPage = (await import("@/app/dashboard/page")).default;
    const element = await DashboardPage({
      searchParams: Promise.resolve({ generated: "1" }),
    });
    render(element);

    expect(getDashboardPageState).toHaveBeenCalledTimes(1);
    expect(getDashboardPageState).toHaveBeenCalledWith("/dashboard");
    expect(personalizedDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        viewer: expect.objectContaining({
          email: "analyst@example.com",
        }),
      }),
    );
  });
});
