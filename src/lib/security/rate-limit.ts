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

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
