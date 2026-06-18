import { beforeEach, describe, expect, it } from "vitest";

import { checkRateLimit, getClientIp, resetRateLimitState } from "@/lib/security/rate-limit";

beforeEach(() => resetRateLimitState());

describe("checkRateLimit (fixed window)", () => {
  it("allows up to the limit then blocks within the window", () => {
    const t0 = 1_000_000;
    expect(checkRateLimit("k", 3, 60_000, t0).ok).toBe(true);
    expect(checkRateLimit("k", 3, 60_000, t0 + 1).ok).toBe(true);
    expect(checkRateLimit("k", 3, 60_000, t0 + 2).ok).toBe(true);
    const blocked = checkRateLimit("k", 3, 60_000, t0 + 3);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const t0 = 2_000_000;
    checkRateLimit("k", 1, 60_000, t0);
    expect(checkRateLimit("k", 1, 60_000, t0 + 10).ok).toBe(false);
    expect(checkRateLimit("k", 1, 60_000, t0 + 60_001).ok).toBe(true);
  });

  it("isolates distinct keys", () => {
    const t0 = 3_000_000;
    expect(checkRateLimit("a", 1, 60_000, t0).ok).toBe(true);
    expect(checkRateLimit("b", 1, 60_000, t0).ok).toBe(true);
    expect(checkRateLimit("a", 1, 60_000, t0).ok).toBe(false);
  });
});

describe("getClientIp", () => {
  it("prefers the platform-trusted x-real-ip over a (spoofable) x-forwarded-for", () => {
    expect(
      getClientIp(new Headers({ "x-real-ip": "203.0.113.8", "x-forwarded-for": "6.6.6.6, 203.0.113.8" })),
    ).toBe("203.0.113.8");
  });

  it("does NOT trust the leftmost x-forwarded-for hop (client-spoofable)", () => {
    // Attacker prepends a fake IP; the real (proxy-appended) IP is rightmost.
    expect(getClientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("uses x-vercel-forwarded-for when x-real-ip is absent", () => {
    expect(getClientIp(new Headers({ "x-vercel-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe("203.0.113.9");
  });

  it("falls back to 'unknown' when no proxy headers are present", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});
