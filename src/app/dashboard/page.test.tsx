import { describe, expect, it } from "vitest";

describe("legacy dashboard route", () => {
  it("redirects to the V1 Home route", async () => {
    const DashboardPage = (await import("@/app/dashboard/page")).default;

    expect(() => DashboardPage()).toThrow("NEXT_REDIRECT");
  });
});
