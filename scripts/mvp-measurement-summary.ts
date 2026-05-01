#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

import {
  summarizeMvpMeasurementEvents,
  type MvpMeasurementSummaryRow,
} from "@/lib/mvp-measurement-summary";
import { env, isSupabaseServerConfigured } from "@/lib/env";

function parseDays() {
  const flagIndex = process.argv.findIndex((arg) => arg === "--days");
  const rawValue = flagIndex >= 0 ? process.argv[flagIndex + 1] : "30";
  const parsed = Number.parseInt(rawValue ?? "30", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

async function main() {
  if (!isSupabaseServerConfigured) {
    throw new Error("Supabase server configuration is required to summarize MVP measurement events.");
  }

  const days = parseDays();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const result = await client
    .from("mvp_measurement_events")
    .select("event_name, visitor_id, session_id, occurred_at, route, metadata")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: true })
    .limit(10000);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const summary = summarizeMvpMeasurementEvents(
    (result.data ?? []) as unknown as MvpMeasurementSummaryRow[],
  );

  console.log(JSON.stringify({
    ok: true,
    windowDays: days,
    since,
    summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
