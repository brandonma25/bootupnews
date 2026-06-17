import {
  canWriteNewsletterIngestionRecords,
  getNewsletterSinceDate,
  getNewsletterWriteBlockReason,
  resolveNewsletterIngestionConfig,
  validateNewsletterGmailEnv,
  type NewsletterIngestionConfig,
} from "@/lib/newsletter-ingestion/config";
import {
  createGmailApiClient,
  fetchBootUpBenchmarkEmails,
  verifyGmailNewsletterLabelVisible,
  type GmailApiClient,
  type GmailMessageRef,
} from "@/lib/newsletter-ingestion/gmail";
import { parseRawNewsletterEmail } from "@/lib/newsletter-ingestion/email-content";
import { parseNewsletterStories } from "@/lib/newsletter-ingestion/parser";
import { promoteNewsletterStoryBatch, type NewsletterPromotionResult } from "@/lib/newsletter-ingestion/promotion";
import {
  extractStoriesFromEmail,
  insertNewsletterEmail,
  type NewsletterDbClient,
  type NewsletterStoryExtractionRow,
} from "@/lib/newsletter-ingestion/storage";
import { errorContext, logServerEvent } from "@/lib/observability";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type NewsletterIngestionRunOptions = {
  sinceDate?: Date;
  briefingDate?: string;
  maxEmails?: number;
  dryRun?: boolean;
  writeCandidates?: boolean;
  label?: string;
  testRunId?: string | null;
  now?: Date;
  /**
   * The run's internal-timeout AbortSignal (threaded from the cron endpoint's
   * 55s wall). When it fires, in-flight Gmail fetches abort, the email loop
   * stops, and the atomic candidate write is skipped — so a timeout leaves a
   * clean, empty briefing slate rather than partial junk rows.
   */
  signal?: AbortSignal;
};

export type NewsletterIngestionRunSummary = {
  message: string;
  testRunId: string | null;
  label: string;
  sinceDate: string;
  briefingDate: string;
  dryRun: boolean;
  enabled: boolean;
  writeCandidates: boolean;
  targetEnvironment: string;
  fetchedMessageCount: number;
  existingEmailCount: number;
  storedEmailCount: number;
  extractedStoryCount: number;
  promotedCandidateCount: number;
  linkedExistingCandidateCount: number;
  skippedPromotionCount: number;
  failedEmailCount: number;
};

export type NewsletterIngestionRunResult = {
  success: boolean;
  timestamp: string;
  summary: NewsletterIngestionRunSummary;
};

export type NewsletterIngestionDependencies = {
  db?: NewsletterDbClient | null;
  gmailClient?: GmailApiClient;
  config?: NewsletterIngestionConfig;
};

