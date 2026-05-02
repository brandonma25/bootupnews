import { describe, expect, it } from "vitest";

import { summarizeMvpMeasurementEvents } from "@/lib/mvp-measurement-summary";

describe("MVP measurement summary", () => {
  it("summarizes retention, expansion proxies, comprehension, dates, and routes", () => {
    const summary = summarizeMvpMeasurementEvents([
      {
        event_name: "homepage_view",
        visitor_id: "mvp_visitor_a",
        session_id: "mvp_session_a1",
        occurred_at: "2026-05-01T12:00:00.000Z",
        route: "/",
      },
      {
        event_name: "signal_details_click",
        visitor_id: "mvp_visitor_a",
        session_id: "mvp_session_a1",
        occurred_at: "2026-05-01T12:01:00.000Z",
        route: "/",
      },
      {
        event_name: "homepage_view",
        visitor_id: "mvp_visitor_a",
        session_id: "mvp_session_a2",
        occurred_at: "2026-05-08T12:00:00.000Z",
        route: "/",
      },
      {
        event_name: "signals_page_view",
        visitor_id: "mvp_visitor_b",
        session_id: "mvp_session_b1",
        occurred_at: "2026-05-02T12:00:00.000Z",
        route: "/signals",
      },
      {
        event_name: "comprehension_prompt_answered",
        visitor_id: "mvp_visitor_b",
        session_id: "mvp_session_b1",
        occurred_at: "2026-05-02T12:02:00.000Z",
        route: "/signals",
        metadata: { response: "agree" },
      },
    ]);

    expect(summary.eventCount).toBe(5);
    expect(summary.uniqueVisitorCount).toBe(2);
    expect(summary.uniqueSessionCount).toBe(3);
    expect(summary.eventCountByDate).toMatchObject({
      "2026-05-01": 2,
      "2026-05-02": 2,
      "2026-05-08": 1,
    });
    expect(summary.eventCountByRoute).toMatchObject({
      "/": 3,
      "/signals": 2,
    });
    expect(summary.day7Return).toEqual({
      denominator: 2,
      numerator: 1,
      rate: 0.5,
    });
    expect(summary.depthEngagement.proxyExpansionSessions).toBe(1);
    expect(summary.depthEngagement.proxyRate).toBe(1 / 3);
    expect(summary.comprehension.agreeCount).toBe(1);
    expect(summary.comprehension.agreementRate).toBe(1);
    expect(summary.firstThreeSessionsExpansion).toEqual({
      denominator: 2,
      numerator: 1,
      rate: 0.5,
    });
  });
});
