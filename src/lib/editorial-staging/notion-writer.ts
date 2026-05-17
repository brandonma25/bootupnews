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
  | "skipped_human_edited";

export type EditorialQueueWriteResult = {
  action: EditorialQueueWriteAction;
  /** The Notion page ID for the row (set for inserted/updated; also set for skipped). */
  pageId: string;
  /**
   * Existing Status value seen when the action is `skipped_human_edited`. Omitted
   * for inserts; for updates, this is always "raw" (otherwise we would skip).
   */
  existingStatus?: string;
};

const NOTION_API_VERSION = "2022-06-28";
const NOTION_PAGES_URL = "https://api.notion.com/v1/pages";
const NOTION_TITLE_MAX = 2000;

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
 * Idempotent write to the Notion Editorial Queue, keyed on Headline +
 * Briefing Date:
 *  - inserts when no matching row exists,
 *  - updates in place when a matching row exists with Status="raw",
 *  - skips entirely when a matching row exists with any other Status
 *    (the row has been touched by the human editor).
 */
export async function writeEditorialQueueRow(input: {
  candidate: EditorialCandidateForNotion;
  briefingDate: string;
  notionDbId: string;
}): Promise<EditorialQueueWriteResult> {
  const { candidate, briefingDate, notionDbId } = input;
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
    await updateRow(existing.pageId, candidate, briefingDate, token);
    return { action: "updated", pageId: existing.pageId };
  }

  const pageId = await createRow(notionDbId, candidate, briefingDate, token);
  return { action: "inserted", pageId };
}
