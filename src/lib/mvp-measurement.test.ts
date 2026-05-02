import { describe, expect, it } from "vitest";

import {
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
});