function todayTaipei(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function buildResult(input: {
  success: boolean;
  timestamp: string;
  config: NewsletterIngestionConfig;
  sinceDate: Date;
  briefingDate: string;
  testRunId: string | null;
  message: string;
  fetchedMessageCount?: number;
  existingEmailCount?: number;
  storedEmailCount?: number;
  extractedStoryCount?: number;
  promotedCandidateCount?: number;
  linkedExistingCandidateCount?: number;
  skippedPromotionCount?: number;
  failedEmailCount?: number;
}): NewsletterIngestionRunResult {
  return {
    success: input.success,
    timestamp: input.timestamp,
    summary: {
      message: input.message,
      testRunId: input.testRunId,
      label: input.config.label,
      sinceDate: input.sinceDate.toISOString(),
      briefingDate: input.briefingDate,
      dryRun: input.config.dryRun,
      enabled: input.config.enabled,
      writeCandidates: input.config.writeCandidates,
      targetEnvironment: input.config.targetEnvironment,
      fetchedMessageCount: input.fetchedMessageCount ?? 0,
      existingEmailCount: input.existingEmailCount ?? 0,
      storedEmailCount: input.storedEmailCount ?? 0,
      extractedStoryCount: input.extractedStoryCount ?? 0,
      promotedCandidateCount: input.promotedCandidateCount ?? 0,
      linkedExistingCandidateCount: input.linkedExistingCandidateCount ?? 0,
      skippedPromotionCount: input.skippedPromotionCount ?? 0,
      failedEmailCount: input.failedEmailCount ?? 0,
    },
  };
}

async function filterExistingMessageRefs(
  db: NewsletterDbClient,
  refs: GmailMessageRef[],
) {
  if (refs.length === 0) {
    return {
      existingIds: new Set<string>(),
      newRefs: [] as GmailMessageRef[],
    };
  }

  const result = await db
    .from("newsletter_emails")
    .select("gmail_message_id")
    .in("gmail_message_id", refs.map((ref) => ref.id));

  if (result.error) {
    throw new Error(`newsletter_emails existing-message check failed: ${result.error.message}`);
  }

  const existingIds = new Set(
    ((result.data ?? []) as Array<{ gmail_message_id: string | null }>)
      .map((row) => row.gmail_message_id)
      .filter((id): id is string => Boolean(id)),
  );

  return {
    existingIds,
    newRefs: refs.filter((ref) => !existingIds.has(ref.id)),
  };
}

function summarizePromotions(promotions: NewsletterPromotionResult[]) {
  return promotions.reduce(
    (summary, promotion) => {
      if (promotion.status === "created") {
        summary.promotedCandidateCount += 1;
      } else if (promotion.status === "linked_existing") {
        summary.linkedExistingCandidateCount += 1;
      } else {
        summary.skippedPromotionCount += 1;
      }

      return summary;
    },
    {
      promotedCandidateCount: 0,
      linkedExistingCandidateCount: 0,
      skippedPromotionCount: 0,
    },
  );
}

async function dryRunExtract(input: {
  gmailClient: GmailApiClient;
  refs: GmailMessageRef[];
}) {
  let extractedStoryCount = 0;
  let failedEmailCount = 0;

  for (const ref of input.refs) {
    try {
      const rawMessage = await input.gmailClient.getRawMessage(ref.id);
      const email = parseRawNewsletterEmail(rawMessage.raw, {
        internalDate: rawMessage.internalDate,
      });
      const stories = parseNewsletterStories({
        sender: email.sender,
        subject: email.subject,
        rawContent: email.contentText,
      });
      extractedStoryCount += stories.length;
    } catch {
      failedEmailCount += 1;
      continue;
    }

    // Dry-run counts parsed story candidates only in memory and never persists
    // private newsletter content or snippets.
  }

  return {
    extractedStoryCount,
    failedEmailCount,
  };
}

async function processWritableRun(input: {
  db: NewsletterDbClient;
  gmailClient: GmailApiClient;
  refs: GmailMessageRef[];
  config: NewsletterIngestionConfig;
  briefingDate: string;
  now: Date;
  signal?: AbortSignal;
}) {
  let storedEmailCount = 0;
  let extractedStoryCount = 0;
  let failedEmailCount = 0;
  // Stories are buffered ACROSS the whole email loop and promoted in a SINGLE
  // atomic bulk insert after the loop (see promoteNewsletterStoryBatch). The
  // newsletter_emails / newsletter_story_extractions writes stay incremental —
  // they are idempotent (gmail_message_id / email-id keyed) and are NOT the
  // public slate; only the signal_posts write must be all-or-nothing.
  const candidateStories: NewsletterStoryExtractionRow[] = [];
  const canWriteCandidates =
    input.config.writeCandidates && canWriteNewsletterIngestionRecords(input.config);

  for (const ref of input.refs) {
    // Stop pulling new emails once the run's deadline has fired; the buffered
    // stories are discarded (never written) by the aborted batch below.
    if (input.signal?.aborted) {
      break;
    }

    try {
      const inserted = await insertNewsletterEmail({
        db: input.db,
        gmailClient: input.gmailClient,
        messageRef: ref,
        label: input.config.label,
        signal: input.signal,
      });
      const newsletterEmailId = inserted.email.id;

      if (inserted.status === "inserted") {
        storedEmailCount += 1;
      }

      const extraction = await extractStoriesFromEmail({
        db: input.db,
        newsletterEmailId,
      });

      if (!extraction.ok) {
        failedEmailCount += 1;
        continue;
      }

      extractedStoryCount += extraction.stories.length;

      if (canWriteCandidates) {
        candidateStories.push(...extraction.stories);
      }
    } catch (error) {
      failedEmailCount += 1;
      logServerEvent("warn", "Newsletter ingestion skipped one email after a safe processing failure", {
        gmailMessageId: ref.id,
        ...errorContext(error),
      });
    }
  }

  // SINGLE atomic candidate write for the whole run. A timeout anywhere in the
  // loop above means control reaches the batch with the signal already aborted
  // (or never reaches it because the awaiter rejected) — either way ZERO partial
  // signal_posts rows are persisted for the briefing_date.
  const promotions: NewsletterPromotionResult[] = await promoteNewsletterStoryBatch({
    db: input.db,
    briefingDate: input.briefingDate,
    stories: candidateStories,
    now: input.now,
    signal: input.signal,
  });

  for (const promotion of promotions) {
    if (promotion.status === "skipped") {
      logServerEvent("warn", "Newsletter ingestion: story promotion skipped", {
        reason: promotion.reason,
        extractionId: promotion.extractionId,
      });
    }
  }

  const promotionSummary = summarizePromotions(promotions);

  if (promotions.length > 0) {
    const skipReasonBreakdown = promotions
      .filter((p) => p.status === "skipped")
      .reduce<Record<string, number>>((acc, p) => {
        if (p.status === "skipped") {
          acc[p.reason] = (acc[p.reason] ?? 0) + 1;
        }
        return acc;
      }, {});

    logServerEvent("info", "Newsletter ingestion: promotion summary", {
      briefingDate: input.briefingDate,
      aborted: Boolean(input.signal?.aborted),
      promotedCandidateCount: promotionSummary.promotedCandidateCount,
      linkedExistingCandidateCount: promotionSummary.linkedExistingCandidateCount,
      skippedPromotionCount: promotionSummary.skippedPromotionCount,
      skipReasonBreakdown,
    });
  }

  return {
    storedEmailCount,
    extractedStoryCount,
    failedEmailCount,
    ...promotionSummary,
  };
}

export async function runNewsletterIngestion(
  options: NewsletterIngestionRunOptions = {},
  dependencies: NewsletterIngestionDependencies = {},
): Promise<NewsletterIngestionRunResult> {
  const now = options.now ?? new Date();
  const timestamp = now.toISOString();
  const config = dependencies.config ?? resolveNewsletterIngestionConfig(process.env, {
    dryRun: options.dryRun,
    writeCandidates: options.writeCandidates,
    label: options.label,
    maxEmailsPerRun: options.maxEmails,
  });
  const sinceDate = options.sinceDate ?? getNewsletterSinceDate(config, now);
  const briefingDate = options.briefingDate ?? todayTaipei(now);
  const testRunId = options.testRunId ?? null;

  logServerEvent("info", "Newsletter ingestion run started", {
    // Track 2 P5 — the standalone /api/cron/newsletter-ingestion route was
// removed (orphan; never reached `cron_runs`). The newsletter runner now
// only runs as part of /api/cron/fetch-editorial-inputs. Log tag points
// at the live caller for log-search accuracy.
route: "/api/cron/fetch-editorial-inputs",
    testRunId,
    dryRun: config.dryRun,
    enabled: config.enabled,
    label: config.label,
    targetEnvironment: config.targetEnvironment,
  });

  if (!config.enabled) {
    return buildResult({
      success: true,
      timestamp,
      config,
      sinceDate,
      briefingDate,
      testRunId,
      message: getNewsletterWriteBlockReason(config) ?? "Newsletter ingestion is disabled.",
    });
  }

  if (!config.dryRun && !canWriteNewsletterIngestionRecords(config)) {
    return buildResult({
      success: true,
      timestamp,
      config,
      sinceDate,
      briefingDate,
      testRunId,
      message: getNewsletterWriteBlockReason(config) ?? "Newsletter ingestion writes are blocked.",
    });
  }

  const gmailEnv = validateNewsletterGmailEnv(config);

  if (!gmailEnv.ok) {
    return buildResult({
      success: false,
      timestamp,
      config,
      sinceDate,
      briefingDate,
      testRunId,
      message: gmailEnv.message ?? "Newsletter Gmail configuration is incomplete.",
    });
  }

  const gmailClient = dependencies.gmailClient ?? createGmailApiClient({
    credentials: {
      clientId: config.gmailClientId,
      clientSecret: config.gmailClientSecret,
      refreshToken: config.gmailRefreshToken,
    },
  });

  try {
    const labelPreflight = await verifyGmailNewsletterLabelVisible(gmailClient, config.label);

    if (!labelPreflight.ok) {
      return buildResult({
        success: false,
        timestamp,
        config,
        sinceDate,
        briefingDate,
        testRunId,
        message: labelPreflight.message,
      });
    }

    const refs = await fetchBootUpBenchmarkEmails(sinceDate, {
      gmailClient,
      label: config.label,
      maxResults: config.maxEmailsPerRun,
    });

    // #272 — Empty Gmail label is NOT a failure. The brief's "newsletter
    // is supplementary" contract requires the runner to return success
    // when there is simply nothing new since the last fetch, so the
    // upstream cron logs a `warn` ("degraded") rather than a `fail`.
    if (refs.length === 0) {
      return buildResult({
        success: true,
        timestamp,
        config,
        sinceDate,
        briefingDate,
        testRunId,
        message: "No newsletters received from the configured Gmail label since the last fetch.",
        fetchedMessageCount: 0,
      });
    }

    if (config.dryRun) {
      const dryRunSummary = await dryRunExtract({
        gmailClient,
        refs,
      });

      return buildResult({
        success: dryRunSummary.failedEmailCount === 0,
        timestamp,
        config,
        sinceDate,
        briefingDate,
        testRunId,
        message: "Newsletter ingestion dry-run fetched Gmail metadata and raw messages without database writes.",
        fetchedMessageCount: refs.length,
        ...dryRunSummary,
      });
    }

    const db = dependencies.db ?? createSupabaseServiceRoleClient();

    if (!db) {
      return buildResult({
        success: false,
        timestamp,
        config,
        sinceDate,
        briefingDate,
        testRunId,
        message: "Newsletter ingestion cannot write because Supabase service-role env is not configured.",
        fetchedMessageCount: refs.length,
      });
    }

    const { existingIds, newRefs } = await filterExistingMessageRefs(db, refs);
    const writeSummary = await processWritableRun({
      db,
      gmailClient,
      refs: newRefs,
      config,
      briefingDate,
      now,
      signal: options.signal,
    });

    return buildResult({
      success: writeSummary.failedEmailCount === 0,
      timestamp,
      config,
      sinceDate,
      briefingDate,
      testRunId,
      message: "Newsletter ingestion processed Gmail newsletter candidates without publishing.",
      fetchedMessageCount: refs.length,
      existingEmailCount: existingIds.size,
      ...writeSummary,
    });
  } catch (error) {
    logServerEvent("error", "Newsletter ingestion failed closed before completion", {
      // Track 2 P5 — the standalone /api/cron/newsletter-ingestion route was
// removed (orphan; never reached `cron_runs`). The newsletter runner now
// only runs as part of /api/cron/fetch-editorial-inputs. Log tag points
// at the live caller for log-search accuracy.
route: "/api/cron/fetch-editorial-inputs",
      testRunId,
      ...errorContext(error),
    });

    return buildResult({
      success: false,
      timestamp,
      config,
      sinceDate,
      briefingDate,
      testRunId,
      message: "Newsletter ingestion failed closed before completion.",
    });
  }
}

export function getNewsletterStoryExtractionIds(stories: NewsletterStoryExtractionRow[]) {
  return stories.map((story) => story.id);
}
