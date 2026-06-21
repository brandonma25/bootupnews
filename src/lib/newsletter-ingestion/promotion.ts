import {
  isValidPublicSourceUrl,
  RSS_RESERVED_TOP_RANKS,
  SIGNAL_POST_CANDIDATE_DEPTH_LIMIT,
} from "@/lib/final-slate-readiness";
import type { NewsletterDbClient, NewsletterStoryExtractionRow } from "@/lib/newsletter-ingestion/storage";
import { errorContext, logServerEvent } from "@/lib/observability";

type ExistingSignalPostCandidate = {
  id: string;
  title: string | null;
  source_url: string | null;
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
        | "storage_error"
        | "aborted";
      message: string;
    };

type NewsletterSkipReason = Extract<NewsletterPromotionResult, { status: "skipped" }>["reason"];

export type NewsletterPromotionPreviewStory = {
  headline: string;
  sourceUrl: string | null;
  sourceDomain: string | null;
  category: "Finance" | "Tech" | "Politics" | null;
};

export type NewsletterPromotionPreviewResult = {
  status: "eligible" | "invalid_source_url" | "duplicate_public_row" | "no_available_candidate_rank";
  previewAction: "create_candidate" | "link_existing_candidate" | "skip";
  title: string;
  sourceUrl: string | null;
  sourceDomain: string | null;
  category: "Finance" | "Tech" | "Politics" | null;
  rank: number | null;
  existingSignalPostId: string | null;
  matchedBy: "source_url" | "title" | null;
  reason: string | null;
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

async function safeLinkExtractionToSignalPost(
  db: NewsletterDbClient,
  extractionId: string,
  signalPostId: string,
) {
  // Best-effort: the candidate row is already committed. A failed FK link is
  // self-healed on the next run — the planner re-reads the row by source_url and
  // plans `link` (never a duplicate insert, guarded by UNIQUE(briefing_date, source_url)).
  try {
    await linkExtractionToSignalPost(db, extractionId, signalPostId);
  } catch (error) {
    logServerEvent("warn", "Newsletter ingestion: extraction link failed (will self-heal next run)", {
      extractionId,
      signalPostId,
      ...errorContext(error),
    });
  }
}

async function getExistingSignalPostCandidates(input: {
  db: NewsletterDbClient;
  briefingDate: string;
}) {
  const result = await input.db
    .from("signal_posts")
    .select("id, title, source_url, rank, editorial_status, is_live, published_at")
    .eq("briefing_date", input.briefingDate)
    .limit(200);

  if (result.error) {
    throw new Error(`signal_posts preview check failed: ${result.error.message}`);
  }

  return (result.data ?? []) as ExistingSignalPostCandidate[];
}

function nextAvailablePreviewRank(
  existingRows: ExistingSignalPostCandidate[],
  allocatedRanks: Set<number>,
) {
  const usedRanks = new Set(
    existingRows
      .map((row) => row.rank)
      .filter((rank): rank is number => typeof rank === "number"),
  );

  for (const rank of allocatedRanks) {
    usedRanks.add(rank);
  }

  // PR2 — RSS rank-band reservation. Newsletter discovery candidates may only
  // claim ranks in the band BELOW the RSS-reserved top: RSS_RESERVED_TOP_RANKS+1
  // .. depth limit (8..20). Ranks 1..RSS_RESERVED_TOP_RANKS stay free for the
  // RSS/article path so a flood of newsletter rows can never occupy the public
  // slate. The band fills from the FLOOR up (8, then 9, ...) so the most
  // important story (callers plan in importance order — see
  // sortStoriesByImportanceDesc) sits directly below the RSS slate, and band
  // overflow returns null → the caller drops the lowest-signal candidate.
  for (let rank = RSS_RESERVED_TOP_RANKS + 1; rank <= SIGNAL_POST_CANDIDATE_DEPTH_LIMIT; rank += 1) {
    if (!usedRanks.has(rank)) {
      allocatedRanks.add(rank);
      return rank;
    }
  }

  return null;
}

/**
 * Order stories most-important-first so that when the newsletter band (8..20)
 * overflows, the rows that get dropped are the LOWEST signal. The only
 * importance signal a story carries at promotion time is `extraction_confidence`
 * (newsletter co-occurrence and source-trust tier are computed downstream, not
 * here), so that is the sort key; nulls sort last. Stable on ties (preserves the
 * original within-batch order, which keeps dedup ownership deterministic).
 */
function sortStoriesByImportanceDesc(
  stories: NewsletterStoryExtractionRow[],
): NewsletterStoryExtractionRow[] {
  return stories
    .map((story, index) => ({ story, index }))
    .sort((a, b) => {
      const confDelta = (b.story.extraction_confidence ?? -1) - (a.story.extraction_confidence ?? -1);
      return confDelta !== 0 ? confDelta : a.index - b.index;
    })
    .map((entry) => entry.story);
}

/**
 * Single source of truth for a newsletter candidate's `signal_posts` row shape.
 * The byte-for-byte column set MUST match what the editorial cockpit's
 * `needs_review` contract expects — do not let it drift. Both the per-story
 * wrapper and the batch promoter build their rows here.
 */
export function buildNewsletterCandidateRow(input: {
  extraction: NewsletterStoryExtractionRow;
  briefingDate: string;
  rank: number;
  sourceUrl: string;
  nowIso: string;
}) {
  const { extraction, briefingDate, rank, sourceUrl, nowIso } = input;

  return {
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
    created_at: nowIso,
    updated_at: nowIso,
  };
}

export type NewsletterCandidatePlan =
  | {
      action: "insert";
      extractionId: string;
      rank: number;
      sourceUrl: string;
      normalizedTitle: string;
      row: ReturnType<typeof buildNewsletterCandidateRow>;
    }
  | {
      action: "link";
      extractionId: string;
      /** A row already present in `existingRows` (prior run / prior story). */
      existingSignalPostId: string | null;
      /** An insert planned earlier in THIS batch, resolved to an id post-insert. */
      batchSourceUrl: string | null;
    }
  | {
      action: "skip";
      extractionId: string;
      reason: NewsletterSkipReason;
      message: string;
    };

/**
 * PURE planner — decides what every story in a run WOULD become against a single
 * pre-fetched `existingRows` snapshot, with NO database calls. Replaces the old
 * per-story round-trips (dup-by-url / dup-by-title / next-rank) that each hit the
 * DB; everything is now resolved in memory against one read. Ranks are allocated
 * descending within the newsletter discovery band (depth limit → RSS_RESERVED_TOP_RANKS+1,
 * i.e. 20→8 — PR2 reserves 1..7 for RSS), deduped within the batch via
 * `nextAvailablePreviewRank`'s `allocatedRanks` accumulator, so the resulting
 * bulk insert respects CHECK(rank 1..20) and UNIQUE(briefing_date, rank). Stories
 * are planned in importance order so band overflow drops the lowest signal.
 */
export function planNewsletterStoryPromotions(input: {
  stories: NewsletterStoryExtractionRow[];
  existingRows: ExistingSignalPostCandidate[];
  briefingDate: string;
  nowIso: string;
}): NewsletterCandidatePlan[] {
  const { stories, existingRows, briefingDate, nowIso } = input;
  const allocatedRanks = new Set<number>();
  const plannedInsertSourceUrls = new Set<string>();
  const plannedInsertTitleToUrl = new Map<string, string>();

  // Plan in importance order so that when the newsletter band (8..20) overflows,
  // the lowest-signal stories are the ones dropped (no available rank).
  return sortStoriesByImportanceDesc(stories).map((extraction): NewsletterCandidatePlan => {
    if (extraction.signal_post_id) {
      return {
        action: "skip",
        extractionId: extraction.id,
        reason: "already_linked",
        message: "Newsletter story extraction is already linked to a signal_posts candidate.",
      };
    }

    const sourceUrl = extraction.source_url?.trim() ?? "";

    if (!isValidPublicSourceUrl(sourceUrl)) {
      return {
        action: "skip",
        extractionId: extraction.id,
        reason: "invalid_source_url",
        message: "Newsletter story extraction was not promoted because it lacks a valid public source URL.",
      };
    }

    const normalizedTitle = normalizeTitle(extraction.headline);

    const existingByUrl = existingRows.find((row) => row.source_url === sourceUrl);
    if (existingByUrl) {
      if (isPublishedOrLive(existingByUrl)) {
        return {
          action: "skip",
          extractionId: extraction.id,
          reason: "duplicate_public_row",
          message: "Newsletter story extraction matches an already live or published signal_posts row.",
        };
      }
      return { action: "link", extractionId: extraction.id, existingSignalPostId: existingByUrl.id, batchSourceUrl: null };
    }

    const existingByTitle = existingRows.find((row) => normalizeTitle(row.title) === normalizedTitle);
    if (existingByTitle) {
      if (isPublishedOrLive(existingByTitle)) {
        return {
          action: "skip",
          extractionId: extraction.id,
          reason: "duplicate_public_row",
          message: "Newsletter story extraction title matches an already live or published signal_posts row.",
        };
      }
      return { action: "link", extractionId: extraction.id, existingSignalPostId: existingByTitle.id, batchSourceUrl: null };
    }

    // Within-batch dedupe: an earlier story in THIS run already planned an insert
    // for the same URL or title — link to it (resolved to an id after the insert),
    // matching the old sequential behavior where the 2nd story linked to the 1st's
    // just-committed row instead of inserting a duplicate.
    if (plannedInsertSourceUrls.has(sourceUrl)) {
      return { action: "link", extractionId: extraction.id, existingSignalPostId: null, batchSourceUrl: sourceUrl };
    }
    const batchTitleOwnerUrl = plannedInsertTitleToUrl.get(normalizedTitle);
    if (batchTitleOwnerUrl) {
      return { action: "link", extractionId: extraction.id, existingSignalPostId: null, batchSourceUrl: batchTitleOwnerUrl };
    }

    const rank = nextAvailablePreviewRank(existingRows, allocatedRanks);
    if (!rank) {
      return {
        action: "skip",
        extractionId: extraction.id,
        reason: "no_available_candidate_rank",
        message: `Newsletter story extraction was not promoted because the newsletter discovery band (ranks ${RSS_RESERVED_TOP_RANKS + 1}..${SIGNAL_POST_CANDIDATE_DEPTH_LIMIT}) is full; ranks 1..${RSS_RESERVED_TOP_RANKS} are reserved for RSS.`,
      };
    }

    plannedInsertSourceUrls.add(sourceUrl);
    plannedInsertTitleToUrl.set(normalizedTitle, sourceUrl);

    return {
      action: "insert",
      extractionId: extraction.id,
      rank,
      sourceUrl,
      normalizedTitle,
      row: buildNewsletterCandidateRow({ extraction, briefingDate, rank, sourceUrl, nowIso }),
    };
  });
}

function planToAbortedResult(plan: NewsletterCandidatePlan): NewsletterPromotionResult {
  if (plan.action === "skip") {
    return { status: "skipped", extractionId: plan.extractionId, reason: plan.reason, message: plan.message };
  }
  return {
    status: "skipped",
    extractionId: plan.extractionId,
    reason: "aborted",
    message: "Newsletter promotion aborted before the atomic candidate write (run deadline reached); no row persisted.",
  };
}

function planToStorageErrorResult(plan: NewsletterCandidatePlan, message: string): NewsletterPromotionResult {
  if (plan.action === "skip") {
    return { status: "skipped", extractionId: plan.extractionId, reason: plan.reason, message: plan.message };
  }
  return { status: "skipped", extractionId: plan.extractionId, reason: "storage_error", message };
}

/**
 * ATOMIC-BY-BATCH newsletter promotion. Plans every story in the run against ONE
 * pre-fetched `existingRows` snapshot, then performs exactly ONE multi-row
 * `signal_posts` insert (a single PostgREST request → one Postgres INSERT →
 * all-or-nothing). Net effect on timeout/error: ZERO partial rows for the
 * briefing_date — the slate can never be left half-written.
 *
 * - `signal` (the run's internal-timeout AbortSignal): if it has already fired
 *   when we reach the write, we persist NOTHING and report `aborted`, so a
 *   timeout deterministically leaves an EMPTY slate (status matches DB reality).
 * - insert→link seam: links run AFTER the committed insert and are best-effort;
 *   a crash in between is repaired next run (planner sees the row by source_url
 *   and plans `link`, never a duplicate insert).
 */
export async function promoteNewsletterStoryBatch(input: {
  db: NewsletterDbClient;
  briefingDate: string;
  stories: NewsletterStoryExtractionRow[];
  now?: Date;
  signal?: AbortSignal;
}): Promise<NewsletterPromotionResult[]> {
  const briefingDate = normalizeDateValue(input.briefingDate);

  if (input.stories.length === 0) {
    return [];
  }

  const nowIso = (input.now ?? new Date()).toISOString();
  const existingRows = await getExistingSignalPostCandidates({ db: input.db, briefingDate });
  const plans = planNewsletterStoryPromotions({ stories: input.stories, existingRows, briefingDate, nowIso });
  const inserts = plans.filter(
    (plan): plan is Extract<NewsletterCandidatePlan, { action: "insert" }> => plan.action === "insert",
  );

  // Atomicity gate. The single bulk insert below is the ONLY signal_posts write
  // in the whole run; if the deadline already fired we skip it entirely so the
  // briefing_date is left with zero newsletter rows (never a partial slate).
  if (input.signal?.aborted) {
    logServerEvent("warn", "Newsletter ingestion: bulk candidate write skipped (aborted before insert)", {
      briefingDate,
      plannedInserts: inserts.length,
    });
    return plans.map(planToAbortedResult);
  }

  const sourceUrlToId = new Map<string, string>();

  if (inserts.length > 0) {
    const insertResult = await input.db
      .from("signal_posts")
      .insert(inserts.map((plan) => plan.row))
      .select("id, rank, source_url");

    if (insertResult.error) {
      logServerEvent("error", "Newsletter ingestion: bulk candidate insert failed", {
        briefingDate,
        attempted: inserts.length,
        message: insertResult.error.message,
      });
      // A failed multi-row INSERT commits nothing — no partial slate to clean up.
      return plans.map((plan) => planToStorageErrorResult(plan, insertResult.error!.message));
    }

    for (const row of (insertResult.data ?? []) as Array<{ id: string; rank: number | null; source_url: string | null }>) {
      if (row.source_url) {
        sourceUrlToId.set(row.source_url, row.id);
      }
    }
  }

  const results: NewsletterPromotionResult[] = [];

  for (const plan of plans) {
    if (plan.action === "skip") {
      results.push({ status: "skipped", extractionId: plan.extractionId, reason: plan.reason, message: plan.message });
      continue;
    }

    if (plan.action === "insert") {
      const signalPostId = sourceUrlToId.get(plan.sourceUrl);
      if (!signalPostId) {
        results.push({
          status: "skipped",
          extractionId: plan.extractionId,
          reason: "storage_error",
          message: "Inserted signal_posts row id could not be resolved for the newsletter extraction.",
        });
        continue;
      }
      await safeLinkExtractionToSignalPost(input.db, plan.extractionId, signalPostId);
      results.push({ status: "created", extractionId: plan.extractionId, signalPostId, rank: plan.rank });
      continue;
    }

    const signalPostId = plan.existingSignalPostId
      ?? (plan.batchSourceUrl ? sourceUrlToId.get(plan.batchSourceUrl) ?? null : null);
    if (!signalPostId) {
      results.push({
        status: "skipped",
        extractionId: plan.extractionId,
        reason: "storage_error",
        message: "Link target signal_posts row could not be resolved for the newsletter extraction.",
      });
      continue;
    }
    await safeLinkExtractionToSignalPost(input.db, plan.extractionId, signalPostId);
    results.push({ status: "linked_existing", extractionId: plan.extractionId, signalPostId });
  }

  return results;
}

export async function previewNewsletterStoryPromotions(input: {
  db: NewsletterDbClient;
  briefingDate: string;
  stories: NewsletterPromotionPreviewStory[];
}): Promise<NewsletterPromotionPreviewResult[]> {
  const briefingDate = normalizeDateValue(input.briefingDate);
  const existingRows = await getExistingSignalPostCandidates({
    db: input.db,
    briefingDate,
  });
  const allocatedRanks = new Set<number>();

  return input.stories.map((story) => {
    const title = story.headline;
    const sourceUrl = story.sourceUrl?.trim() ?? null;
    const base = {
      title,
      sourceUrl,
      sourceDomain: story.sourceDomain,
      category: story.category,
    };

    if (!isValidPublicSourceUrl(sourceUrl ?? "")) {
      return {
        ...base,
        status: "invalid_source_url" as const,
        previewAction: "skip" as const,
        rank: null,
        existingSignalPostId: null,
        matchedBy: null,
        reason: "Newsletter story lacks a valid public source URL.",
      };
    }

    const existingByUrl = existingRows.find((row) => row.source_url === sourceUrl);
    const existingByTitle = existingRows.find((row) => normalizeTitle(row.title) === normalizeTitle(title));
    const existing = existingByUrl ?? existingByTitle ?? null;
    const matchedBy = existingByUrl ? "source_url" : existingByTitle ? "title" : null;

    if (existing) {
      if (isPublishedOrLive(existing)) {
        return {
          ...base,
          status: "duplicate_public_row" as const,
          previewAction: "skip" as const,
          rank: null,
          existingSignalPostId: existing.id,
          matchedBy,
          reason: "Newsletter story matches an already live or published signal_posts row.",
        };
      }

      return {
        ...base,
        status: "eligible" as const,
        previewAction: "link_existing_candidate" as const,
        rank: existing.rank,
        existingSignalPostId: existing.id,
        matchedBy,
        reason: "Newsletter story would link to an existing non-live review candidate.",
      };
    }

    const rank = nextAvailablePreviewRank(existingRows, allocatedRanks);

    if (!rank) {
      return {
        ...base,
        status: "no_available_candidate_rank" as const,
        previewAction: "skip" as const,
        rank: null,
        existingSignalPostId: null,
        matchedBy: null,
        reason: `The newsletter discovery band (ranks ${RSS_RESERVED_TOP_RANKS + 1}..${SIGNAL_POST_CANDIDATE_DEPTH_LIMIT}) is full for the briefing date; ranks 1..${RSS_RESERVED_TOP_RANKS} are reserved for RSS.`,
      };
    }

    return {
      ...base,
      status: "eligible" as const,
      previewAction: "create_candidate" as const,
      rank,
      existingSignalPostId: null,
      matchedBy: null,
      reason: "Newsletter story would create a non-live needs_review candidate.",
    };
  });
}

/**
 * Promote a SINGLE newsletter story by id. Thin wrapper over the batch promoter
 * so there is one code path for planning + the atomic insert. Reads the
 * extraction row, then delegates to `promoteNewsletterStoryBatch([story])`.
 * The hot ingestion loop uses the batch promoter directly with in-memory
 * extraction rows; this entry point exists for targeted/single-story callers.
 */
export async function promoteNewsletterStoryToCandidate(input: {
  db: NewsletterDbClient;
  extractionId: string;
  briefingDate: string;
  now?: Date;
}): Promise<NewsletterPromotionResult> {
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
    const [result] = await promoteNewsletterStoryBatch({
      db: input.db,
      briefingDate: input.briefingDate,
      stories: [extraction],
      now: input.now,
    });

    return (
      result ?? {
        status: "skipped",
        extractionId: input.extractionId,
        reason: "storage_error",
        message: "Newsletter promotion produced no result for the extraction.",
      }
    );
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
