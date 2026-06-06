type Slot = "Core" | "Context";
type Category = "Tech" | "Finance" | "Politics";

export type EditorialCandidateForNotion = {
  headline: string;
  source: string;
  body: string;
  url: string;
  category: Category | null;
  newsletterCoOccurrence: number;
  slot: Slot;
};

export type EditorialQueueWriteAction =
  | "inserted"
  | "updated"
  | "skipped_human_edited"
  /**
   * Track 2 P4 — the same headline was already staged at a non-`raw`
   * status within the last `CROSS_DATE_DEDUP_LOOKBACK_DAYS` (typically
   * 14). The editor / archive system already has it. We do NOT create a
   * new row on a different briefing date; preserves each day's archive
   * but stops evergreen recurrence (e.g. the two recurring Fed-research
   * pieces that drifted across multiple briefing dates without ever
   * being re-edited by BM).
   */
  | "skipped_duplicate_across_dates";

export type EditorialQueueWriteResult = {
  action: EditorialQueueWriteAction;
  /** The Notion page ID for the row (set for inserted/updated; also set for skipped). */
  pageId: string;
  /**
   * Existing Status value seen when the action is `skipped_human_edited`
   * or `skipped_duplicate_across_dates`. Omitted for inserts; for
   * updates, this is always "raw" (otherwise we would skip).
   */
  existingStatus?: string;
  /**
   * Set for `skipped_duplicate_across_dates`: the briefing date of the
   * pre-existing row that triggered the skip. Useful in logs to confirm
   * the cross-date match was real.
   */
  existingBriefingDate?: string;
};

const NOTION_API_VERSION = "2022-06-28";
const NOTION_PAGES_URL = "https://api.notion.com/v1/pages";
const NOTION_TITLE_MAX = 2000;
/**
 * Cross-date dedup lookback window. Long enough to catch evergreens
 * a single source typically re-serves (1-2 weeks); short enough that a
 * later re-staging on a genuinely new briefing date is not blocked
 * indefinitely. Adjust with care — narrower lets evergreens recur;
 * wider risks suppressing a legitimate re-publish of a story whose
 * substance changed.
 */
const CROSS_DATE_DEDUP_LOOKBACK_DAYS = 14;

function richText(content: string) {
  return [{ text: { content: content.slice(0, NOTION_TITLE_MAX) } }];
}

function buildProperties(
  candidate: EditorialCandidateForNotion,
  briefingDate: string,
  options: { includeStatus: boolean },
): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    Headline: { title: richText(candidate.headline) },
    Source: { rich_text: richText(candidate.source) },
    "Article Body": { rich_text: richText(candidate.body) },
    "Newsletter Co-occurrence": { number: candidate.newsletterCoOccurrence },
    Slot: { select: { name: candidate.slot } },
    "Briefing Date": { date: { start: briefingDate } },
    "Pushed to Supabase": { checkbox: false },
    "Editorial Source": { select: { name: "AI" } },
  };

  if (options.includeStatus) {
    properties.Status = { select: { name: "raw" } };
  }

  if (candidate.url) {
    properties["Source URL"] = { url: candidate.url };
  }

  if (candidate.category) {
    properties.Category = { select: { name: candidate.category } };
  }

  return properties;
}

type NotionFindMatch = {
  pageId: string;
  status: string | null;
};

async function findExistingRow(
  notionDbId: string,
  headline: string,
  briefingDate: string,
  token: string,
): Promise<NotionFindMatch | null> {
  const headlineForQuery = headline.slice(0, NOTION_TITLE_MAX);
  const response = await fetch(
    `https://api.notion.com/v1/databases/${notionDbId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_API_VERSION,
      },
      body: JSON.stringify({
        filter: {
          and: [
            { property: "Headline", title: { equals: headlineForQuery } },
            { property: "Briefing Date", date: { equals: briefingDate } },
          ],
        },
        page_size: 5,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(`Notion query failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    results?: Array<{
      id?: string;
      properties?: { Status?: { select?: { name?: string } | null } };
    }>;
  };

  const first = data.results?.[0];
  if (!first?.id) return null;

  const statusName = first.properties?.Status?.select?.name ?? null;
  return { pageId: first.id, status: statusName };
}

