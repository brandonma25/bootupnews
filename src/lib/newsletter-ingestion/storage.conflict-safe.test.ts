import { describe, expect, it, vi } from "vitest";

// parseRawNewsletterEmail is exercised elsewhere; stub it so this test focuses
// on the insert conflict path.
vi.mock("@/lib/newsletter-ingestion/email-content", () => ({
  parseRawNewsletterEmail: () => ({
    sender: "Example Newsletter",
    subject: "Subject",
    receivedAt: "2026-06-07T00:00:00.000Z",
    contentText: "body text",
  }),
}));

import { insertNewsletterEmail } from "@/lib/newsletter-ingestion/storage";

type InsertArg = Parameters<typeof insertNewsletterEmail>[0];

function buildGmailClient(): InsertArg["gmailClient"] {
  return {
    getRawMessage: vi.fn(async (id: string) => ({
      id,
      threadId: "thread-1",
      raw: "raw-bytes",
      internalDate: "1717718400000",
    })),
  } as unknown as InsertArg["gmailClient"];
}

/**
 * Supabase double. `maybeSingleQueue` is dequeued per
 * getExistingNewsletterEmailByGmailId call (check, then post-conflict re-read);
 * `insertResult` is what the INSERT returns.
 */
function buildDb(opts: { maybeSingleQueue: unknown[]; insertResult: unknown }): {
  db: InsertArg["db"];
  insertCalls: () => number;
} {
  const queue = [...opts.maybeSingleQueue];
  let insertCalls = 0;
  const db = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: queue.length ? queue.shift() : null, error: null }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => {
            insertCalls += 1;
            return opts.insertResult;
          },
        }),
      }),
    }),
  } as unknown as InsertArg["db"];
  return { db, insertCalls: () => insertCalls };
}

const messageRef = { id: "gmail-msg-1" } as unknown as InsertArg["messageRef"];

describe("insertNewsletterEmail — conflict-safe (lock-free newsletter endpoint)", () => {
  it("inserts a brand-new email", async () => {
    const { db } = buildDb({
      maybeSingleQueue: [null], // not existing
      insertResult: {
        data: {
          id: "row-new",
          gmail_thread_id: "thread-1",
          gmail_message_id: "gmail-msg-1",
          sender: "Example Newsletter",
          subject: "Subject",
          received_at: "2026-06-07T00:00:00.000Z",
          raw_content: "body text",
          extraction_status: "pending",
        },
        error: null,
      },
    });

    const result = await insertNewsletterEmail({ db, gmailClient: buildGmailClient(), messageRef, label: "Newsletters" });
    expect(result.status).toBe("inserted");
    expect(result.email.id).toBe("row-new");
  });

  it("a concurrent double-fire that loses the gmail_message_id race (23505) → skipped_existing, NO throw, NO duplicate", async () => {
    const racedRow = { id: "row-raced", gmail_message_id: "gmail-msg-1", extraction_status: "pending" };
    const { db } = buildDb({
      maybeSingleQueue: [null, racedRow], // check: absent; post-23505 re-read: the racing run's row
      insertResult: {
        data: null,
        error: { code: "23505", message: 'duplicate key value violates unique constraint "newsletter_emails_gmail_message_id_key"' },
      },
    });

    // Must NOT throw despite the insert hitting the unique constraint.
    const result = await insertNewsletterEmail({ db, gmailClient: buildGmailClient(), messageRef, label: "Newsletters" });
    expect(result.status).toBe("skipped_existing");
    expect(result.email.id).toBe("row-raced");
  });

  it("a non-conflict insert error still throws (real failures are not swallowed)", async () => {
    const { db } = buildDb({
      maybeSingleQueue: [null],
      insertResult: { data: null, error: { code: "42P01", message: 'relation "newsletter_emails" does not exist' } },
    });

    await expect(
      insertNewsletterEmail({ db, gmailClient: buildGmailClient(), messageRef, label: "Newsletters" }),
    ).rejects.toThrow(/newsletter_emails insert failed/);
  });
});
