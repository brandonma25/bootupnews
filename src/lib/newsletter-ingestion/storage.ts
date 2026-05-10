import { createHash } from "node:crypto";

import { parseRawNewsletterEmail } from "@/lib/newsletter-ingestion/email-content";
import type { GmailApiClient, GmailMessageRef } from "@/lib/newsletter-ingestion/gmail";
import { parseNewsletterStories, type ParsedNewsletterStory } from "@/lib/newsletter-ingestion/parser";
import type { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type NewsletterDbClient = NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>;

export type NewsletterEmailRow = {
  id: string;
  gmail_thread_id: string;
  gmail_message_id: string;
  sender: string;
  subject: string | null;
  received_at: string;
  raw_content: string | null;
  extraction_status: "pending" | "extracted" | "failed";
};

export type NewsletterStoryExtractionRow = {
  id: string;
  newsletter_email_id: string;
  headline: string;
  snippet: string | null;
  source_url: string | null;
  source_domain: string | null;
  category: "Finance" | "Tech" | "Politics" | null;
  extraction_confidence: number | null;
  signal_post_id: string | null;
};

export type InsertNewsletterEmailResult =
  | {
      status: "inserted";
      email: NewsletterEmailRow;
    }
  | {
      status: "skipped_existing";
      email: Pick<NewsletterEmailRow, "id" | "gmail_message_id" | "extraction_status">;
    };

export type ExtractNewsletterStoriesResult =
  | {
      ok: true;
      status: "extracted" | "already_extracted";
      newsletterEmailId: string;
      stories: NewsletterStoryExtractionRow[];
    }
  | {
      ok: false;
      status: "failed";
      newsletterEmailId: string;
      message: string;
    };

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function createContentSha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function clampExtractionError(value: string) {
  return value.slice(0, 500);
}

async function getExistingNewsletterEmailByGmailId(
  db: NewsletterDbClient,
  gmailMessageId: string,
) {
  const result = await db
    .from("newsletter_emails")
    .select("id, gmail_message_id, extraction_status")
    .eq("gmail_message_id", gmailMessageId)
    .maybeSingle();

  if (result.error) {
    throw new Error(`newsletter_emails idempotency check failed: ${result.error.message}`);
  }

  return result.data as Pick<NewsletterEmailRow, "id" | "gmail_message_id" | "extraction_status"> | null;
}

export async function insertNewsletterEmail(input: {
  db: NewsletterDbClient;
  gmailClient: GmailApiClient;
  messageRef: GmailMessageRef;
  label: string;
}): Promise<InsertNewsletterEmailResult> {
  const existing = await getExistingNewsletterEmailByGmailId(input.db, input.messageRef.id);

  if (existing) {
    return {
      status: "skipped_existing",
      email: existing,
    };
  }

  const rawMessage = await input.gmailClient.getRawMessage(input.messageRef.id);
  const parsed = parseRawNewsletterEmail(rawMessage.raw, {
    internalDate: rawMessage.internalDate,
  });
  const receivedAt = parsed.receivedAt ?? new Date().toISOString();
  const contentSha256 = createContentSha256(parsed.contentText);
  const insertResult = await input.db
    .from("newsletter_emails")
    .insert({
      gmail_thread_id: rawMessage.threadId,
      gmail_message_id: rawMessage.id,
      sender: normalizeText(parsed.sender) || "Unknown sender",
      subject: normalizeText(parsed.subject) || null,
      received_at: receivedAt,
      processed_at: null,
      label: input.label,
      raw_content: parsed.contentText,
      content_sha256: contentSha256,
      extraction_status: "pending",
      extraction_error: null,
    })
    .select("id, gmail_thread_id, gmail_message_id, sender, subject, received_at, raw_content, extraction_status")
    .single();

  if (insertResult.error) {
    throw new Error(`newsletter_emails insert failed: ${insertResult.error.message}`);
  }

  return {
    status: "inserted",
    email: insertResult.data as NewsletterEmailRow,
  };
}

async function updateNewsletterEmailStatus(
  db: NewsletterDbClient,
  newsletterEmailId: string,
  input: {
    status: "extracted" | "failed";
    extractionError?: string | null;
  },
) {
  const result = await db
    .from("newsletter_emails")
    .update({
      extraction_status: input.status,
      extraction_error: input.extractionError ? clampExtractionError(input.extractionError) : null,
      processed_at: new Date().toISOString(),
    })
    .eq("id", newsletterEmailId);

  if (result.error) {
    throw new Error(`newsletter_emails status update failed: ${result.error.message}`);
  }
}

async function getExistingExtractions(
  db: NewsletterDbClient,
  newsletterEmailId: string,
) {
  const result = await db
    .from("newsletter_story_extractions")
    .select("id, newsletter_email_id, headline, snippet, source_url, source_domain, category, extraction_confidence, signal_post_id")
    .eq("newsletter_email_id", newsletterEmailId);

  if (result.error) {
    throw new Error(`newsletter_story_extractions idempotency check failed: ${result.error.message}`);
  }

  return (result.data ?? []) as NewsletterStoryExtractionRow[];
}

function storyToInsert(newsletterEmailId: string, story: ParsedNewsletterStory) {
  return {
    newsletter_email_id: newsletterEmailId,
    headline: story.headline,
    snippet: story.snippet,
    source_url: story.sourceUrl,
    source_domain: story.sourceDomain,
    category: story.category,
    extraction_confidence: story.extractionConfidence,
    pipeline_candidate_id: null,
    signal_post_id: null,
  };
}

export async function extractStoriesFromEmail(input: {
  db: NewsletterDbClient;
  newsletterEmailId: string;
}): Promise<ExtractNewsletterStoriesResult> {
  try {
    const existing = await getExistingExtractions(input.db, input.newsletterEmailId);

    if (existing.length > 0) {
      await updateNewsletterEmailStatus(input.db, input.newsletterEmailId, {
        status: "extracted",
      });

      return {
        ok: true,
        status: "already_extracted",
        newsletterEmailId: input.newsletterEmailId,
        stories: existing,
      };
    }

    const emailResult = await input.db
      .from("newsletter_emails")
      .select("id, sender, subject, raw_content")
      .eq("id", input.newsletterEmailId)
      .single();

    if (emailResult.error) {
      throw new Error(`newsletter_emails read failed: ${emailResult.error.message}`);
    }

    const email = emailResult.data as Pick<NewsletterEmailRow, "id" | "sender" | "subject" | "raw_content">;
    const rawContent = normalizeText(email.raw_content);

    if (!rawContent) {
      throw new Error("newsletter_emails.raw_content was empty.");
    }

    const stories = parseNewsletterStories({
      sender: email.sender,
      subject: email.subject ?? "",
      rawContent,
    });

    if (stories.length === 0) {
      await updateNewsletterEmailStatus(input.db, input.newsletterEmailId, {
        status: "extracted",
      });

      return {
        ok: true,
        status: "extracted",
        newsletterEmailId: input.newsletterEmailId,
        stories: [],
      };
    }

    const insertResult = await input.db
      .from("newsletter_story_extractions")
      .insert(stories.map((story) => storyToInsert(input.newsletterEmailId, story)))
      .select("id, newsletter_email_id, headline, snippet, source_url, source_domain, category, extraction_confidence, signal_post_id");

    if (insertResult.error) {
      throw new Error(`newsletter_story_extractions insert failed: ${insertResult.error.message}`);
    }

    await updateNewsletterEmailStatus(input.db, input.newsletterEmailId, {
      status: "extracted",
    });

    return {
      ok: true,
      status: "extracted",
      newsletterEmailId: input.newsletterEmailId,
      stories: (insertResult.data ?? []) as NewsletterStoryExtractionRow[],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    try {
      await updateNewsletterEmailStatus(input.db, input.newsletterEmailId, {
        status: "failed",
        extractionError: message,
      });
    } catch {
      // Preserve the parser/storage failure as the primary result. The caller logs
      // only this sanitized message and never the newsletter body.
    }

    return {
      ok: false,
      status: "failed",
      newsletterEmailId: input.newsletterEmailId,
      message,
    };
  }
}