async function createRow(
  notionDbId: string,
  candidate: EditorialCandidateForNotion,
  briefingDate: string,
  token: string,
): Promise<string> {
  const response = await fetch(NOTION_PAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_API_VERSION,
    },
    body: JSON.stringify({
      parent: { database_id: notionDbId },
      properties: buildProperties(candidate, briefingDate, { includeStatus: true }),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    console.error("[notion-writer] create failed", {
      status: response.status,
      headline: candidate.headline.slice(0, 80),
      notionDbId,
      responseBody: parsed,
    });
    throw new Error(`Notion create failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { id?: string };
  if (!data.id) {
    throw new Error("Notion create response did not contain a page id.");
  }
  return data.id;
}

async function updateRow(
  pageId: string,
  candidate: EditorialCandidateForNotion,
  briefingDate: string,
  token: string,
): Promise<void> {
  // Do not overwrite Status — the row already exists at status=raw and we
  // never want a write to demote a row that may be about to be promoted.
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_API_VERSION,
    },
    body: JSON.stringify({
      properties: buildProperties(candidate, briefingDate, { includeStatus: false }),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    console.error("[notion-writer] update failed", {
      status: response.status,
      headline: candidate.headline.slice(0, 80),
      pageId,
      responseBody: parsed,
    });
    throw new Error(`Notion update failed (${response.status}): ${text}`);
  }
}

/**
 * Track 2 P4 — find an EXISTING row with the same Headline staged on a
 * DIFFERENT briefing date within the last `lookbackDays`. Returns the
 * first match (in case there are several recurrences). Used by the
 * cross-date dedup guard to refuse re-staging evergreens that BM has
 * already advanced past `raw`.
 *
 * Implementation note: Notion's database query doesn't support a "NOT
 * EQUAL" filter on date directly — we filter to the date range
 * `[today - lookbackDays, today - 1]` (which excludes today by
 * construction). The same-day `findExistingRow` continues to handle the
 * same-briefing-date case.
 */
type CrossDateMatch = {
  pageId: string;
  status: string | null;
  briefingDate: string | null;
};

async function findCrossDateMatch(
  notionDbId: string,
  headline: string,
  briefingDate: string,
  token: string,
  lookbackDays: number,
): Promise<CrossDateMatch | null> {
  const todayMs = Date.parse(`${briefingDate}T00:00:00Z`);
  if (Number.isNaN(todayMs)) return null;
  const startMs = todayMs - lookbackDays * 24 * 60 * 60 * 1000;
  const startISO = new Date(startMs).toISOString().slice(0, 10);
  // End is the day BEFORE the current briefingDate so we don't
  // double-match the same-day row (which findExistingRow handles).
  const endMs = todayMs - 24 * 60 * 60 * 1000;
  const endISO = new Date(endMs).toISOString().slice(0, 10);

  const headlineForQuery = headline.slice(0, NOTION_TITLE_MAX);
  const response = await fetch(
    `https://api.notion.com/v1/databases/${notionDbId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_API_VERSION,
      },
      body: JSON.stringify({
        filter: {
          and: [
            { property: "Headline", title: { equals: headlineForQuery } },
            { property: "Briefing Date", date: { on_or_after: startISO } },
            { property: "Briefing Date", date: { on_or_before: endISO } },
          ],
        },
        page_size: 5,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(`Notion cross-date query failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    results?: Array<{
      id?: string;
      properties?: {
        Status?: { select?: { name?: string } | null };
        "Briefing Date"?: { date?: { start?: string } | null };
      };
    }>;
  };

  const first = data.results?.[0];
  if (!first?.id) return null;
  const statusName = first.properties?.Status?.select?.name ?? null;
  const existingBriefingDate = first.properties?.["Briefing Date"]?.date?.start ?? null;
  return { pageId: first.id, status: statusName, briefingDate: existingBriefingDate };
}

/**
 * Idempotent write to the Notion Editorial Queue:
 *  - Same briefing date: inserts when no matching row exists, updates
 *    in place when a matching row exists with Status="raw", skips
 *    entirely when a matching row exists with any other Status (human
 *    editor touched it).
 *  - Cross-date (#P4): if the same Headline already exists within the
 *    last `CROSS_DATE_DEDUP_LOOKBACK_DAYS` on a DIFFERENT briefing
 *    date at any non-`raw` status (i.e. the editor has already moved
 *    it through the queue), skip with `skipped_duplicate_across_dates`
 *    rather than create a fresh row. A row still at `raw` on a prior
 *    date is treated as not-yet-processed and re-staging is allowed
 *    (matches existing "raw can be updated" semantics).
 */
export async function writeEditorialQueueRow(input: {
  candidate: EditorialCandidateForNotion;
  briefingDate: string;
  notionDbId: string;
  /**
   * Track 2 dry-run harness: when true, still run the same-day + cross-date
   * READ lookups (so the computed action — insert/update/skip — is the real
   * one), but skip the actual createRow/updateRow Notion WRITE. The returned
   * action reports what WOULD happen; zero writes occur.
   */
  dryRun?: boolean;
}): Promise<EditorialQueueWriteResult> {
  const { candidate, briefingDate, notionDbId, dryRun = false } = input;
  const token = process.env.NOTION_TOKEN?.trim();

  if (!token) {
    throw new Error("NOTION_TOKEN is not configured.");
  }

  const existing = await findExistingRow(
    notionDbId,
    candidate.headline,
    briefingDate,
    token,
  );

  if (existing) {
    if (existing.status !== "raw") {
      return {
        action: "skipped_human_edited",
        pageId: existing.pageId,
        existingStatus: existing.status ?? "(unset)",
      };
    }
    if (!dryRun) {
      await updateRow(existing.pageId, candidate, briefingDate, token);
    }
    return { action: "updated", pageId: existing.pageId };
  }

  // No same-day match. Check the cross-date window before inserting.
  const crossDate = await findCrossDateMatch(
    notionDbId,
    candidate.headline,
    briefingDate,
    token,
    CROSS_DATE_DEDUP_LOOKBACK_DAYS,
  );
  if (crossDate && crossDate.status && crossDate.status !== "raw") {
    return {
      action: "skipped_duplicate_across_dates",
      pageId: crossDate.pageId,
      existingStatus: crossDate.status,
      existingBriefingDate: crossDate.briefingDate ?? undefined,
    };
  }

  if (dryRun) {
    return { action: "inserted", pageId: "(dry-run)" };
  }
  const pageId = await createRow(notionDbId, candidate, briefingDate, token);
  return { action: "inserted", pageId };
}
