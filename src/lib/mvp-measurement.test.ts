import { describe, expect, it } from "vitest";

import {
  resolveMvpCohortFromMarkers,
  sanitizeMetadata,
  validateMvpMeasurementEvent,
} from "@/lib/mvp-measurement";

const validPayload = {
  eventName: "signal_full_expansion_proxy",
  visitorId: "mvp_1234567890abcdef",
  sessionId: "mvp_session_1234567890abcdef",
  route: "/",
  surface: "home_top_event",
  signalPostId: "3156ce1e-d052-4f88-af1b-4630f78e1104",
  signalRank: 1,
  briefingDate: "2026-05-01T12:00:00.000Z",
  metadata: {
    sourceName: "Example Source",
  },
};

describe("MVP measurement event validation", () => {
  it("accepts a valid privacy-scoped event payload", () => {
    const result = validateMvpMeasurementEvent(validPayload);

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        eventName: "signal_full_expansion_proxy",
        visitorId: "mvp_1234567890abcdef",
        sessionId: "mvp_session_1234567890abcdef",
        briefingDate: "2026-05-01",
        signalRank: 1,
      }),
    });
  });

  it("rejects unsupported event names", () => {
    const result = validateMvpMeasurementEvent({
      ...validPayload,
      eventName: "personalize_rankings",
    });

    expect(result).toEqual({
      ok: false,
      error: "Unsupported event name.",
    });
  });

  it("rejects malformed anonymous identifiers", () => {
    const result = validateMvpMeasurementEvent({
      ...validPayload,
      visitorId: "user@example.com",
    });

    expect(result).toEqual({
      ok: false,
      error: "Invalid visitor id.",
    });
  });

  it("bounds metadata keys and string values", () => {
    const metadata = sanitizeMetadata(
      Object.fromEntries(
        Array.from({ length: 30 }, (_, index) => [
          `key ${index}`,
          "a".repeat(400),
        ]),
      ),
    );

    expect(Object.keys(metadata)).toHaveLength(24);
    expect(Object.keys(metadata)[0]).toBe("key_0");
    expect(String(Object.values(metadata)[0])).toHaveLength(300);
  });

  it("strips sensitive metadata and source URL query strings", () => {
    const result = validateMvpMeasurementEvent({
      ...validPayload,
      route: "/signals?token=secret#fragment",
      metadata: {
        sourceName: "Example Source",
        sourceUrl: "https://example.com/story?utm_source=newsletter#fragment",
        email: "reader@example.com",
        cookie: "session=secret",
        whyItMatters: "Full explanatory copy must not be persisted as metadata.",
        hasStructuredWhyItMatters: true,
      },
    });

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        route: "/signals",
        metadata: {
          sourceName: "Example Source",
          sourceUrl: "https://example.com/story",
          hasStructuredWhyItMatters: true,
        },
      }),
    });
  });

  it("accepts the signal_read and comprehension_self_report event names", () => {
    const signalReadResult = validateMvpMeasurementEvent({
      ...validPayload,
      eventName: "signal_read",
      metadata: {
        signalRank: 1,
        dwellMs: 21000,
      },
    });

    expect(signalReadResult.ok).toBe(true);

    const selfReportResult = validateMvpMeasurementEvent({
      eventName: "comprehension_self_report",
      visitorId: "mvp_1234567890abcdef",
      sessionId: "mvp_session_1234567890abcdef",
      route: "/",
      metadata: {
        response: "agree",
        briefingDate: "2026-05-01",
      },
    });

    expect(selfReportResult.ok).toBe(true);
  });

  it("accepts sanitized category tab opens without signal identifiers", () => {
    const result = validateMvpMeasurementEvent({
      eventName: "category_tab_open",
      visitorId: "mvp_1234567890abcdef",
      sessionId: "mvp_session_1234567890abcdef",
      route: "/?token=secret",
      surface: "home_category_tab",
      metadata: {
        categoryKey: "finance",
        sourceUrl: "https://example.com/story?token=secret",
        email: "reader@example.com",
      },
    });

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        eventName: "category_tab_open",
        route: "/",
        surface: "home_category_tab",
        signalPostId: null,
        signalRank: null,
        metadata: {
          categoryKey: "finance",
          sourceUrl: "https://example.com/story",
        },
      }),
    });
  });
});

describe("resolveMvpCohortFromMarkers", () => {
  it("returns 'qa' when ?mvp_qa is set, even if ?c=tester is also present", () => {
    expect(
      resolveMvpCohortFromMarkers({
        queryQa: true,
        queryCohort: "tester",
        persisted: null,
      }),
    ).toBe("qa");
  });

  it("returns 'tester' when ?c=tester is set without a QA flag", () => {
    expect(
      resolveMvpCohortFromMarkers({
        queryQa: false,
        queryCohort: "tester",
        persisted: null,
      }),
    ).toBe("tester");
  });

  it("returns 'internal' when ?c=internal is set explicitly", () => {
    expect(
      resolveMvpCohortFromMarkers({
        queryQa: false,
        queryCohort: "internal",
        persisted: "tester",
      }),
    ).toBe("internal");
  });

  it("falls back to the previously persisted cohort when no marker is in the URL", () => {
    expect(
      resolveMvpCohortFromMarkers({
        queryQa: false,
        queryCohort: null,
        persisted: "tester",
      }),
    ).toBe("tester");

    expect(
      resolveMvpCohortFromMarkers({
        queryQa: false,
        queryCohort: null,
        persisted: "qa",
      }),
    ).toBe("qa");
  });

  it("defaults to 'internal' when neither URL nor storage provide a cohort", () => {
    expect(
      resolveMvpCohortFromMarkers({
        queryQa: false,
        queryCohort: null,
        persisted: null,
      }),
    ).toBe("internal");
  });

  it("ignores unknown query cohort values and falls back to persisted/default", () => {
    expect(
      resolveMvpCohortFromMarkers({
        queryQa: false,
        queryCohort: "admin",
        persisted: null,
      }),
    ).toBe("internal");
  });
});
