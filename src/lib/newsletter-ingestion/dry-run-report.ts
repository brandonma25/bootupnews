import {
  getNewsletterSinceDate,
  resolveNewsletterIngestionConfig,
  validateNewsletterGmailEnv,
  type NewsletterIngestionConfig,
} from "@/lib/newsletter-ingestion/config";
import { parseRawNewsletterEmail } from "@/lib/newsletter-ingestion/email-content";
import {
  createGmailApiClient,
  fetchBootUpBenchmarkEmails,
  verifyGmailNewsletterLabelVisible,
  type GmailApiClient,
} from "@/lib/newsletter-ingestion/gmail";
import { parseNewsletterStories, type ParsedNewsletterStory } from "@/lib/newsletter-ingestion/parser";
import {
  previewNewsletterStoryPromotions,
  type NewsletterPromotionPreviewResult,
} from "@/lib/newsletter-ingestion/promotion";
import type { NewsletterDbClient } from "@/lib/newsletter-ingestion/storage";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type EmailInventoryItem = {
  sender: string;
  subject: string | null;
  receivedAt: string | null;
};

type NewsletterGroup<T> = {
  sender: string;
  count: number;
  items: T[];
};

type ParsedEmailReport = EmailInventoryItem & {
  stories: ParsedNewsletterStory[];
};

export type NewsletterDryRunReport = {
  success: boolean;
  message: string;
  timestamp: string;
  label: string;
  sinceDate: string;
  briefingDate: string;
  dryRun: true;
  enabled: boolean;
  targetEnvironment: string;
  gmail: {
    oauth: "ok" | "not_checked";
    labelVisible: boolean;
    labelMessageTotal: number | null;
  };
  emailInventory: {
    total: number;
    newsletters: Array<NewsletterGroup<EmailInventoryItem>>;
  };
  storyExtraction: {
    total: number;
    failedEmailCount: number;
    newsletters: Array<{
      sender: string;
      count: number;
      sampleHeadlines: string[];
    }>;
  };
  sourceUrlQuality: {
    withPrimarySourceUrl: number;
    newsletterOnly: number;
  };
  categoryDistribution: Record<"Finance" | "Tech" | "Politics" | "Uncategorized", number>;
  promotionPreview: {
    eligibleCount: number;
    createCandidateCount: number;
    linkExistingCandidateCount: number;
    skippedCount: number;
    candidates: Array<{
      title: string;
      sourceUrl: string;
      sourceDomain: string | null;
      category: string | null;
      previewAction: "create_candidate" | "link_existing_candidate";
      rank: number | null;
    }>;
    skipped: Array<{
      title: string;
      sourceUrl: string | null;
      reason: string;
    }>;
  };
  dedup: {
    duplicatePublicRowCount: number;
    linkedExistingCandidateCount: number;
    sourceUrlOverlapCount: number;
    titleOverlapCount: number;
    overlaps: Array<{
      title: string;
      sourceUrl: string | null;
      status: "eligible" | "duplicate_public_row";
      previewAction: "link_existing_candidate" | "skip";
      matchedBy: "source_url" | "title";
    }>;
  };
  privacy: {
    rawContentIncluded: false;
    snippetsIncluded: false;
    messageIdsIncluded: false;
  };
};

export type NewsletterDryRunReportDependencies = {
  config?: NewsletterIngestionConfig;
  gmailClient?: GmailApiClient;
  db?: NewsletterDbClient | null;
};

function todayTaipei(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function emptyReport(input: {
  success: boolean;
  message: string;
  timestamp: string;
  config: NewsletterIngestionConfig;
  sinceDate: Date;
  briefingDate: string;
  gmail?: Partial<NewsletterDryRunReport["gmail"]>;
}): NewsletterDryRunReport {
  return {
    success: input.success,
    message: input.message,
    timestamp: input.timestamp,
    label: input.config.label,
    sinceDate: input.sinceDate.toISOString(),
    briefingDate: input.briefingDate,
    dryRun: true,
    enabled: input.config.enabled,
    targetEnvironment: input.config.targetEnvironment,
    gmail: {
      oauth: input.gmail?.oauth ?? "not_checked",
      labelVisible: input.gmail?.labelVisible ?? false,
      labelMessageTotal: input.gmail?.labelMessageTotal ?? null,
    },
    emailInventory: {
      total: 0,
      newsletters: [],
    },
    storyExtraction: {
      total: 0,
      failedEmailCount: 0,
      newsletters: [],
    },
    sourceUrlQuality: {
      withPrimarySourceUrl: 0,
      newsletterOnly: 0,
    },
    categoryDistribution: {
      Finance: 0,
      Tech: 0,
      Politics: 0,
      Uncategorized: 0,
    },
    promotionPreview: {
      eligibleCount: 0,
      createCandidateCount: 0,
      linkExistingCandidateCount: 0,
      skippedCount: 0,
      candidates: [],
      skipped: [],
    },
    dedup: {
      duplicatePublicRowCount: 0,
      linkedExistingCandidateCount: 0,
      sourceUrlOverlapCount: 0,
      titleOverlapCount: 0,
      overlaps: [],
    },
    privacy: {
      rawContentIncluded: false,
      snippetsIncluded: false,
      messageIdsIncluded: false,
    },
  };
}

function groupBySender<T extends { sender: string }>(items: T[]) {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const sender = item.sender.trim() || "Unknown sender";
    groups.set(sender, [...(groups.get(sender) ?? []), item]);
  }

  return [...groups.entries()].map(([sender, groupedItems]) => ({
    sender,
    count: groupedItems.length,
    items: groupedItems,
  }));
}

