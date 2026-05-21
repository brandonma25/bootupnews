/**
 * Source Health summary CLI (Task 2.E — PRD-11).
 *
 * Queries the Notion Source Health Log database and prints a Markdown table
 * of per-source outcomes for the last N days. Use this to answer:
 *  - Which feeds are chronically failing?
 *  - Which newsletter senders are leaking junk URLs at parse?
 *  - Whether the circuit breaker is currently tripping anything.
 *
 * Usage:
 *   npm run source-health:summary -- --days 7
 *   npm run source-health:summary -- --days 14 --out reports/health-2026-05-21.md
 *
 * Env vars required:
 *   NOTION_TOKEN
 *   NOTION_SOURCE_HEALTH_LOG_DB_ID
 *
 * The script is read-only — it never POSTs / PATCHes to Notion.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const NOTION_API_VERSION = "2022-06-28";
const DEFAULT_DAYS = 7;

type CliOptions = {
  days: number;
  out: string | null;
};

type NotionPage = {
  id?: string;
  properties?: Record<string, unknown>;
};

type SourceHealthRow = {
  source: string;
  date: string;
  successCount: number;
  failCount: number;
  lastOutcome: string | null;
  lastSuccessfulFetchAt: string | null;
  notes: string;
};

function parseArgs(argv: string[]): CliOptions {
  let days = DEFAULT_DAYS;
  let out: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--days" || arg === "-d") {
      const next = argv[++i];
      const parsed = Number.parseInt(next ?? "", 10);
      if (Number.isFinite(parsed) && parsed > 0) days = parsed;
    } else if (arg === "--out" || arg === "-o") {
      out = argv[++i] ?? null;
    }
  }
  return { days, out };
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`error: ${name} is not set. Export it before running this script.`);
    process.exit(2);
  }
  return value;
}

function toRichText(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const segments = (prop as { rich_text?: Array<{ plain_text?: string }> }).rich_text;
  if (!Array.isArray(segments)) return "";
  return segments.map((s) => s.plain_text ?? "").join("").trim();
}

function toTitle(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const segments = (prop as { title?: Array<{ plain_text?: string }> }).title;
  if (!Array.isArray(segments)) return "";
  return segments.map((s) => s.plain_text ?? "").join("").trim();
}

function toNumber(prop: unknown): number {
  if (!prop || typeof prop !== "object") return 0;
  const value = (prop as { number?: number }).number;
  return typeof value === "number" ? value : 0;
}

function toSelect(prop: unknown): string | null {
  if (!prop || typeof prop !== "object") return null;
  const select = (prop as { select?: { name?: string } | null }).select;
  return select?.name ?? null;
}

function toDate(prop: unknown): string | null {
  if (!prop || typeof prop !== "object") return null;
  const date = (prop as { date?: { start?: string } | null }).date;
  return date?.start ?? null;
}

function mapRow(page: NotionPage): SourceHealthRow {
  const props = page.properties ?? {};
  return {
    source: toTitle(props.Source) || toRichText(props.Source) || "(no source)",
    date: toDate(props.Date) ?? "(no date)",
    successCount: toNumber(props["Success Count"]),
    failCount: toNumber(props["Fail Count"]),
    lastOutcome: toSelect(props["Last Outcome"]),
    lastSuccessfulFetchAt: toDate(props["Last Successful Fetch"]),
    notes: toRichText(props.Notes),
  };
}

async function queryHealthRows(
  dbId: string,
  token: string,
  sinceISODate: string,
): Promise<SourceHealthRow[]> {
  const rows: SourceHealthRow[] = [];
  let cursor: string | undefined;

  do {
    const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_API_VERSION,
      },
      body: JSON.stringify({
        filter: {
          property: "Date",
          date: { on_or_after: sinceISODate },
        },
        sorts: [{ property: "Date", direction: "descending" }],
        start_cursor: cursor,
        page_size: 100,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "(no body)");
      throw new Error(`Notion query failed (${response.status}): ${body.slice(0, 400)}`);
    }

    const data = (await response.json()) as {
      results?: NotionPage[];
      has_more?: boolean;
      next_cursor?: string | null;
    };
    for (const page of data.results ?? []) rows.push(mapRow(page));
    cursor = data.has_more ? data.next_cursor ?? undefined : undefined;
  } while (cursor);

  return rows;
}

function formatTable(rows: SourceHealthRow[]): string {
  if (rows.length === 0) {
    return "_No Source Health Log rows in the requested window._";
  }

  const headers = ["Source", "Date", "Success", "Fail", "Last outcome", "Notes"];
  const body = rows.map((row) => [
    row.source,
    row.date,
    String(row.successCount),
    String(row.failCount),
    row.lastOutcome ?? "—",
    row.notes.replace(/\|/g, "\\|").slice(0, 120),
  ]);

  const widths = headers.map((header, i) =>
    Math.max(header.length, ...body.map((line) => line[i].length)),
  );
  const pad = (cells: string[]) =>
    "| " + cells.map((cell, i) => cell.padEnd(widths[i], " ")).join(" | ") + " |";
  const sep = "| " + widths.map((w) => "-".repeat(w)).join(" | ") + " |";

  return [pad(headers), sep, ...body.map(pad)].join("\n");
}

function chronicFailures(rows: SourceHealthRow[]) {
  const totals = new Map<string, { fail: number; success: number; days: Set<string> }>();
  for (const row of rows) {
    if (!totals.has(row.source)) totals.set(row.source, { fail: 0, success: 0, days: new Set() });
    const t = totals.get(row.source)!;
    t.fail += row.failCount;
    t.success += row.successCount;
    t.days.add(row.date);
  }
  const ranked = [...totals.entries()]
    .map(([source, t]) => ({
      source,
      failTotal: t.fail,
      successTotal: t.success,
      dayCount: t.days.size,
      failRate: t.fail / Math.max(1, t.fail + t.success),
    }))
    .filter((entry) => entry.failTotal > 0)
    .sort((a, b) => b.failRate - a.failRate || b.failTotal - a.failTotal);
  return ranked.slice(0, 10);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const dbId = requireEnv("NOTION_SOURCE_HEALTH_LOG_DB_ID");
  const token = requireEnv("NOTION_TOKEN");

  const since = new Date(Date.now() - opts.days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const rows = await queryHealthRows(dbId, token, since);
  const chronic = chronicFailures(rows);

  const generatedAt = new Date().toISOString();
  const md = [
    `# Source Health Summary`,
    ``,
    `Generated ${generatedAt} · window: last ${opts.days} day(s), since ${since}`,
    ``,
    `## Per-source totals (rows ordered newest first)`,
    ``,
    formatTable(rows),
    ``,
    `## Top 10 chronic failures`,
    ``,
    chronic.length === 0
      ? "_No source had any failed runs in the window._"
      : "| Source | Fail | Success | Days seen | Fail rate |\n| --- | ---: | ---: | ---: | ---: |\n" +
        chronic
          .map(
            (c) =>
              `| ${c.source} | ${c.failTotal} | ${c.successTotal} | ${c.dayCount} | ${(c.failRate * 100).toFixed(1)}% |`,
          )
          .join("\n"),
    ``,
    `## Reading guide`,
    ``,
    `- **\`fail\`** outcome rows are real fetch/parse failures and feed the circuit breaker (3 fails in one day → next day's run is skipped).`,
    `- **\`junk_filtered\`** outcome rows mean the URL filter rejected N candidate URLs as non-articles (asset extensions, tracking redirectors). They do NOT increment Fail Count and do NOT trip the circuit breaker.`,
    `- **\`skipped_circuit_breaker\`** outcome rows mean we deliberately skipped the fetch because the breaker had already tripped earlier that day.`,
    `- **\`success\`** outcome rows mean fetch + parse + at least one story extracted; \`Last Successful Fetch\` is the timestamp of the most recent ok run.`,
    ``,
  ].join("\n");

  if (opts.out) {
    const path = resolve(process.cwd(), opts.out);
    writeFileSync(path, md, "utf8");
    console.log(`Wrote ${path}`);
  } else {
    process.stdout.write(md);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
