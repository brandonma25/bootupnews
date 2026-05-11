import { describe, expect, it } from "vitest";

import type { GmailApiClient } from "@/lib/newsletter-ingestion/gmail";
import {
  previewNewsletterStoryPromotions,
  promoteNewsletterStoryToCandidate,
} from "@/lib/newsletter-ingestion/promotion";
import {
  createContentSha256,
  extractStoriesFromEmail,
  insertNewsletterEmail,
  type NewsletterDbClient,
} from "@/lib/newsletter-ingestion/storage";

type Row = Record<string, unknown>;
type TableName = "newsletter_emails" | "newsletter_story_extractions" | "signal_posts";

function encodeRawEmail(raw: string) {
  return Buffer.from(raw, "utf8").toString("base64url");
}

function createDb(initial: Partial<Record<TableName, Row[]>> = {}) {
  const tables: Record<TableName, Row[]> = {
    newsletter_emails: [...(initial.newsletter_emails ?? [])],
    newsletter_story_extractions: [...(initial.newsletter_story_extractions ?? [])],
    signal_posts: [...(initial.signal_posts ?? [])],
  };
  let idCounter = 1;

  function createBuilder(tableName: TableName) {
    const filters: Array<{ column: string; value: unknown }> = [];
    const inFilters: Array<{ column: string; values: unknown[] }> = [];
    let operation: "select" | "insert" | "update" = "select";
    let inserted: Row[] = [];
    let updated: Row = {};
    let limitCount: number | null = null;

    function applyFilters(rows: Row[]) {
      return rows.filter((row) =>
        filters.every((filter) => row[filter.column] === filter.value) &&
        inFilters.every((filter) => filter.values.includes(row[filter.column])),
      );
    }

    function execute() {
      if (operation === "insert") {
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
        return builder;
      },
      update(value: Row) {
        operation = "update";
        updated = value;
        return builder;
      },
      async single() {
        const result = execute();
        return { data: result.data[0] ?? null, error: result.error };
      },
      async maybeSingle() {
        const result = execute();
        return { data: result.data[0] ?? null, error: result.error };
      },
      then(resolve: (value: { data: Row[]; error: null }) => void) {
        resolve(execute());
      },
    };

    return builder;
  }

  return {
    tables,
    db: {
      from(tableName: TableName) {
        return createBuilder(tableName);
      },
    } as unknown as NewsletterDbClient,
  };
}

function createGmailClient(raw: string): GmailApiClient {
  return {
    async getLabelByName() {
      return {
        id: "Label_1",
        name: "boot-up-benchmark",
        messagesTotal: 1,
        messagesUnread: 0,
      };
    },
    async listNewsletterMessages() {
      return [{ id: "gmail-1", threadId: "thread-1" }];
    },
    async getRawMessage() {
      return {
        id: "gmail-1",
        threadId: "thread-1",
        raw: encodeRawEmail(raw),
        internalDate: "1778400000000",
      };
    },
  };
}

describe("newsletter email storage and story extraction", () => {
  it("computes stable content hashes", () => {
    expect(createContentSha256("same content")).toBe(createContentSha256("same content"));
    expect(createContentSha256("same content")).not.toBe(createContentSha256("other content"));
  });

  it("inserts newsletter_emails idempotently and allows repeated thread ids", async () => {
    const raw = [
      "From: TLDR <newsletter@tldr.tech>",
      "Subject: TLDR Daily",
      "Content-Type: text/plain",
      "",
      "Microsoft expands data center capacity",
      "Microsoft is adding AI infrastructure capacity as cloud demand shifts procurement timelines. https://example.com/cloud",
    ].join("\r\n");
    const { db, tables } = createDb({
      newsletter_emails: [{
        id: "existing-email",
        gmail_thread_id: "thread-1",
        gmail_message_id: "gmail-existing",
        sender: "TLDR",
        subject: "Earlier",
        received_at: "2026-05-10T00:00:00.000Z",
        raw_content: "Earlier body",
        extraction_status: "pending",
      }],
    });
    const gmailClient = createGmailClient(raw);

    const inserted = await insertNewsletterEmail({
      db,
      gmailClient,
      messageRef: { id: "gmail-1", threadId: "thread-1" },
      label: "boot-up-benchmark",
    });
    const skipped = await insertNewsletterEmail({
      db,
      gmailClient,
      messageRef: { id: "gmail-1", threadId: "thread-1" },
      label: "boot-up-benchmark",
    });

    expect(inserted.status).toBe("inserted");
    expect(skipped.status).toBe("skipped_existing");
    expect(tables.newsletter_emails.filter((row) => row.gmail_thread_id === "thread-1")).toHaveLength(2);
    expect(tables.newsletter_emails.at(-1)).toMatchObject({
      gmail_message_id: "gmail-1",
      label: "boot-up-benchmark",
      extraction_status: "pending",
    });
    expect(tables.newsletter_emails.at(-1)?.content_sha256).toEqual(expect.any(String));
  });

  it("extracts stories and transitions newsletter_emails to extracted", async () => {
    const { db, tables } = createDb({
      newsletter_emails: [{
        id: "email-1",
        gmail_thread_id: "thread-1",
        gmail_message_id: "gmail-1",
        sender: "TLDR <newsletter@tldr.tech>",
        subject: "TLDR",
        received_at: "2026-05-10T00:00:00.000Z",
        raw_content: [
          "Microsoft expands data center capacity",
          "Microsoft is adding AI infrastructure capacity as cloud demand shifts procurement timelines. https://example.com/cloud",
        ].join("\n"),
        extraction_status: "pending",
      }],
    });

    const result = await extractStoriesFromEmail({ db, newsletterEmailId: "email-1" });

    expect(result.ok).toBe(true);
    expect(result.ok && result.stories).toHaveLength(1);
    expect(tables.newsletter_emails[0]).toMatchObject({
      extraction_status: "extracted",
      extraction_error: null,
    });
    expect(tables.newsletter_story_extractions[0]).toMatchObject({
      headline: "Microsoft expands data center capacity",
      category: "Tech",
      source_url: "https://example.com/cloud",
    });
  });

  it("marks malformed empty email extraction as failed without exposing content", async () => {
    const { db, tables } = createDb({
      newsletter_emails: [{
        id: "email-1",
        gmail_thread_id: "thread-1",
        gmail_message_id: "gmail-1",
        sender: "Unknown",
        subject: "Empty",
        received_at: "2026-05-10T00:00:00.000Z",
        raw_content: "",
        extraction_status: "pending",
      }],
    });

    const result = await extractStoriesFromEmail({ db, newsletterEmailId: "email-1" });

    expect(result.ok).toBe(false);
    expect(tables.newsletter_emails[0]).toMatchObject({
      extraction_status: "failed",
    });
    expect(String(tables.newsletter_emails[0]?.extraction_error)).not.toContain("From:");
  });
});

