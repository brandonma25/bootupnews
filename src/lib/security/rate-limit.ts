/**
 * Minimal in-memory fixed-window rate limiter for abuse-prone public endpoints
 * (the unauthenticated telemetry writer and open signup).
 *
 * SCOPE / CAVEAT: state is per-process. On Vercel's multi-instance serverless
 * runtime this limits per-instance, not globally — a meaningful bar against
 * single-source floods, but NOT a hard global cap. For a production-grade global
 * limit, back this with a durable store (Vercel KV / Upstash Redis) keyed the
 * same way. Tracked as follow-up.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 50_000;

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  // Bound memory: if the map balloons (e.g. spoofed-key flood), drop expired
  // entries; if still oversized, the oldest windows are reset on next access.
  if (buckets.size > MAX_TRACKED_KEYS) pruneExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

/** Test helper — clears all windows. */
export function resetRateLimitState(): void {
  buckets.clear();
}

/**
 * Best-effort client IP for rate-limit keying.
 *
 * SECURITY: do NOT trust the leftmost `x-forwarded-for` hop — Vercel APPENDS the
 * real client IP to any inbound XFF, so the leftmost token is client-supplied and
 * an attacker can rotate it per request to evade per-IP limits. Prefer the
 * platform-set headers (`x-real-ip` / `x-vercel-forwarded-for`), which Vercel
 * derives from the actual connection and a client cannot spoof. The XFF fallback
 * uses the RIGHTMOST hop (appended by the nearest trusted proxy), not the left.
 */
export function getClientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const vercelForwarded = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercelForwarded) return vercelForwarded;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((hop) => hop.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1]!;
  }

  return "unknown";
}
