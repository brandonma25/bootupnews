"use client";

import { createBrowserClient } from "@supabase/ssr";

import { env, getSupabasePublicEnvDiagnostics, isSupabaseConfigured } from "@/lib/env";

let hasLoggedMissingSupabaseConfig = false;

export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured) {
    if (!hasLoggedMissingSupabaseConfig) {
      const diagnostics = getSupabasePublicEnvDiagnostics();
      console.warn("[auth] Browser Supabase client is unavailable because required public env vars are missing", {
        missingNames: diagnostics.missingNames,
      });
      hasLoggedMissingSupabaseConfig = true;
    }

    return null;
  }

  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
