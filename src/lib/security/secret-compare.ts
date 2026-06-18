import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time shared-secret comparison. `timingSafeEqual` throws on length
 * mismatch, so we length-guard first (returning false) — the length of a
 * high-entropy secret is not the sensitive bit, the contents are.
 */
export function secretsMatch(provided: string | null | undefined, expected: string | null | undefined): boolean {
  const a = (provided ?? "").trim();
  const b = (expected ?? "").trim();
  if (!a || !b) return false;

  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;

  return timingSafeEqual(bufA, bufB);
}
