import { describe, expect, it } from "vitest";

import { isAdminEmail, isAdminUser, parseAdminEmails } from "@/lib/admin-auth";

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
});
