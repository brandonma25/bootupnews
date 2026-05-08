#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

import {
  normalizeMvpMeasurementSummaryWindowDays,
  readMvpMeasurementSummary,
} from "@/lib/mvp-measurement-summary";
import { env, isSupabaseServerConfigured } from "@/lib/env";

function parseDays() {
  const flagIndex = process.argv.findIndex((arg) => arg === "--days");
  const rawValue = flagIndex >= 0 ? process.argv[flagIndex + 1] : "30";

  return normalizeMvpMeasurementSummaryWindowDays(rawValue);
}

async function main() {
  if (!isSupabaseServerConfigured) {
    throw new Error("Supabase server configuration is required to summarize MVP measurement events.");
  }

  const days = parseDays();
  const client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const summary = await readMvpMeasurementSummary(client, days);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
