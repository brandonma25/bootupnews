#!/usr/bin/env node

/**
 * One-off capture tool: pull the real 2026-06-06 newsletter bodies that the
 * extractor turned into email chrome, and write them as hermetic test fixtures
 * for the chrome-rejection regression tests. Run once with prod creds:
 *
 *   ( set -a; . ./.env.local; set +a; npx tsx scripts/capture-newsletter-fixtures.ts )
 *
 * The subscriber email address is redacted before writing (hygiene). Re-run to
 * refresh if the fixtures ever need updating.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

// briefing_date=2026-06-06 newsletter_emails whose extractions were 100% chrome.
const FIXTURE_EMAILS: Record<string, string> = {
  "money-stuff-2026-06-06": "30d9b8cc-c1c0-4bf4-82bf-e9a543e1086c",
  "1440-2026-06-06": "488c439d-bfba-4292-a142-492ddea23a96",
  "a16z-charts-2026-06-06": "30648396-2a18-45e8-a281-4661552c3d32",
};

function redact(value: string | null | undefined): string {
  return (value ?? "").replace(/brandonma25@gmail\.com/gi, "subscriber@example.com");
}

async function main() {
  const db = createSupabaseServiceRoleClient();
  if (!db) throw new Error("Supabase service role client not configured (need .env.local).");

  const dir = path.resolve(process.cwd(), "src/lib/newsletter-ingestion/__fixtures__");
  await mkdir(dir, { recursive: true });

  for (const [name, id] of Object.entries(FIXTURE_EMAILS)) {
    const res = await db
      .from("newsletter_emails")
      .select("sender, subject, raw_content")
      .eq("id", id)
      .single();
    if (res.error) throw new Error(`read ${name} (${id}) failed: ${res.error.message}`);
    const row = res.data as { sender: string; subject: string | null; raw_content: string };
    const payload = {
      sender: redact(row.sender),
      subject: redact(row.subject),
      rawContent: redact(row.raw_content),
    };
    await writeFile(path.join(dir, `${name}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`wrote ${name}.json (rawContent ${payload.rawContent.length} chars)`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
