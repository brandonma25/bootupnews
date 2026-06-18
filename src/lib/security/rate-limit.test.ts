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
  it("prefers the first x-forwarded-for hop", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });
  it("falls back to x-real-ip then 'unknown'", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "203.0.113.8" }))).toBe("203.0.113.8");
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});
