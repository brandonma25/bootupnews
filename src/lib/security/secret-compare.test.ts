import { describe, expect, it } from "vitest";

import { secretsMatch } from "@/lib/security/secret-compare";

describe("secretsMatch (constant-time)", () => {
  it("matches identical secrets", () => {
    expect(secretsMatch("s3cret-token", "s3cret-token")).toBe(true);
    expect(secretsMatch("  s3cret-token  ", "s3cret-token")).toBe(true); // trims
  });

  it("rejects mismatches and length differences without throwing", () => {
    expect(secretsMatch("wrong", "s3cret-token")).toBe(false);
    expect(secretsMatch("s3cret-tokenX", "s3cret-token")).toBe(false);
  });

  it("rejects empty/missing on either side", () => {
    expect(secretsMatch("", "s3cret")).toBe(false);
    expect(secretsMatch("s3cret", "")).toBe(false);
    expect(secretsMatch(null, "s3cret")).toBe(false);
    expect(secretsMatch("s3cret", undefined)).toBe(false);
  });
});
