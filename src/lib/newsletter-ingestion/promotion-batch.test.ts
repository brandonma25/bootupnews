import { describe, expect, it } from "vitest";

import type { GmailApiClient, GmailRawMessage } from "@/lib/newsletter-ingestion/gmail";
import {
  promoteNewsletterStoryBatch,
  type NewsletterCandidatePlan,
  planNewsletterStoryPromotions,
} from "@/lib/newsletter-ingestion/promotion";
import { runNewsletterIngestion } from "@/lib/newsletter-ingestion/runner";
import type { NewsletterDbClient, NewsletterStoryExtractionRow } from "@/lib/newsletter-ingestion/storage";
import type { NewsletterIngestionConfig } from "@/lib/newsletter-ingestion/config";

type Row = Record<string, unknown>;
type TableName = "newsletter_emails" | "newsletter_story_extractions" | "signal_posts";

/**
 * In-memory Supabase double that ALSO records every signal_posts insert call —
 * the load-bearing assertion for atomicity is "exactly one bulk insert, with N
 * rows, never partial." `failSignalPostsInsert` makes the bulk insert return a
 * PostgREST error WITHOUT persisting (a failed multi-row INSERT commits nothing).
 */
function createCountingDb(
  initial: Partial<Record<TableName, Row[]>> = {},
  options: { failSignalPostsInsert?: boolean } = {},
) {
  const tables: Record<TableName, Row[]> = {
    newsletter_emails: [...(initial.newsletter_emails ?? [])],
    newsletter_story_extractions: [...(initial.newsletter_story_extractions ?? [])],
    signal_posts: [...(initial.signal_posts ?? [])],
  };
  let idCounter = 1;
  const signalPostsInserts: { count: number; sizes: number[] } = { count: 0, sizes: [] };

  function createBuilder(tableName: TableName) {
    const filters: Array<{ column: string; value: unknown }> = [];
    const inFilters: Array<{ column: string; values: unknown[] }> = [];
    let operation: "select" | "insert" | "update" = "select";
    let inserted: Row[] = [];
    let updated: Row = {};
    let limitCount: number | null = null;
    let insertFailed = false;

    function applyFilters(rows: Row[]) {
      return rows.filter((row) =>
        filters.every((filter) => row[filter.column] === filter.value) &&
        inFilters.every((filter) => filter.values.includes(row[filter.column])),
      );
    }

    function execute() {
      if (operation === "insert") {
        if (insertFailed) {
          return { data: null, error: { message: "signal_posts bulk insert boom" } };
        }
        const rows = inserted.map((row) => ({
          id: row.id ?? `${tableName}-${idCounter++}`,
          ...row,
        }));
        tables[tableName].push(...rows);
        return { data: rows, error: null };
      }

      if (operation === "update") {
        const rows = applyFilters(tables[tableName]);
        rows.forEach((row) => Object.assign(row, updated));
        return { data: rows, error: null };
      }

      const selected = applyFilters(tables[tableName]);
      return { data: limitCount === null ? selected : selected.slice(0, limitCount), error: null };
    }

    const builder = {
      select() {
        operation = operation === "insert" || operation === "update" ? operation : "select";
        return builder;
      },
      eq(column: string, value: unknown) {
        filters.push({ column, value });
        return builder;
      },
      in(column: string, values: unknown[]) {
        inFilters.push({ column, values });
        return builder;
      },
      limit(count: number) {
        limitCount = count;
        return builder;
      },
      insert(value: Row | Row[]) {
        operation = "insert";
        inserted = Array.isArray(value) ? value : [value];
        if (tableName === "signal_posts") {
          signalPostsInserts.count += 1;
          signalPostsInserts.sizes.push(inserted.length);
          insertFailed = Boolean(options.failSignalPostsInsert);
        }
        return builder;
      },
      update(value: Row) {
        operation = "update";
        updated = value;
        return builder;
      },
      async single() {
        const result = execute();
        return { data: (result.data as Row[] | null)?.[0] ?? null, error: result.error };
      },
      async maybeSingle() {
        const result = execute();
        return { data: (result.data as Row[] | null)?.[0] ?? null, error: result.error };
      },
      then(resolve: (value: { data: Row[] | null; error: unknown }) => void) {
        resolve(execute());
      },
    };

    return builder;
  }

  return {
    tables,
    signalPostsInserts,
    db: {
      from(tableName: TableName) {
        return createBuilder(tableName);
      },
    } as unknown as NewsletterDbClient,
  };
}

function story(overrides: Partial<NewsletterStoryExtractionRow> & { id: string }): NewsletterStoryExtractionRow {
  return {
    newsletter_email_id: "email-1",
    headline: `Headline ${overrides.id}`,
    snippet: `Snippet for ${overrides.id}.`,
    source_url: `https://example.com/${overrides.id}`,
    source_domain: "example.com",
    category: "Tech",
    extraction_confidence: 0.9,
    signal_post_id: null,
    ...overrides,
  };
}