describe("newsletter candidate promotion", () => {
  it("creates a needs_review non-live signal_posts candidate and links the extraction", async () => {
    const { db, tables } = createDb({
      newsletter_story_extractions: [{
        id: "story-1",
        newsletter_email_id: "email-1",
        headline: "Microsoft expands data center capacity",
        snippet: "Microsoft is adding AI infrastructure capacity as cloud demand shifts procurement timelines.",
        source_url: "https://example.com/cloud",
        source_domain: "example.com",
        category: "Tech",
        extraction_confidence: 0.9,
        signal_post_id: null,
      }],
    });

    const result = await promoteNewsletterStoryToCandidate({
      db,
      extractionId: "story-1",
      briefingDate: "2026-05-10",
      now: new Date("2026-05-10T08:00:00.000Z"),
    });

    expect(result).toMatchObject({
      status: "created",
      signalPostId: expect.any(String),
      rank: 20,
    });
    expect(tables.signal_posts[0]).toMatchObject({
      editorial_status: "needs_review",
      is_live: false,
      published_at: null,
      final_slate_rank: null,
      final_slate_tier: null,
      ai_why_it_matters: "",
      published_why_it_matters: null,
      context_material: "Microsoft is adding AI infrastructure capacity as cloud demand shifts procurement timelines.",
      witm_draft_generated_by: null,
      witm_draft_model: null,
    });
    expect(tables.newsletter_story_extractions[0]?.signal_post_id).toBe(tables.signal_posts[0]?.id);
  });

  it("does not promote invalid source URLs", async () => {
    const { db, tables } = createDb({
      newsletter_story_extractions: [{
        id: "story-1",
        newsletter_email_id: "email-1",
        headline: "Thin item without a URL",
        snippet: "A thin item should remain internal extraction material only.",
        source_url: null,
        source_domain: null,
        category: "Finance",
        extraction_confidence: 0.5,
        signal_post_id: null,
      }],
    });

    const result = await promoteNewsletterStoryToCandidate({
      db,
      extractionId: "story-1",
      briefingDate: "2026-05-10",
    });

    expect(result).toMatchObject({
      status: "skipped",
      reason: "invalid_source_url",
    });
    expect(tables.signal_posts).toHaveLength(0);
  });

  it("links duplicate source_url candidates instead of inserting another row", async () => {
    const { db, tables } = createDb({
      newsletter_story_extractions: [{
        id: "story-1",
        newsletter_email_id: "email-1",
        headline: "Microsoft expands data center capacity",
        snippet: "Microsoft is adding AI infrastructure capacity.",
        source_url: "https://example.com/cloud",
        source_domain: "example.com",
        category: "Tech",
        extraction_confidence: 0.9,
        signal_post_id: null,
      }],
      signal_posts: [{
        id: "signal-existing",
        briefing_date: "2026-05-10",
        rank: 3,
        title: "Existing cloud candidate",
        source_url: "https://example.com/cloud",
        editorial_status: "needs_review",
        is_live: false,
        published_at: null,
      }],
    });

    const result = await promoteNewsletterStoryToCandidate({
      db,
      extractionId: "story-1",
      briefingDate: "2026-05-10",
    });

    expect(result).toEqual({
      status: "linked_existing",
      extractionId: "story-1",
      signalPostId: "signal-existing",
    });
    expect(tables.signal_posts).toHaveLength(1);
    expect(tables.newsletter_story_extractions[0]?.signal_post_id).toBe("signal-existing");
  });

  it("previews eligible candidate creation without writing signal_posts rows", async () => {
    const { db, tables } = createDb();

    const result = await previewNewsletterStoryPromotions({
      db,
      briefingDate: "2026-05-10",
      stories: [{
        headline: "Microsoft expands data center capacity",
        sourceUrl: "https://example.com/cloud",
        sourceDomain: "example.com",
        category: "Tech",
      }],
    });

    expect(result).toEqual([{
      status: "eligible",
      previewAction: "create_candidate",
      title: "Microsoft expands data center capacity",
      sourceUrl: "https://example.com/cloud",
      sourceDomain: "example.com",
      category: "Tech",
      rank: 20,
      existingSignalPostId: null,
      matchedBy: null,
      reason: "Newsletter story would create a non-live needs_review candidate.",
    }]);
    expect(tables.signal_posts).toHaveLength(0);
  });

  it("previews duplicate public rows as skipped without writing", async () => {
    const { db, tables } = createDb({
      signal_posts: [{
        id: "signal-live",
        briefing_date: "2026-05-10",
        rank: 4,
        title: "Microsoft expands data center capacity",
        source_url: "https://example.com/cloud",
        editorial_status: "published",
        is_live: true,
        published_at: "2026-05-10T10:00:00.000Z",
      }],
    });

    const result = await previewNewsletterStoryPromotions({
      db,
      briefingDate: "2026-05-10",
      stories: [{
        headline: "Microsoft expands data center capacity",
        sourceUrl: "https://example.com/cloud",
        sourceDomain: "example.com",
        category: "Tech",
      }],
    });

    expect(result[0]).toMatchObject({
      status: "duplicate_public_row",
      previewAction: "skip",
      existingSignalPostId: "signal-live",
      matchedBy: "source_url",
      rank: null,
    });
    expect(tables.signal_posts).toHaveLength(1);
  });

  it("previews non-live duplicates as linkable review candidates", async () => {
    const { db, tables } = createDb({
      signal_posts: [{
        id: "signal-existing",
        briefing_date: "2026-05-10",
        rank: 2,
        title: "Existing cloud candidate",
        source_url: "https://example.com/cloud",
        editorial_status: "needs_review",
        is_live: false,
        published_at: null,
      }],
    });

    const result = await previewNewsletterStoryPromotions({
      db,
      briefingDate: "2026-05-10",
      stories: [{
        headline: "Microsoft expands data center capacity",
        sourceUrl: "https://example.com/cloud",
        sourceDomain: "example.com",
        category: "Tech",
      }],
    });

    expect(result[0]).toMatchObject({
      status: "eligible",
      previewAction: "link_existing_candidate",
      existingSignalPostId: "signal-existing",
      matchedBy: "source_url",
      rank: 2,
    });
    expect(tables.signal_posts).toHaveLength(1);
  });

  it("previews exhausted candidate ranks without writing", async () => {
    const { db, tables } = createDb({
      signal_posts: Array.from({ length: 20 }, (_value, index) => ({
        id: `signal-${index + 1}`,
        briefing_date: "2026-05-10",
        rank: index + 1,
        title: `Existing candidate ${index + 1}`,
        source_url: `https://example.com/story-${index + 1}`,
        editorial_status: "needs_review",
        is_live: false,
        published_at: null,
      })),
    });

    const result = await previewNewsletterStoryPromotions({
      db,
      briefingDate: "2026-05-10",
      stories: [{
        headline: "New candidate without rank",
        sourceUrl: "https://example.com/new-story",
        sourceDomain: "example.com",
        category: "Finance",
      }],
    });

    expect(result[0]).toMatchObject({
      status: "no_available_candidate_rank",
      previewAction: "skip",
      rank: null,
      existingSignalPostId: null,
      matchedBy: null,
    });
    expect(tables.signal_posts).toHaveLength(20);
  });

  it("previews title overlaps when source URLs differ", async () => {
    const { db } = createDb({
      signal_posts: [{
        id: "signal-title-match",
        briefing_date: "2026-05-10",
        rank: 7,
        title: "Microsoft expands data center capacity",
        source_url: "https://example.com/original-cloud",
        editorial_status: "published",
        is_live: true,
        published_at: "2026-05-10T10:00:00.000Z",
      }],
    });

    const result = await previewNewsletterStoryPromotions({
      db,
      briefingDate: "2026-05-10",
      stories: [{
        headline: "Microsoft expands data center capacity",
        sourceUrl: "https://example.com/alternate-cloud",
        sourceDomain: "example.com",
        category: "Tech",
      }],
    });

    expect(result[0]).toMatchObject({
      status: "duplicate_public_row",
      previewAction: "skip",
      existingSignalPostId: "signal-title-match",
      matchedBy: "title",
    });
  });
});