function summarizeStories(parsedEmails: ParsedEmailReport[]) {
  const bySender = new Map<string, ParsedNewsletterStory[]>();
  const categoryDistribution = {
    Finance: 0,
    Tech: 0,
    Politics: 0,
    Uncategorized: 0,
  };
  let withPrimarySourceUrl = 0;
  let newsletterOnly = 0;

  for (const email of parsedEmails) {
    const sender = email.sender.trim() || "Unknown sender";
    bySender.set(sender, [...(bySender.get(sender) ?? []), ...email.stories]);

    for (const story of email.stories) {
      if (story.sourceUrl) {
        withPrimarySourceUrl += 1;
      } else {
        newsletterOnly += 1;
      }

      if (story.category) {
        categoryDistribution[story.category] += 1;
      } else {
        categoryDistribution.Uncategorized += 1;
      }
    }
  }

  return {
    withPrimarySourceUrl,
    newsletterOnly,
    categoryDistribution,
    newsletters: [...bySender.entries()].map(([sender, stories]) => ({
      sender,
      count: stories.length,
      sampleHeadlines: stories.slice(0, 5).map((story) => story.headline),
    })),
  };
}

function summarizePromotionPreview(previews: NewsletterPromotionPreviewResult[]) {
  const eligible = previews.filter((preview) => preview.status === "eligible");
  const createCandidates = eligible.filter((preview) => preview.previewAction === "create_candidate");
  const linkExistingCandidates = eligible.filter((preview) => preview.previewAction === "link_existing_candidate");
  const skipped = previews.filter((preview) => preview.previewAction === "skip");

  return {
    eligibleCount: eligible.length,
    createCandidateCount: createCandidates.length,
    linkExistingCandidateCount: linkExistingCandidates.length,
    skippedCount: skipped.length,
    candidates: eligible
      .filter((preview) => preview.sourceUrl)
      .map((preview) => ({
        title: preview.title,
        sourceUrl: preview.sourceUrl as string,
        sourceDomain: preview.sourceDomain,
        category: preview.category,
        previewAction: preview.previewAction as "create_candidate" | "link_existing_candidate",
        rank: preview.rank,
      })),
    skipped: skipped.map((preview) => ({
      title: preview.title,
      sourceUrl: preview.sourceUrl,
      reason: preview.reason ?? preview.status,
    })),
    duplicatePublicRowCount: previews.filter((preview) => preview.status === "duplicate_public_row").length,
    linkedExistingCandidateCount: linkExistingCandidates.length,
    sourceUrlOverlapCount: previews.filter((preview) => preview.matchedBy === "source_url").length,
    titleOverlapCount: previews.filter((preview) => preview.matchedBy === "title").length,
    overlaps: previews
      .filter((preview): preview is NewsletterPromotionPreviewResult & {
        matchedBy: "source_url" | "title";
        status: "eligible" | "duplicate_public_row";
        previewAction: "link_existing_candidate" | "skip";
      } =>
        Boolean(preview.matchedBy) &&
        (preview.previewAction === "link_existing_candidate" || preview.status === "duplicate_public_row"),
      )
      .map((preview) => ({
        title: preview.title,
        sourceUrl: preview.sourceUrl,
        status: preview.status,
        previewAction: preview.previewAction,
        matchedBy: preview.matchedBy,
      })),
  };
}

