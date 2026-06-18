import { describe, expect, it } from "vitest";

import { maskEmail } from "@/lib/security/mask-email";

describe("maskEmail", () => {
  it("masks the local part but keeps first/last char + domain", () => {
    expect(maskEmail("brandon@example.com")).toBe("b***n@example.com");
  });

  it("masks a 2-char local part to first-char + star (never leaks the full local part)", () => {
    expect(maskEmail("ab@x.com")).toBe("a*@x.com");
    expect(maskEmail("a@x.com")).toBe("a*@x.com");
  });

  it("returns *** for a non-email string and '' for empty/nullish", () => {
    expect(maskEmail("not-an-email")).toBe("***");
    expect(maskEmail("")).toBe("");
    expect(maskEmail(null)).toBe("");
    expect(maskEmail(undefined)).toBe("");
  });

  it("treats a leading-@ value as non-email (no empty local part leak)", () => {
    expect(maskEmail("@x.com")).toBe("***");
  });

  it("trims surrounding whitespace before masking", () => {
    expect(maskEmail("  brandon@example.com  ")).toBe("b***n@example.com");
  });

  it("never contains the full local part for a normal address", () => {
    const masked = maskEmail("sensitive@example.com");
    expect(masked).not.toContain("sensitive");
    expect(masked.endsWith("@example.com")).toBe(true);
  });
});