const BRIEFING_DATE = "2026-06-17";

describe("promoteNewsletterStoryBatch — atomic bulk insert", () => {
  it("performs EXACTLY ONE bulk insert for the whole run, with descending unique ranks, and links each extraction", async () => {
    const { db, tables, signalPostsInserts } = createCountingDb({
      newsletter_story_extractions: [story({ id: "a" }), story({ id: "b" }), story({ id: "c" })],
    });

    const results = await promoteNewsletterStoryBatch({
      db,
      briefingDate: BRIEFING_DATE,
      stories: [story({ id: "a" }), story({ id: "b" }), story({ id: "c" })],
      now: new Date("2026-06-17T08:00:00.000Z"),
    });

    // ONE insert call, carrying all three rows (not three single-row inserts).
    expect(signalPostsInserts.count).toBe(1);
    expect(signalPostsInserts.sizes).toEqual([3]);

    expect(tables.signal_posts).toHaveLength(3);
    expect(tables.signal_posts.map((row) => row.rank).sort((x, y) => Number(y) - Number(x))).toEqual([20, 19, 18]);
    expect(new Set(tables.signal_posts.map((row) => row.rank)).size).toBe(3);

    expect(results.every((result) => result.status === "created")).toBe(true);
    // insert -> link seam: every extraction is linked to its committed row.
    expect(tables.newsletter_story_extractions.every((row) => Boolean(row.signal_post_id))).toBe(true);
  });

  it("writes ZERO rows when the run signal is already aborted (timeout leaves an empty slate)", async () => {
    const { db, tables, signalPostsInserts } = createCountingDb();
    const controller = new AbortController();
    controller.abort();

    const results = await promoteNewsletterStoryBatch({
      db,
      briefingDate: BRIEFING_DATE,
      stories: [story({ id: "a" }), story({ id: "b" })],
      now: new Date("2026-06-17T08:00:00.000Z"),
      signal: controller.signal,
    });

    // The single bulk insert is the only signal_posts write — never reached.
    expect(signalPostsInserts.count).toBe(0);
    expect(tables.signal_posts).toHaveLength(0);
    expect(results).toHaveLength(2);
    expect(results.every((result) => result.status === "skipped" && result.reason === "aborted")).toBe(true);
  });

  it("self-heals a prior crash between insert and link: links the orphan row, inserts nothing", async () => {
    // A prior run's bulk insert committed this row, then died before linking.
    const { db, tables, signalPostsInserts } = createCountingDb({
      signal_posts: [{
        id: "orphan-row",
        briefing_date: BRIEFING_DATE,
        rank: 20,
        title: "Headline a",
        source_url: "https://example.com/a",
        editorial_status: "needs_review",
        is_live: false,
        published_at: null,
      }],
    });

    const results = await promoteNewsletterStoryBatch({
      db,
      briefingDate: BRIEFING_DATE,
      stories: [story({ id: "a", signal_post_id: null })],
      now: new Date("2026-06-17T08:00:00.000Z"),
    });

    expect(signalPostsInserts.count).toBe(0);
    expect(tables.signal_posts).toHaveLength(1);
    expect(results[0]).toEqual({ status: "linked_existing", extractionId: "a", signalPostId: "orphan-row" });
    expect(tables.newsletter_story_extractions).toHaveLength(0);
  });

  it("is idempotent: a second run over the same stories inserts nothing (source_url dedupe)", async () => {
    const { db, signalPostsInserts } = createCountingDb();
    const stories = [story({ id: "a" }), story({ id: "b" })];

    await promoteNewsletterStoryBatch({ db, briefingDate: BRIEFING_DATE, stories, now: new Date("2026-06-17T08:00:00.000Z") });
    expect(signalPostsInserts.count).toBe(1);

    // Re-run with the same stories: the rows now exist by source_url, so the
    // planner links instead of inserting — no second insert call.
    await promoteNewsletterStoryBatch({ db, briefingDate: BRIEFING_DATE, stories, now: new Date("2026-06-17T08:05:00.000Z") });
    expect(signalPostsInserts.count).toBe(1);
  });

  it("dedupes duplicate source_urls WITHIN one batch: one insert, the rest linked to it", async () => {
    const { db, tables, signalPostsInserts } = createCountingDb();

    const results = await promoteNewsletterStoryBatch({
      db,
      briefingDate: BRIEFING_DATE,
      stories: [
        story({ id: "a", source_url: "https://example.com/same" }),
        story({ id: "b", source_url: "https://example.com/same" }),
      ],
      now: new Date("2026-06-17T08:00:00.000Z"),
    });

    expect(signalPostsInserts.count).toBe(1);
    expect(signalPostsInserts.sizes).toEqual([1]);
    expect(tables.signal_posts).toHaveLength(1);
    expect(results[0].status).toBe("created");
    expect(results[1].status).toBe("linked_existing");
    const onlyRowId = tables.signal_posts[0]?.id;
    expect(tables.newsletter_story_extractions.every((row) => row.signal_post_id === onlyRowId)).toBe(true);
  });

  it("never leaves partial rows when the bulk insert errors (all-or-nothing)", async () => {
    const { db, tables } = createCountingDb({}, { failSignalPostsInsert: true });

    const results = await promoteNewsletterStoryBatch({
      db,
      briefingDate: BRIEFING_DATE,
      stories: [story({ id: "a" }), story({ id: "b" })],
      now: new Date("2026-06-17T08:00:00.000Z"),
    });

    expect(tables.signal_posts).toHaveLength(0);
    expect(results.every((result) => result.status === "skipped" && result.reason === "storage_error")).toBe(true);
  });
});

