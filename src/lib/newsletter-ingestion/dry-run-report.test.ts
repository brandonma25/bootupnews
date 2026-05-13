import { describe, expect, it, vi } from "vitest";

import { resolveNewsletterIngestionConfig } from "@/lib/newsletter-ingestion/config";
import { buildNewsletterDryRunReport } from "@/lib/newsletter-ingestion/dry-run-report";
import type { GmailApiClient } from "@/lib/newsletter-ingestion/gmail";
import type { NewsletterDbClient } from "@/lib/newsletter-ingestion/storage";

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

  function createBuilder(tableName: TableName) {
    const filters: Array<{ column: string; value: unknown }> = [];
    const inFilters: Array<{ column: string; values: unknown[] }> = [];
    let limitCount: number | null = null;

    function applyFilters(rows: Row[]) {
      return rows.filter((row) =>
        filters.every((filter) => row[filter.column] === filter.value) &&
        inFilters.every((filter) => filter.values.includes(row[filter.column])),
      );
    }

    function execute() {
      const selected = applyFilters(tables[tableName]);
      return { data: limitCount === null ? selected : selected.slice(0, limitCount), error: null };
    }

    const builder = {
      select() {
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

function createConfig() {
  return resolveNewsletterIngestionConfig({
    NEWSLETTER_INGESTION_ENABLED: "true",
    NEWSLETTER_INGESTION_DRY_RUN: "true",
    NEWSLETTER_INGESTION_SINCE_HOURS: "48",
    GMAIL_CLIENT_ID: "client-id",
    GMAIL_CLIENT_SECRET: "client-secret",
    GMAIL_REFRESH_TOKEN: "refresh-token",
  });
}

function createRawNewsletter() {
  return [
    "From: TLDR <newsletter@tldr.tech>",
    "Subject: TLDR Daily",
    "Date: Sun, 10 May 2026 07:00:00 +0000",
    "Content-Type: text/plain",
    "",
    "Microsoft expands data center capacity",
    "PRIVATE_BODY_SNIPPET Microsoft is adding AI infrastructure capacity as cloud demand shifts procurement timelines. https://example.com/cloud",
    "",
    "Senate tariff vote pressures chip imports",
    "PRIVATE_BODY_SNIPPET Lawmakers are weighing tariff changes that could affect chip supply chains and public company guidance. https://example.com/tariffs",
  ].join("\r\n");
}

function createGmailClient(input: {
  labelVisible?: boolean;
  raw?: string;
} = {}) {
  return {
    getLabelByName: vi.fn(async () =>
      input.labelVisible === false
        ? null
        : {
            id: "Label_1",
            name: "bootup-news-benchmark",
            messagesTotal: 1,
            messagesUnread: 0,
          }),
    listNewsletterMessages: vi.fn(async () => [{ id: "gmail-private-message-id", threadId: "thread-private-id" }]),
    getRawMessage: vi.fn(async () => ({
      id: "gmail-private-message-id",
      threadId: "thread-private-id",
      raw: encodeRawEmail(input.raw ?? createRawNewsletter()),
      internalDate: "1778400000000",
    })),
  } satisfies GmailApiClient;
}

describe("newsletter dry-run report", () => {
  it("reports inventory, extraction, and promotion candidates without leaking private material", async () => {
    const { db, tables } = createDb();
    const gmailClient = createGmailClient();

    const report = await buildNewsletterDryRunReport({
      now: new Date("2026-05-10T10:00:00.000Z"),
      briefingDate: "2026-05-10",
      sinceDate: new Date("2026-05-08T10:00:00.000Z"),
    }, {
      config: createConfig(),
      db,
      gmailClient,
    });

    expect(report.success).toBe(true);
    expect(report.gmail).toMatchObject({
      oauth: "ok",
      labelVisible: true,
      labelMessageTotal: 1,
    });
    expect(report.emailInventory.total).toBe(1);
    expect(report.storyExtraction).toMatchObject({
      total: 2,
      failedEmailCount: 0,
    });
    expect(report.sourceUrlQuality).toEqual({
      withPrimarySourceUrl: 2,
      newsletterOnly: 0,
    });
    expect(report.categoryDistribution.Tech).toBeGreaterThanOrEqual(1);
    expect(report.promotionPreview.candidates).toHaveLength(2);
    expect(report.promotionPreview.candidates[0]).toMatchObject({
      title: "Microsoft expands data center capacity",
      sourceUrl: "https://example.com/cloud",
      previewAction: "create_candidate",
      rank: 20,
    });
    expect(report.privacy).toEqual({
      rawContentIncluded: false,
      snippetsIncluded: false,
      messageIdsIncluded: false,
    });
    expect(report.dedup).toMatchObject({
      duplicatePublicRowCount: 0,
      linkedExistingCandidateCount: 0,
      sourceUrlOverlapCount: 0,
      titleOverlapCount: 0,
      overlaps: [],
    });
    expect(tables.newsletter_emails).toHaveLength(0);
    expect(tables.newsletter_story_extractions).toHaveLength(0);
    expect(tables.signal_posts).toHaveLength(0);

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("PRIVATE_BODY_SNIPPET");
    expect(serialized).not.toContain("gmail-private-message-id");
    expect(serialized).not.toContain("thread-private-id");
    expect(serialized).not.toContain("client-secret");
    expect(serialized).not.toContain("refresh-token");
  });

  it("stops before message search when the Gmail label preflight fails", async () => {
    const { db, tables } = createDb();
    const gmailClient = createGmailClient({ labelVisible: false });

    const report = await buildNewsletterDryRunReport({
      now: new Date("2026-05-10T10:00:00.000Z"),
      briefingDate: "2026-05-10",
      sinceDate: new Date("2026-05-08T10:00:00.000Z"),
    }, {
      config: createConfig(),
      db,
      gmailClient,
    });

    expect(report.success).toBe(false);
    expect(report.message).toMatch(/label missing\/account mismatch/i);
    expect(report.emailInventory.total).toBe(0);
    expect(gmailClient.listNewsletterMessages).not.toHaveBeenCalled();
    expect(gmailClient.getRawMessage).not.toHaveBeenCalled();
    expect(tables.newsletter_emails).toHaveLength(0);
    expect(tables.newsletter_story_extractions).toHaveLength(0);
    expect(tables.signal_posts).toHaveLength(0);
  });
});
