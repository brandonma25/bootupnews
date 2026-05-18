#!/usr/bin/env tsx
/**
 * Notion Editorial Queue dedup cleanup script.
 *
 * Background
 *   On 2026-05-16 the cron ran four times in five hours (06:59, 07:17, 10:32,
 *   11:50 UTC). The notion-writer had no idempotency guard, so each run
 *   POSTed a fresh page for every candidate — leaving 4-5 copies of the same
 *   Headline + Briefing Date in the queue.
 *
 *   The new idempotency guard prevents recurrence, but historical duplicates
 *   are still sitting in Notion. This script cleans them up by archiving the
 *   older copies (Status = rejected, Kill Reason = redundant) and keeping the
 *   most-recently-edited row in each duplicate group.
 *
 * Usage
 *   npm run notion:dedup          # dry-run (default)
 *   npm run notion:dedup:execute  # actually archive duplicates
 *
 *   The script ALWAYS prints what it would do. --execute flips the writes
 *   from dry to live. Without --execute, no Notion mutations occur.
 *
 * Scope
 *   By default operates on Briefing Date = 2026-05-15 and 2026-05-16, the
 *   known affected days. Override with --date=YYYY-MM-DD to target other
 *   days (repeatable: --date=A --date=B).
 *
 * Safety
 *   We do not hard-delete rows. The "kept" row in each group stays raw/
 *   approved as-is. Duplicates are PATCHed to Status=rejected with a
 *   Kill Reason and Kill Notes timestamp. Recoverable in Notion's UI by
 *   reverting the status if needed.
 *
 * Auth
 *   Reads NOTION_TOKEN and NOTION_EDITORIAL_QUEUE_DB_ID from the local env.
 *   Source them from .env.prod.local before running:
 *     source .env.prod.local
 *     npm run notion:dedup
 */

import { config as loadDotenv } from "dotenv";
import path from "node:path";

// Load env vars from .env.prod.local if present so devs don't need to source
// the file manually. We pick local-first to avoid surprises in production.
loadDotenv({ path: path.resolve(process.cwd(), ".env.prod.local") });
loadDotenv({ path: path.resolve(process.cwd(), ".env.local") });

const NOTION_API_VERSION = "2022-06-28";
const NOTION_BASE = "https://api.notion.com/v1";

type Args = {
  execute: boolean;
  dates: string[];
};

function parseArgs(argv: string[]): Args {
  const dates: string[] = [];
  let execute = false;
  for (const arg of argv) {
    if (arg === "--execute") execute = true;
    else if (arg === "--dry-run") execute = false;
    else if (arg.startsWith("--date=")) dates.push(arg.slice("--date=".length));
  }
  return {
    execute,
    dates: dates.length > 0 ? dates : ["2026-05-15", "2026-05-16"],
  };
}

type NotionDate = { start?: string | null } | null;

type NotionTitleNode = { plain_text?: string };

type NotionPage = {
  id: string;
  last_edited_time: string;
  archived: boolean;
  properties: {
    Headline?: { title?: NotionTitleNode[] };
    "Briefing Date"?: { date?: NotionDate };
    Status?: { select?: { name?: string } | null };
    "Kill Reason"?: { select?: { name?: string } | null };
  };
};

type DedupGroup = {
  key: string;
  headline: string;
  briefingDate: string;
  rows: NotionPage[];
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`[dedup] ${name} is not set. Source .env.prod.local before running.`);
    process.exit(1);
  }
  return value;
}

function extractHeadline(page: NotionPage): string {
  const nodes = page.properties.Headline?.title ?? [];
  return nodes.map((n) => n.plain_text ?? "").join("").trim();
}

function extractBriefingDate(page: NotionPage): string | null {
  const start = page.properties["Briefing Date"]?.date?.start ?? null;
  return start ? start.slice(0, 10) : null;
}

function normalizeHeadline(headline: string): string {
  return headline.trim().replace(/\s+/g, " ").toLowerCase();
}

