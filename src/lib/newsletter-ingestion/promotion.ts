import { isValidPublicSourceUrl } from "@/lib/final-slate-readiness";
import type { NewsletterDbClient, NewsletterStoryExtractionRow } from "@/lib/newsletter-ingestion/storage";

type ExistingSignalPostCandidate = {
  id: string;
  title: string | null;
  rank: number | null;
  editorial_status: string | null;
  is_live: boolean | null;
  published_at: string | null;
};

export type NewsletterPromotionResult =
  | {
      status: "created";
      extractionId: string;
      signalPostId: string;
      rank: number;
    }
  | {
      status: "linked_existing";
      extractionId: string;
      signalPostId: string;
    }
  | {
      status: "skipped";
      extractionId: string;
      reason:
        | "already_linked"
        | "invalid_source_url"
        | "duplicate_public_row"
        | "no_available_candidate_rank"
        | "storage_error";
      message: string;
    };

function normalizeDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new Error("briefingDate must use YYYY-MM-DD format.");
  }

  return value;
}

function normalizeTitle(value: string | null | undefined) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() ?? "";
}

function sourceNameFromExtraction(extraction: NewsletterStoryExtractionRow) {
  return extraction.source_domain?.trim() || "Newsletter";
}

function getContextMaterial(extraction: NewsletterStoryExtractionRow) {
  return extraction.snippet?.trim() || extraction.headline;
}

function isPublishedOrLive(row: ExistingSignalPostCandidate) {
  return Boolean(row.is_live || row.editorial_status === "published" || row.published_at);
}

async function linkExtractionToSignalPost(
  db: NewsletterDbClient,
  extractionId: string,
  signalPostId: string,
) {
  const result = await db
    .from("newsletter_story_extractions")
    .update({ signal_post_id: signalPostId })
    .eq("id", extractionId);

  if (result.error) {
    throw new Error(`newsletter_story_extractions link update failed: ${result.error.message}`);
  }
}

async function findExistingBySourceUrl(input: {
  db: NewsletterDbClient;
  briefingDate: string;
  sourceUrl: string;
}) {
  const result = await input.db
    .from("signal_posts")
    .select("id, title, rank, editorial_status, is_live, published_at")
    .eq("briefing_date", input.briefingDate)
    .eq("source_url", input.sourceUrl)
    .limit(1);

  if (result.error) {
    throw new Error(`signal_posts duplicate source_url check failed: ${result.error.message}`);
  }

  return ((result.data ?? []) as ExistingSignalPostCandidate[])[0] ?? null;
}

async function findExistingByTitle(input: {
  db: NewsletterDbClient;
  briefingDate: string;
  title: string;
}) {
  const normalizedTitle = normalizeTitle(input.title);
  const result = await input.db
    .from("signal_posts")
    .select("id, title, rank, editorial_status, is_live, published_at")
    .eq("briefing_date", input.briefingDate)
    .limit(100);

  if (result.error) {
    throw new Error(`signal_posts duplicate title check failed: ${result.error.message}`);
  }

  return ((result.data ?? []) as ExistingSignalPostCandidate[])
    .find((row) => normalizeTitle(row.title) === normalizedTitle) ?? null;
}

async function getNextCandidateRank(input: {
  db: NewsletterDbClient;
  briefingDate: string;
}) {
  const result = await input.db
    .from("signal_posts")
    .select("rank")
    .eq("briefing_date", input.briefingDate);

  if (result.error) {
    throw new Error(`signal_posts rank check failed: ${result.error.message}`);
  }

  const usedRanks = new Set(
    ((result.data ?? []) as Array<{ rank: number | null }>)
      .map((row) => row.rank)
      .filter((rank): rank is number => typeof rank === "number"),
  );

  for (let rank = 1; rank <= 20; rank += 1) {
    if (!usedRanks.has(rank)) {
      return rank;
    }
  }

  return null;
}

