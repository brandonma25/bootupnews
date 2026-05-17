import { errorContext, logServerEvent } from "@/lib/observability";

/**
 * Source Health Log writer (PRD-65 Phase 4).
 *
 * Writes one Notion row per `(Source, Date)` recording per-source fetch
 * outcomes for the Branch B RSS path. The Phase 4.5 circuit breaker reads
 * this database to decide whether to skip a flaky source.
 *
 * Schema is documented in `docs/notion-source-health-schema.md`. The database
 * must be created manually in Notion by BM and its ID set as the
 * `NOTION_SOURCE_HEALTH_LOG_DB_ID` Vercel env var.
 *
 * Failure contract: this writer never throws. Missing env var, missing token,
 * or any Notion API failure produces a `{ written: false, reason }` result
 * and a warn-level log entry. The calling ingestion run continues regardless.
 *
 * Idempotency: each write is keyed on `(Source, Date)`. If a row exists, the
 * writer PATCHes it (incrementing counters and updating `Last Outcome`); if
 * not, it POSTs a new row.
 */

const NOTION_API_VERSION = "2022-06-28";
const NOTION_PAGES_URL = "https://api.notion.com/v1/pages";

export type SourceHealthOutcome = "success" | "fail" | "skipped_circuit_breaker";

export type SourceHealthEntry = {
  /** Source display name; the natural key alongside `date`. */
  source: string;
  /** Taipei briefing day (YYYY-MM-DD). */
  date: string;
  outcome: SourceHealthOutcome;
  /** ISO 8601 timestamp of the most recent successful fetch. Only meaningful when outcome === "success". */
  lastSuccessfulFetchAt?: string;
  /** Optional context. Capped at ~500 chars before write. */
  notes?: string;
};

export type SourceHealthWriteResult =
  | { written: true; pageId: string; action: "inserted" | "updated" }
  | { written: false; reason: string };

const NOTES_CAP = 500;
const NOTION_TITLE_MAX = 2000;

function richText(content: string) {
  return [{ text: { content: content.slice(0, NOTION_TITLE_MAX) } }];
}

function truncate(input: string, max: number): string {
  return input.length <= max ? input : input.slice(0, max - 1) + "…";
}

function ensureEnv(): { ok: true; dbId: string; token: string } | { ok: false; reason: string } {
  const dbId = process.env.NOTION_SOURCE_HEALTH_LOG_DB_ID?.trim();
  if (!dbId) return { ok: false, reason: "NOTION_SOURCE_HEALTH_LOG_DB_ID not configured" };
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) return { ok: false, reason: "NOTION_TOKEN not configured" };
  return { ok: true, dbId, token };
}

type ExistingRow = {
  pageId: string;
  successCount: number;
  failCount: number;
  lastSuccessfulFetchAt: string | null;
};

async function findExistingRow(
  dbId: string,
  token: string,
  source: string,
  date: string,
): Promise<ExistingRow | null> {
  const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_API_VERSION,
    },
    body: JSON.stringify({
      filter: {
        and: [
          { property: "Source", title: { equals: source.slice(0, NOTION_TITLE_MAX) } },
          { property: "Date", date: { equals: date } },
        ],
      },
      page_size: 1,
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(`Source-health query failed (${response.status}): ${text}`);
  }
  const data = (await response.json()) as {
    results?: Array<{
      id?: string;
      properties?: Record<string, unknown>;
    }>;
  };
  const first = data.results?.[0];
  if (!first?.id) return null;

  const props = first.properties as Record<string, { number?: number; date?: { start?: string } | null }>;
  const successCount =
    typeof props["Success Count"]?.number === "number" ? props["Success Count"].number! : 0;
  const failCount = typeof props["Fail Count"]?.number === "number" ? props["Fail Count"].number! : 0;
  const lastSuccessfulFetchAt = props["Last Successful Fetch"]?.date?.start ?? null;

  return { pageId: first.id, successCount, failCount, lastSuccessfulFetchAt };
}

function buildProperties(
  entry: SourceHealthEntry,
  existing: ExistingRow | null,
  includeTitle: boolean,
): Record<string, unknown> {
  const previousSuccess = existing?.successCount ?? 0;
  const previousFail = existing?.failCount ?? 0;
  const previousLastSuccess = existing?.lastSuccessfulFetchAt ?? null;

  const successDelta = entry.outcome === "success" ? 1 : 0;
  const failDelta = entry.outcome === "fail" ? 1 : 0;
  // Circuit-breaker skips do not increment either counter — they are pure
  // signals of "we deliberately did not try", not feed outcomes.

  const properties: Record<string, unknown> = {
    Date: { date: { start: entry.date } },
    "Success Count": { number: previousSuccess + successDelta },
    "Fail Count": { number: previousFail + failDelta },
    "Last Outcome": { select: { name: entry.outcome } },
  };

  if (includeTitle) {
    properties.Source = { title: richText(entry.source) };
  }

  const newLastSuccess =
    entry.outcome === "success" && entry.lastSuccessfulFetchAt
      ? entry.lastSuccessfulFetchAt
      : previousLastSuccess;
  if (newLastSuccess) {
    properties["Last Successful Fetch"] = { date: { start: newLastSuccess } };
  }

  if (entry.notes) {
    properties.Notes = { rich_text: richText(truncate(entry.notes, NOTES_CAP)) };
  }

  return properties;
}

export async function writeSourceHealthEntry(
  entry: SourceHealthEntry,
): Promise<SourceHealthWriteResult> {
  const env = ensureEnv();
  if (!env.ok) {
    logServerEvent("warn", "Source health log skipped: env not configured", {
      reason: env.reason,
      source: entry.source,
      date: entry.date,
      outcome: entry.outcome,
    });
    return { written: false, reason: env.reason };
  }

  try {
    const existing = await findExistingRow(env.dbId, env.token, entry.source, entry.date);

    if (existing) {
      const response = await fetch(`https://api.notion.com/v1/pages/${existing.pageId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${env.token}`,
          "Content-Type": "application/json",
          "Notion-Version": NOTION_API_VERSION,
        },
        body: JSON.stringify({
          properties: buildProperties(entry, existing, false),
        }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "(no body)");
        logServerEvent("warn", "Source health log update failed", {
          source: entry.source,
          date: entry.date,
          pageId: existing.pageId,
          httpStatus: response.status,
          body: truncate(text, 400),
        });
        return { written: false, reason: `HTTP ${response.status}` };
      }
      return { written: true, pageId: existing.pageId, action: "updated" };
    }

    const response = await fetch(NOTION_PAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.token}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_API_VERSION,
      },
      body: JSON.stringify({
        parent: { database_id: env.dbId },
        properties: buildProperties(entry, null, true),
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "(no body)");
      logServerEvent("warn", "Source health log create failed", {
        source: entry.source,
        date: entry.date,
        httpStatus: response.status,
        body: truncate(text, 400),
      });
      return { written: false, reason: `HTTP ${response.status}` };
    }
    const data = (await response.json().catch(() => ({}))) as { id?: string };
    return data.id
      ? { written: true, pageId: data.id, action: "inserted" }
      : { written: false, reason: "Notion response missing id" };
  } catch (error) {
    logServerEvent("warn", "Source health log write threw", {
      source: entry.source,
      date: entry.date,
      ...errorContext(error),
    });
    return { written: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
