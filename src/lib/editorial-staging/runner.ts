import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { errorContext, logServerEvent } from "@/lib/observability";
import { deduplicateCandidates, type NewsletterCandidate, type RssCandidate } from "@/lib/editorial-staging/dedup";
import { writeEditorialQueueRow } from "@/lib/editorial-staging/notion-writer";
import { sendEditorialCompletionEmail } from "@/lib/editorial-staging/email";

type Category = "Tech" | "Finance" | "Politics";

type StagedCandidate = {
  headline: string;
  source: string;
  body: string;
  url: string;
  category: Category | null;
  newsletterCoOccurrence: number;
  sourceOverlap: boolean;
  score: number;
  slot: "Core" | "Context";
};

export type EditorialStagingRunSummary = {
  message: string;
  briefingDate: string;
  candidateCount: number;
  coreCount: number;
  contextCount: number;
  categoryBreakdown: Record<string, number>;
  notionRowsWritten: number;
};

export type EditorialStagingRunResult = {
  success: boolean;
  timestamp: string;
  summary: EditorialStagingRunSummary;
};

const NEWSLETTER_DISCOVERY_SELECTION_REASON =
  "Newsletter discovery candidate; BM review required.";

function todayTaipei(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function todayUtcBounds(briefingDate: string): { start: string; end: string } {
  const start = new Date(`${briefingDate}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function categorize(value: string | null | undefined): Category | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v === "tech") return "Tech";
  if (v === "finance") return "Finance";
  if (v === "politics") return "Politics";
  return null;
}

type DbClient = NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>;

async function fetchNewsletterCandidates(
  db: DbClient,
  briefingDate: string,
): Promise<NewsletterCandidate[]> {
  const { start, end } = todayUtcBounds(briefingDate);

  const emailsResult = await db
    .from("newsletter_emails")
    .select("id, sender")
    .gte("received_at", start)
    .lte("received_at", end);

  if (emailsResult.error || !emailsResult.data?.length) {
    return [];
  }

  type EmailRow = { id: string; sender: string };
  const emails = emailsResult.data as EmailRow[];
  const emailIds = emails.map((e) => e.id);

  const extractionsResult = await db
    .from("newsletter_story_extractions")
    .select("headline, source_domain, snippet, source_url, category, newsletter_email_id")
    .in("newsletter_email_id", emailIds)
    .not("source_url", "is", null);

  if (extractionsResult.error || !extractionsResult.data?.length) {
    return [];
  }

  type ExtractionRow = {
    headline: string;
    source_domain: string | null;
    snippet: string | null;
    source_url: string;
    category: string | null;
    newsletter_email_id: string;
  };

  const storiesByUrl = new Map<string, NewsletterCandidate>();

  for (const ext of extractionsResult.data as ExtractionRow[]) {
    const key = (ext.source_url || "").toLowerCase().replace(/\/$/, "");
    if (!key) continue;

    const existing = storiesByUrl.get(key);
    if (existing) {
      existing.newsletterCount += 1;
    } else {
      storiesByUrl.set(key, {
        headline: ext.headline || "",
        source: ext.source_domain || "Newsletter",
        body: ext.snippet || "",
        url: ext.source_url,
        category: categorize(ext.category),
        newsletterCount: 1,
      });
    }
  }

  return [...storiesByUrl.values()];
}

async function fetchRssCandidates(
  db: DbClient,
  briefingDate: string,
): Promise<RssCandidate[]> {
  const result = await db
    .from("signal_posts")
    .select("title, source_name, summary, source_url, tags, signal_score")
    .eq("briefing_date", briefingDate)
    .neq("selection_reason", NEWSLETTER_DISCOVERY_SELECTION_REASON)
    .eq("is_live", false)
    .limit(50);

  if (result.error || !result.data?.length) {
    return [];
  }

  type SignalRow = {
    title: string;
    source_name: string | null;
    summary: string | null;
    source_url: string | null;
    tags: string[] | null;
    signal_score: number | null;
  };

  return (result.data as SignalRow[]).map((row) => ({
    headline: row.title || "",
    source: row.source_name || "",
    body: row.summary || "",
    url: row.source_url || "",
    category: categorize(row.tags?.[0]),
    baseScore: row.signal_score ?? 50,
  }));
}

function scoreAndSelect(
  candidates: Array<{
    headline: string;
    source: string;
    body: string;
    url: string;
    category: Category | null;
    newsletterCoOccurrence: number;
    sourceOverlap: boolean;
    baseScore: number;
  }>,
): StagedCandidate[] {
  const scored = candidates
    .map((c) => ({ ...c, score: c.baseScore + c.newsletterCoOccurrence * 10 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 7);

  return scored.map((c, i) => ({ ...c, slot: i < 5 ? ("Core" as const) : ("Context" as const) }));
}

function buildFailureResult(
  timestamp: string,
  briefingDate: string,
  message: string,
): EditorialStagingRunResult {
  return {
    success: false,
    timestamp,
    summary: {
      message,
      briefingDate,
      candidateCount: 0,
      coreCount: 0,
      contextCount: 0,
      categoryBreakdown: {},
      notionRowsWritten: 0,
    },
  };
}

export async function runEditorialStaging(options: {
  now?: Date;
} = {}): Promise<EditorialStagingRunResult> {
  const now = options.now ?? new Date();
  const timestamp = now.toISOString();
  const briefingDate = todayTaipei(now);
  const notionDbId = process.env.NOTION_EDITORIAL_QUEUE_DB_ID;

  if (!notionDbId) {
    return buildFailureResult(timestamp, briefingDate, "NOTION_EDITORIAL_QUEUE_DB_ID is not configured.");
  }

  const db = createSupabaseServiceRoleClient();

  if (!db) {
    return buildFailureResult(timestamp, briefingDate, "Supabase service role client is not configured.");
  }

  // Step B: Newsletter candidates
  let newsletterCandidates: NewsletterCandidate[] = [];
  try {
    newsletterCandidates = await fetchNewsletterCandidates(db, briefingDate);
    logServerEvent("info", "Editorial staging: newsletter candidates fetched", {
      count: newsletterCandidates.length,
      briefingDate,
    });
  } catch (error) {
    logServerEvent("error", "Editorial staging: newsletter candidate fetch failed", {
      briefingDate,
      ...errorContext(error),
    });
  }

  // Step C: RSS candidates
  let rssCandidates: RssCandidate[] = [];
  try {
    rssCandidates = await fetchRssCandidates(db, briefingDate);
    logServerEvent("info", "Editorial staging: RSS candidates fetched", {
      count: rssCandidates.length,
      briefingDate,
    });
  } catch (error) {
    logServerEvent("error", "Editorial staging: RSS candidate fetch failed", {
      briefingDate,
      ...errorContext(error),
    });
  }

  // Step D: Dedup across both batches
  const dedupedPool = deduplicateCandidates(newsletterCandidates, rssCandidates);

  // Step E: Score and select top 7
  const selected = scoreAndSelect(dedupedPool);

  // Step F: Write to Notion Editorial Queue
  let notionRowsWritten = 0;

  for (const candidate of selected) {
    try {
      await writeEditorialQueueRow({ candidate, briefingDate, notionDbId });
      notionRowsWritten += 1;
    } catch (error) {
      logServerEvent("error", "Editorial staging: Notion row write failed", {
        headline: candidate.headline.slice(0, 60),
        slot: candidate.slot,
        ...errorContext(error),
      });
    }
  }

  const coreCount = selected.filter((c) => c.slot === "Core").length;
  const contextCount = selected.filter((c) => c.slot === "Context").length;
  const categoryBreakdown = selected.reduce<Record<string, number>>((acc, c) => {
    const cat = c.category ?? "Uncategorized";
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  // Step G: Send completion email
  try {
    await sendEditorialCompletionEmail({
      briefingDate,
      candidateCount: selected.length,
      coreCount,
      contextCount,
      categoryBreakdown,
      notionDbId,
    });
  } catch (error) {
    logServerEvent("error", "Editorial staging: completion email failed", {
      briefingDate,
      ...errorContext(error),
    });
  }

  const message =
    selected.length === 0
      ? "Editorial staging completed but no candidates were staged."
      : `Editorial staging completed: ${selected.length} candidates staged to Notion (${coreCount} Core, ${contextCount} Context).`;

  logServerEvent("info", "Editorial staging completed", {
    briefingDate,
    candidateCount: selected.length,
    coreCount,
    contextCount,
    notionRowsWritten,
  });

  return {
    success: true,
    timestamp,
    summary: {
      message,
      briefingDate,
      candidateCount: selected.length,
      coreCount,
      contextCount,
      categoryBreakdown,
      notionRowsWritten,
    },
  };
}