describe("planNewsletterStoryPromotions — pure planner", () => {
  it("plans skips/links/inserts against one snapshot with no duplicate ranks", () => {
    const plans = planNewsletterStoryPromotions({
      stories: [
        story({ id: "linked", signal_post_id: "already" }),
        story({ id: "noUrl", source_url: null }),
        story({ id: "fresh1", source_url: "https://example.com/1" }),
        story({ id: "fresh2", source_url: "https://example.com/2" }),
      ],
      existingRows: [],
      briefingDate: BRIEFING_DATE,
      nowIso: "2026-06-17T08:00:00.000Z",
    });

    const byAction = (action: NewsletterCandidatePlan["action"]) => plans.filter((plan) => plan.action === action);
    expect(byAction("skip")).toHaveLength(2);
    const inserts = byAction("insert") as Extract<NewsletterCandidatePlan, { action: "insert" }>[];
    expect(inserts.map((plan) => plan.rank)).toEqual([20, 19]);
  });
});

// ---- Runner-level integration: the timeout must discard buffered stories ----

function rawEmail(headline: string, url: string) {
  return Buffer.from(
    [
      "From: TLDR <newsletter@tldr.tech>",
      "Subject: TLDR Daily",
      "Content-Type: text/plain",
      "",
      headline,
      `${headline} is a real development with clear stakes for the market this week. ${url}`,
    ].join("\r\n"),
    "utf8",
  ).toString("base64url");
}

function writableConfig(): NewsletterIngestionConfig {
  return {
    enabled: true,
    dryRun: false,
    writeCandidates: true,
    label: "bootup-news-benchmark",
    maxEmailsPerRun: 10,
    sinceHours: 36,
    targetEnvironment: "local",
    allowProductionWrites: false,
    gmailClientId: "client-id",
    gmailClientSecret: "client-secret",
    gmailRefreshToken: "refresh-token",
  };
}

describe("runNewsletterIngestion — timeout discards buffered candidates", () => {
  it("never calls the signal_posts insert when the deadline fires mid-loop, even after earlier emails parsed stories", async () => {
    const { db, tables, signalPostsInserts } = createCountingDb();
    const controller = new AbortController();
    const refs = [
      { id: "gmail-1", threadId: "t-1" },
      { id: "gmail-2", threadId: "t-2" },
      { id: "gmail-3", threadId: "t-3" },
    ];
    const rawByMessage: Record<string, string> = {
      "gmail-1": rawEmail("Microsoft expands data center capacity", "https://example.com/cloud"),
      "gmail-2": rawEmail("Treasury yields climb on inflation data", "https://example.com/yields"),
      "gmail-3": rawEmail("Late breaking story", "https://example.com/late"),
    };

    let rawCalls = 0;
    const gmailClient: GmailApiClient = {
      async getLabelByName() {
        return { id: "Label_1", name: "bootup-news-benchmark", messagesTotal: 3, messagesUnread: 0 };
      },
      async listNewsletterMessages() {
        return refs;
      },
      async getRawMessage(messageId): Promise<GmailRawMessage> {
        rawCalls += 1;
        // Simulate the 55s wall firing while the THIRD email is being fetched.
        if (rawCalls === 3) {
          controller.abort();
          throw new Error("Gmail raw message fetch aborted: run deadline reached.");
        }
        return {
          id: messageId,
          threadId: `t-${messageId}`,
          raw: rawByMessage[messageId] ?? rawEmail("Fallback", "https://example.com/fallback"),
          internalDate: "1781000000000",
        };
      },
    };

    const result = await runNewsletterIngestion(
      { writeCandidates: true, signal: controller.signal, now: new Date("2026-06-17T08:00:00.000Z") },
      { db, gmailClient, config: writableConfig() },
    );

    // Emails 1 and 2 parsed stories and buffered them, but the deadline fired —
    // so the atomic write is skipped and ZERO candidate rows are persisted.
    expect(signalPostsInserts.count).toBe(0);
    expect(tables.signal_posts).toHaveLength(0);
    expect(result.summary.promotedCandidateCount).toBe(0);
    // The extracted stories were genuinely buffered (proving they were discarded,
    // not simply never produced).
    expect(result.summary.extractedStoryCount).toBeGreaterThan(0);
  });
});