export async function promoteNewsletterStoryToCandidate(input: {
  db: NewsletterDbClient;
  extractionId: string;
  briefingDate: string;
  now?: Date;
}): Promise<NewsletterPromotionResult> {
  const briefingDate = normalizeDateValue(input.briefingDate);

  try {
    const extractionResult = await input.db
      .from("newsletter_story_extractions")
      .select("id, newsletter_email_id, headline, snippet, source_url, source_domain, category, extraction_confidence, signal_post_id")
      .eq("id", input.extractionId)
      .single();

    if (extractionResult.error) {
      throw new Error(`newsletter_story_extractions read failed: ${extractionResult.error.message}`);
    }

    const extraction = extractionResult.data as NewsletterStoryExtractionRow;

    if (extraction.signal_post_id) {
      return {
        status: "skipped",
        extractionId: extraction.id,
        reason: "already_linked",
        message: "Newsletter story extraction is already linked to a signal_posts candidate.",
      };
    }

    const sourceUrl = extraction.source_url?.trim() ?? "";

    if (!isValidPublicSourceUrl(sourceUrl)) {
      return {
        status: "skipped",
        extractionId: extraction.id,
        reason: "invalid_source_url",
        message: "Newsletter story extraction was not promoted because it lacks a valid public source URL.",
      };
    }

    const existingByUrl = await findExistingBySourceUrl({
      db: input.db,
      briefingDate,
      sourceUrl,
    });

    if (existingByUrl) {
      if (isPublishedOrLive(existingByUrl)) {
        return {
          status: "skipped",
          extractionId: extraction.id,
          reason: "duplicate_public_row",
          message: "Newsletter story extraction matches an already live or published signal_posts row.",
        };
      }

      await linkExtractionToSignalPost(input.db, extraction.id, existingByUrl.id);

      return {
        status: "linked_existing",
        extractionId: extraction.id,
        signalPostId: existingByUrl.id,
      };
    }

    const existingByTitle = await findExistingByTitle({
      db: input.db,
      briefingDate,
      title: extraction.headline,
    });

    if (existingByTitle) {
      if (isPublishedOrLive(existingByTitle)) {
        return {
          status: "skipped",
          extractionId: extraction.id,
          reason: "duplicate_public_row",
          message: "Newsletter story extraction title matches an already live or published signal_posts row.",
        };
      }

      await linkExtractionToSignalPost(input.db, extraction.id, existingByTitle.id);

      return {
        status: "linked_existing",
        extractionId: extraction.id,
        signalPostId: existingByTitle.id,
      };
    }

    const rank = await getNextCandidateRank({
      db: input.db,
      briefingDate,
    });

    if (!rank) {
      return {
        status: "skipped",
        extractionId: extraction.id,
        reason: "no_available_candidate_rank",
        message: "Newsletter story extraction was not promoted because all 20 candidate ranks are already occupied.",
      };
    }

    const now = (input.now ?? new Date()).toISOString();
    const insertResult = await input.db
      .from("signal_posts")
      .insert({
        briefing_date: briefingDate,
        rank,
        title: extraction.headline,
        source_name: sourceNameFromExtraction(extraction),
        source_url: sourceUrl,
        summary: extraction.snippet ?? "",
        tags: extraction.category ? [extraction.category] : [],
        signal_score: extraction.extraction_confidence
          ? Number((extraction.extraction_confidence * 100).toFixed(2))
          : null,
        selection_reason: "Newsletter discovery candidate; BM review required.",
        ai_why_it_matters: "",
        edited_why_it_matters: null,
        published_why_it_matters: null,
        why_it_matters_validation_status: "requires_human_rewrite",
        why_it_matters_validation_failures: ["incomplete_sentence"],
        why_it_matters_validation_details: ["BM must write structural why-it-matters manually before publication."],
        why_it_matters_validated_at: null,
        editorial_status: "needs_review",
        final_slate_rank: null,
        final_slate_tier: null,
        editorial_decision: "pending_review",
        decision_note: null,
        rejected_reason: null,
        held_reason: null,
        replacement_of_row_id: null,
        reviewed_by: null,
        reviewed_at: null,
        edited_by: null,
        edited_at: null,
        approved_by: null,
        approved_at: null,
        published_at: null,
        is_live: false,
        context_material: getContextMaterial(extraction),
        source_cluster_id: null,
        witm_draft_generated_by: null,
        witm_draft_generated_at: null,
        witm_draft_model: null,
        created_at: now,
        updated_at: now,
      })
      .select("id, rank")
      .single();

    if (insertResult.error) {
      throw new Error(`signal_posts newsletter candidate insert failed: ${insertResult.error.message}`);
    }

    const inserted = insertResult.data as { id: string; rank: number };
    await linkExtractionToSignalPost(input.db, extraction.id, inserted.id);

    return {
      status: "created",
      extractionId: extraction.id,
      signalPostId: inserted.id,
      rank: inserted.rank,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      status: "skipped",
      extractionId: input.extractionId,
      reason: "storage_error",
      message,
    };
  }
}
