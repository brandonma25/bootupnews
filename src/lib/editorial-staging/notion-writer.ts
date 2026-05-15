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

const NOTION_API_VERSION = "2022-06-28";
const NOTION_PAGES_URL = "https://api.notion.com/v1/pages";

function richText(content: string) {
  return [{ text: { content: content.slice(0, 2000) } }];
}

export async function writeEditorialQueueRow(input: {
  candidate: EditorialCandidateForNotion;
  briefingDate: string;
  notionDbId: string;
}): Promise<void> {
  const { candidate, briefingDate, notionDbId } = input;
  const token = process.env.NOTION_TOKEN;

  if (!token) {
    throw new Error("NOTION_TOKEN is not configured.");
  }

  const properties: Record<string, unknown> = {
    "Headline": { title: richText(candidate.headline) },
    "Source": { rich_text: richText(candidate.source) },
    "Article Body": { rich_text: richText(candidate.body) },
    "Newsletter Co-occurrence": { number: candidate.newsletterCoOccurrence },
    "Slot": { select: { name: candidate.slot } },
    "Briefing Date": { date: { start: briefingDate } },
    "Status": { select: { name: "raw" } },
    "Pushed to Supabase": { checkbox: false },
  };

  if (candidate.url) {
    properties["Source URL"] = { url: candidate.url };
  }

  if (candidate.category) {
    properties["Category"] = { select: { name: candidate.category } };
  }

  const response = await fetch(NOTION_PAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_API_VERSION,
    },
    body: JSON.stringify({
      parent: { database_id: notionDbId },
      properties,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(`Notion write failed (${response.status}): ${text.slice(0, 500)}`);
  }
}
