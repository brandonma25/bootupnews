import { describe, expect, it } from "vitest";

import { getSupabasePublicEnvDiagnostics, resolvePublicSupabaseConfig } from "@/lib/env";

describe("public Supabase env resolution", () => {
  it("prefers the anon key when both supported public key names are present", () => {
    const resolved = resolvePublicSupabaseConfig({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-key",
      supabasePublishableKey: "publishable-key",
      appUrl: "http://localhost:3000",
    });

    expect(resolved.url).toBe("https://example.supabase.co");
    expect(resolved.key).toBe("anon-key");
    expect(resolved.keySource).toBe("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("uses the publishable key when that is the only supplied public key name", () => {
    const resolved = resolvePublicSupabaseConfig({
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "publishable-key",
    });

    expect(resolved.key).toBe("publishable-key");
    expect(resolved.keySource).toBe("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });

  it("reports missing names without exposing secret values", () => {
    const diagnostics = getSupabasePublicEnvDiagnostics();

    expect(Array.isArray(diagnostics.missingNames)).toBe(true);
    expect(
      diagnostics.missingNames.every(
        (name) =>
          name === "NEXT_PUBLIC_SUPABASE_URL" ||
          name === "NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      ),
    ).toBe(true);
  });
});