async function queryByDate(input: {
  token: string;
  databaseId: string;
  date: string;
}): Promise<NotionPage[]> {
  const { token, databaseId, date } = input;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_API_VERSION,
  };

  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = {
      filter: {
        property: "Briefing Date",
        date: { equals: date },
      },
      page_size: 100,
    };
    if (cursor) body.start_cursor = cursor;

    const response = await fetch(`${NOTION_BASE}/databases/${databaseId}/query`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "(no body)");
      throw new Error(`Notion query failed (${response.status}) for ${date}: ${text.slice(0, 400)}`);
    }
    const json = (await response.json()) as {
      results: NotionPage[];
      has_more: boolean;
      next_cursor: string | null;
    };
    pages.push(...json.results);
    cursor = json.has_more && json.next_cursor ? json.next_cursor : undefined;
  } while (cursor);

  return pages;
}

function groupDuplicates(pages: NotionPage[]): DedupGroup[] {
  const map = new Map<string, DedupGroup>();
  for (const page of pages) {
    if (page.archived) continue;
    const headline = extractHeadline(page);
    const briefingDate = extractBriefingDate(page);
    if (!headline || !briefingDate) continue;
    const key = `${briefingDate}::${normalizeHeadline(headline)}`;
    const existing = map.get(key);
    if (existing) {
      existing.rows.push(page);
    } else {
      map.set(key, { key, headline, briefingDate, rows: [page] });
    }
  }
  return [...map.values()].filter((g) => g.rows.length > 1);
}

function pickKeeper(group: DedupGroup): { keeper: NotionPage; duplicates: NotionPage[] } {
  // Sort descending by last_edited_time so the most recently touched row is
  // the keeper. Ties break by id (deterministic, arbitrary).
  const sorted = [...group.rows].sort((a, b) => {
    const cmp = b.last_edited_time.localeCompare(a.last_edited_time);
    return cmp !== 0 ? cmp : a.id.localeCompare(b.id);
  });
  const [keeper, ...duplicates] = sorted;
  return { keeper, duplicates };
}

async function archiveDuplicate(input: {
  token: string;
  pageId: string;
  note: string;
}): Promise<void> {
  const { token, pageId, note } = input;
  const response = await fetch(`${NOTION_BASE}/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_API_VERSION,
    },
    body: JSON.stringify({
      properties: {
        Status: { select: { name: "rejected" } },
        "Kill Reason": { select: { name: "redundant" } },
        "Kill Notes": {
          rich_text: [{ text: { content: note.slice(0, 2000) } }],
        },
      },
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(`Patch failed for ${pageId}: ${response.status} ${text.slice(0, 400)}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = requireEnv("NOTION_TOKEN");
  const databaseId = requireEnv("NOTION_EDITORIAL_QUEUE_DB_ID");

  console.log(`[dedup] mode: ${args.execute ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`[dedup] dates: ${args.dates.join(", ")}`);
  console.log(`[dedup] database: ${databaseId}`);
  console.log();

  let totalGroups = 0;
  let totalDuplicates = 0;
  const note = `Deduplication cleanup ${new Date().toISOString().slice(0, 10)} — duplicate from multi-cron run`;

  for (const date of args.dates) {
    console.log(`[dedup] === ${date} ===`);
    let pages: NotionPage[];
    try {
      pages = await queryByDate({ token, databaseId, date });
    } catch (error) {
      console.error(`[dedup]   query failed: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    console.log(`[dedup]   total rows on this date: ${pages.length}`);

    const groups = groupDuplicates(pages);
    console.log(`[dedup]   duplicate groups: ${groups.length}`);

    for (const group of groups) {
      const { keeper, duplicates } = pickKeeper(group);
      totalGroups += 1;
      totalDuplicates += duplicates.length;
      const preview = group.headline.slice(0, 70);
      console.log(`[dedup]     "${preview}" × ${group.rows.length}`);
      console.log(`[dedup]       keeping ${keeper.id} (last_edited ${keeper.last_edited_time})`);
      for (const dup of duplicates) {
        console.log(`[dedup]       ${args.execute ? "archiving" : "would archive"} ${dup.id} (last_edited ${dup.last_edited_time})`);
        if (args.execute) {
          try {
            await archiveDuplicate({ token, pageId: dup.id, note });
          } catch (error) {
            console.error(`[dedup]         FAILED: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    }
    console.log();
  }

  console.log(`[dedup] summary: ${totalGroups} duplicate groups, ${totalDuplicates} rows ${args.execute ? "archived" : "would be archived"}`);
  if (!args.execute && totalDuplicates > 0) {
    console.log(`[dedup] re-run with: npm run notion:dedup:execute`);
  }
}

main().catch((error) => {
  console.error("[dedup] fatal:", error);
  process.exit(1);
});
