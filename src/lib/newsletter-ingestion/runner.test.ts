import { describe, expect, it, vi } from "vitest";

import type { GmailApiClient } from "@/lib/newsletter-ingestion/gmail";
import { resolveNewsletterIngestionConfig } from "@/lib/newsletter-ingestion/config";
import { runNewsletterIngestion } from "@/lib/newsletter-ingestion/runner";
import type { NewsletterDbClient } from "@/lib/newsletter-ingestion/storage";

type Row = Record<string, unknown>;
type TableName = "newsletter_emails" | "newsletter_story_extractions" | "signal_posts";

function encodeRawEmail(raw: string) {
  return Buffer.from(raw, "utf8").toString("base64url");
}

function createDb() {
  const tables: Record<TableName, Row[]> = {
    newsletter_emails: [],
    newsletter_story_extractions: [],
    signal_posts: [],
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

function createGmailClient(): GmailApiClient {
  const raw = [
    "From: TLDR <newsletter@tldr.tech>",
    "Subject: TLDR",
    "Date: Sun, 10 May 2026 07:00:00 +0000",
    "Content-Type: text/plain",
    "",
    "Microsoft expands data center capacity",
    "Microsoft is adding AI infrastructure capacity as cloud demand shifts procurement timelines. https://example.com/cloud",
  ].join("\r\n");

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

describe("controlled newsletter ingestion runner", () => {
  it("disabled env performs no Gmail or database writes", async () => {
    const gmailClient = {
      listNewsletterMessages: vi.fn(),
      getRawMessage: vi.fn(),
    } as unknown as GmailApiClient;
    const config = resolveNewsletterIngestionConfig({
      NEWSLETTER_INGESTION_ENABLED: "false",
      GMAIL_CLIENT_ID: "client",
      GMAIL_CLIENT_SECRET: "secret",
      GMAIL_REFRESH_TOKEN: "refresh",
    });

    const result = await runNewsletterIngestion({ now: new Date("2026-05-10T00:00:00.000Z") }, {
      config,
      gmailClient,
    });

    expect(result.success).toBe(true);
    expect(result.summary.enabled).toBe(false);
    expect(gmailClient.listNewsletterMessages).not.toHaveBeenCalled();
  });

  it("dry-run fetches and parses but does not write", async () => {
    const { db, tables } = createDb();
    const config = resolveNewsletterIngestionConfig({
      NEWSLETTER_INGESTION_ENABLED: "true",
      NEWSLETTER_INGESTION_DRY_RUN: "true",
      GMAIL_CLIENT_ID: "client",
      GMAIL_CLIENT_SECRET: "secret",
      GMAIL_REFRESH_TOKEN: "refresh",
    });

    const result = await runNewsletterIngestion({
      now: new Date("2026-05-10T00:00:00.000Z"),
    }, {
      config,
      db,
      gmailClient: createGmailClient(),
    });

    expect(result.success).toBe(true);
    expect(result.summary.fetchedMessageCount).toBe(1);
    expect(result.summary.extractedStoryCount).toBe(1);
    expect(tables.newsletter_emails).toHaveLength(0);
    expect(tables.newsletter_story_extractions).toHaveLength(0);
    expect(tables.signal_posts).toHaveLength(0);
  });

  it("fails closed before message search when the configured label is not visible", async () => {
    const { db, tables } = createDb();
    const gmailClient = {
      getLabelByName: vi.fn(async () => null),
      listNewsletterMessages: vi.fn(),
      getRawMessage: vi.fn(),
    } as unknown as GmailApiClient;
    const config = resolveNewsletterIngestionConfig({
      NEWSLETTER_INGESTION_ENABLED: "true",
      NEWSLETTER_INGESTION_DRY_RUN: "true",
      GMAIL_CLIENT_ID: "client",
      GMAIL_CLIENT_SECRET: "secret",
      GMAIL_REFRESH_TOKEN: "refresh",
    });

    const result = await runNewsletterIngestion({
      now: new Date("2026-05-10T00:00:00.000Z"),
    }, {
      config,
      db,
      gmailClient,
    });

    expect(result.success).toBe(false);
    expect(result.summary.message).toMatch(/label missing\/account mismatch/i);
    expect(gmailClient.listNewsletterMessages).not.toHaveBeenCalled();
    expect(gmailClient.getRawMessage).not.toHaveBeenCalled();
    expect(tables.newsletter_emails).toHaveLength(0);
    expect(tables.newsletter_story_extractions).toHaveLength(0);
    expect(tables.signal_posts).toHaveLength(0);
  });

  it("enabled non-production writes newsletter records and non-live candidates", async () => {
    const { db, tables } = createDb();
    const config = resolveNewsletterIngestionConfig({
      NEWSLETTER_INGESTION_ENABLED: "true",
      NEWSLETTER_INGESTION_DRY_RUN: "false",
      NEWSLETTER_INGESTION_TARGET_ENV: "preview",
      GMAIL_CLIENT_ID: "client",
      GMAIL_CLIENT_SECRET: "secret",
      GMAIL_REFRESH_TOKEN: "refresh",
    });

    const result = await runNewsletterIngestion({
      briefingDate: "2026-05-10",
      now: new Date("2026-05-10T00:00:00.000Z"),
    }, {
      config,
      db,
      gmailClient: createGmailClient(),
    });

    expect(result.success).toBe(true);
    expect(result.summary.storedEmailCount).toBe(1);
    expect(result.summary.extractedStoryCount).toBe(1);
    expect(result.summary.promotedCandidateCount).toBe(1);
    expect(tables.newsletter_emails).toHaveLength(1);
    expect(tables.newsletter_story_extractions).toHaveLength(1);
    expect(tables.signal_posts).toHaveLength(1);
    expect(tables.signal_posts[0]).toMatchObject({
      editorial_status: "needs_review",
      is_live: false,
      published_at: null,
      final_slate_rank: null,
      final_slate_tier: null,
    });
  });

  it("production guard blocks writes unless explicit production flag is present", async () => {
    const { db, tables } = createDb();
    const gmailClient = {
      listNewsletterMessages: vi.fn(),
      getRawMessage: vi.fn(),
    } as unknown as GmailApiClient;
    const config = resolveNewsletterIngestionConfig({
      NEWSLETTER_INGESTION_ENABLED: "true",
      NEWSLETTER_INGESTION_DRY_RUN: "false",
      NEWSLETTER_INGESTION_TARGET_ENV: "production",
      GMAIL_CLIENT_ID: "client",
      GMAIL_CLIENT_SECRET: "secret",
      GMAIL_REFRESH_TOKEN: "refresh",
    });

    const result = await runNewsletterIngestion({}, {
      config,
      db,
      gmailClient,
    });

    expect(result.success).toBe(true);
    expect(result.summary.message).toMatch(/production writes/i);
    expect(gmailClient.listNewsletterMessages).not.toHaveBeenCalled();
    expect(tables.newsletter_emails).toHaveLength(0);
    expect(tables.signal_posts).toHaveLength(0);
  });
});