export async function buildNewsletterDryRunReport(
  input: {
    now?: Date;
    briefingDate?: string;
    sinceDate?: Date;
  } = {},
  dependencies: NewsletterDryRunReportDependencies = {},
): Promise<NewsletterDryRunReport> {
  const now = input.now ?? new Date();
  const timestamp = now.toISOString();
  const config = dependencies.config ??
    resolveNewsletterIngestionConfig(process.env, {
      dryRun: true,
    });
  const sinceDate = input.sinceDate ?? getNewsletterSinceDate(config, now);
  const briefingDate = input.briefingDate ?? todayTaipei(now);

  if (!config.enabled) {
    return emptyReport({
      success: false,
      message: "NEWSLETTER_INGESTION_ENABLED is not true.",
      timestamp,
      config,
      sinceDate,
      briefingDate,
    });
  }

  const gmailEnv = validateNewsletterGmailEnv(config);

  if (!gmailEnv.ok) {
    return emptyReport({
      success: false,
      message: gmailEnv.message ?? "Newsletter Gmail configuration is incomplete.",
      timestamp,
      config,
      sinceDate,
      briefingDate,
    });
  }

  const gmailClient = dependencies.gmailClient ?? createGmailApiClient({
    credentials: {
      clientId: config.gmailClientId,
      clientSecret: config.gmailClientSecret,
      refreshToken: config.gmailRefreshToken,
    },
  });
  const labelPreflight = await verifyGmailNewsletterLabelVisible(gmailClient, config.label);

  if (!labelPreflight.ok) {
    return emptyReport({
      success: false,
      message: labelPreflight.message,
      timestamp,
      config,
      sinceDate,
      briefingDate,
      gmail: {
        oauth: "ok",
        labelVisible: false,
      },
    });
  }

  const db = dependencies.db ?? createSupabaseServiceRoleClient();

  if (!db) {
    return emptyReport({
      success: false,
      message: "Dry-run report cannot preview promotion candidates because Supabase service-role env is not configured.",
      timestamp,
      config,
      sinceDate,
      briefingDate,
      gmail: {
        oauth: "ok",
        labelVisible: true,
        labelMessageTotal: labelPreflight.label.messagesTotal,
      },
    });
  }

  const refs = await fetchBootUpBenchmarkEmails(sinceDate, {
    gmailClient,
    label: config.label,
    maxResults: config.maxEmailsPerRun,
  });
  const parsedEmails: ParsedEmailReport[] = [];
  let failedEmailCount = 0;

  for (const ref of refs) {
    try {
      const rawMessage = await gmailClient.getRawMessage(ref.id);
      const email = parseRawNewsletterEmail(rawMessage.raw, {
        internalDate: rawMessage.internalDate,
      });
      const stories = parseNewsletterStories({
        sender: email.sender,
        subject: email.subject,
        rawContent: email.contentText,
      });

      parsedEmails.push({
        sender: email.sender || "Unknown sender",
        subject: email.subject || null,
        receivedAt: email.receivedAt,
        stories,
      });
    } catch {
      failedEmailCount += 1;
    }
  }

  const stories = parsedEmails.flatMap((email) => email.stories);
  const storySummary = summarizeStories(parsedEmails);
  const promotionPreviews = await previewNewsletterStoryPromotions({
    db,
    briefingDate,
    stories: stories.map((story) => ({
      headline: story.headline,
      sourceUrl: story.sourceUrl,
      sourceDomain: story.sourceDomain,
      category: story.category,
    })),
  });
  const promotionSummary = summarizePromotionPreview(promotionPreviews);

  return {
    success: failedEmailCount === 0,
    message: "Newsletter ingestion dry-run report fetched Gmail messages and previewed promotion candidates without database writes.",
    timestamp,
    label: config.label,
    sinceDate: sinceDate.toISOString(),
    briefingDate,
    dryRun: true,
    enabled: config.enabled,
    targetEnvironment: config.targetEnvironment,
    gmail: {
      oauth: "ok",
      labelVisible: true,
      labelMessageTotal: labelPreflight.label.messagesTotal,
    },
    emailInventory: {
      total: parsedEmails.length,
      newsletters: groupBySender(parsedEmails.map((email) => ({
        sender: email.sender,
        subject: email.subject,
        receivedAt: email.receivedAt,
      }))),
    },
    storyExtraction: {
      total: stories.length,
      failedEmailCount,
      newsletters: storySummary.newsletters,
    },
    sourceUrlQuality: {
      withPrimarySourceUrl: storySummary.withPrimarySourceUrl,
      newsletterOnly: storySummary.newsletterOnly,
    },
    categoryDistribution: storySummary.categoryDistribution,
    promotionPreview: {
      eligibleCount: promotionSummary.eligibleCount,
      createCandidateCount: promotionSummary.createCandidateCount,
      linkExistingCandidateCount: promotionSummary.linkExistingCandidateCount,
      skippedCount: promotionSummary.skippedCount,
      candidates: promotionSummary.candidates,
      skipped: promotionSummary.skipped,
    },
    dedup: {
      duplicatePublicRowCount: promotionSummary.duplicatePublicRowCount,
      linkedExistingCandidateCount: promotionSummary.linkedExistingCandidateCount,
      sourceUrlOverlapCount: promotionSummary.sourceUrlOverlapCount,
      titleOverlapCount: promotionSummary.titleOverlapCount,
      overlaps: promotionSummary.overlaps,
    },
    privacy: {
      rawContentIncluded: false,
      snippetsIncluded: false,
      messageIdsIncluded: false,
    },
  };
}
