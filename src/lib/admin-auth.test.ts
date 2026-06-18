import { describe, expect, it } from "vitest";

import { isAdminEmail, isAdminUser, isVerifiedAdminUser, parseAdminEmails } from "@/lib/admin-auth";

describe("admin auth helpers", () => {
  it("normalizes comma-separated admin email configuration", () => {
    expect(parseAdminEmails(" BrandonMa25@GMAIL.com, editor@example.com ,, ")).toEqual([
      "brandonma25@gmail.com",
      "editor@example.com",
    ]);
  });

  it("checks admin email membership case-insensitively", () => {
    expect(isAdminEmail("BRANDONMA25@gmail.com", "brandonma25@gmail.com")).toBe(true);
    expect(isAdminEmail("reader@example.com", "brandonma25@gmail.com")).toBe(false);
  });

  it("checks a Supabase user email against the configured admin list", () => {
    expect(isAdminUser({ email: "editor@example.com" }, "admin@example.com,editor@example.com")).toBe(true);
    expect(isAdminUser({ email: "reader@example.com" }, "admin@example.com,editor@example.com")).toBe(false);
  });

  describe("isVerifiedAdminUser (server-side gate)", () => {
    const admins = "admin@example.com,editor@example.com";

    it("authorizes an admin email with a CONFIRMED email", () => {
      expect(
        isVerifiedAdminUser({ email: "editor@example.com", email_confirmed_at: "2026-06-18T00:00:00Z" }, admins),
      ).toBe(true);
    });

    it("REJECTS an admin email whose email is not confirmed (the takeover window)", () => {
      expect(isVerifiedAdminUser({ email: "editor@example.com", email_confirmed_at: undefined }, admins)).toBe(false);
      expect(isVerifiedAdminUser({ email: "editor@example.com", email_confirmed_at: null as unknown as undefined }, admins)).toBe(false);
    });

    it("rejects a non-admin email even when confirmed", () => {
      expect(
        isVerifiedAdminUser({ email: "reader@example.com", email_confirmed_at: "2026-06-18T00:00:00Z" }, admins),
      ).toBe(false);
    });

    it("rejects null/undefined users", () => {
      expect(isVerifiedAdminUser(null, admins)).toBe(false);
      expect(isVerifiedAdminUser(undefined, admins)).toBe(false);
    });
  });
});
