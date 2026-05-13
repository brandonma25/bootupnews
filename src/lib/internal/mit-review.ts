import {
  PROBATIONARY_RUNTIME_FEED_IDS,
  getDefaultDonorFeeds,
  getProbationaryRuntimeFeeds,
  type DonorFeed,
} from "@/adapters/donors";
import { resolveNoArgumentRuntimeSourceResolutionSnapshot } from "@/lib/pipeline/ingestion";
import { fetchFeedArticles, type FeedArticle } from "@/lib/rss";

export const MIT_INTERNAL_REVIEW_ROUTE = "/internal/mit-review";
export const MIT_REVIEW_ISSUE_URL =
  "https://github.com/brandonma25/bootupnews/issues/70";

const MIT_SOURCE_ID = "mit-technology-review";
const MAX_TOP_ITEMS = 5;

type ReviewFeedFetcher = (
  feedUrl: string,
  sourceName: string,
  requestOptions?: {
    timeoutMs?: number;
    retryCount?: number;
    headers?: HeadersInit;
  },
) => Promise<FeedArticle[]>;

export type MitReviewItem = {
  title: string;
  summarySnippet: string;
  publishedAt: string | null;
  ageHours: number | null;
  freshnessLabel: string;
};

export type MitInternalReviewData = {
  checkedAt: string;
  route: string;
  runtime: {
    resolutionMode: string;
    probationaryRuntimeSourceIds: string[];
    resolvedProbationarySourceIds: string[];
    resolvedOtherSourceIds: string[];
    mitIsOnlyProbationaryRuntimeSource: boolean;
    noArgumentResolutionObserved: boolean;
  };
  feed: {
    sourceId: string;
    sourceName: string;
    reachable: boolean;
    observedItemCount: number;
    sampleItemCount: number;
    fetchErrorSummary: string | null;
    topItems: MitReviewItem[];
  };
  review: {
    signalQualityJudgment: "mostly relevant" | "mixed" | "unavailable";
    highSignalTopItemCount: number;
    noisyTopItemCount: number;
    duplicationNoiseNotes: string;
    contributionUsefulness: string;
    baselineComparisonFeedCount: number;
    baselineFetchFailureCount: number;
  };
  issue: {
    number: 70;
    url: string;
    historyAvailableInApp: false;
    note: string;
  };
  proves: string[];
  doesNotProve: string[];
  safetyNotes: string[];
};

export async function collectMitInternalReviewData({
  now = new Date(),
  fetcher = fetchFeedArticles,
}: {
  now?: Date;
  fetcher?: ReviewFeedFetcher;
} = {}): Promise<MitInternalReviewData> {
  const sourceResolution = resolveNoArgumentRuntimeSourceResolutionSnapshot();
  const probationaryFeeds = getProbationaryRuntimeFeeds();
  const mitFeed = probationaryFeeds.find((feed) => feed.id === MIT_SOURCE_ID);

  if (!mitFeed) {
    throw new Error("MIT Technology Review is not present in the probationary runtime feed set.");
  }

  const mitResult = await fetchReviewFeed(fetcher, mitFeed, now);
  const topItems = mitResult.items.slice(0, Math.min(mitFeed.fetch.maxItems ?? MAX_TOP_ITEMS, MAX_TOP_ITEMS));
  const defaultFeeds = getDefaultDonorFeeds();
  const baselineResults = await Promise.all(
    defaultFeeds.map((feed) => fetchReviewFeed(fetcher, feed, now)),
  );
  const baselineItems = baselineResults.flatMap((result, index) =>
    result.items.slice(0, defaultFeeds[index]?.fetch.maxItems ?? MAX_TOP_ITEMS),
  );
  const baselineFetchFailureCount = baselineResults.filter((result) => !result.reachable).length;
  const signal = classifySignal(topItems);
  const mitOnly =
    sourceResolution.probationary_runtime_source_ids.length === 1 &&
    sourceResolution.probationary_runtime_source_ids[0] === MIT_SOURCE_ID &&
    PROBATIONARY_RUNTIME_FEED_IDS.length === 1 &&
    PROBATIONARY_RUNTIME_FEED_IDS[0] === MIT_SOURCE_ID;
  const resolvedMitOnly =
    sourceResolution.resolved_probationary_source_ids.length === 1 &&
    sourceResolution.resolved_probationary_source_ids[0] === MIT_SOURCE_ID;

  return {
    checkedAt: now.toISOString(),
    route: MIT_INTERNAL_REVIEW_ROUTE,
    runtime: {
      resolutionMode: sourceResolution.resolution_mode,
      probationaryRuntimeSourceIds: sourceResolution.probationary_runtime_source_ids,
      resolvedProbationarySourceIds: sourceResolution.resolved_probationary_source_ids,
      resolvedOtherSourceIds: sourceResolution.resolved_other_source_ids,
      mitIsOnlyProbationaryRuntimeSource: mitOnly && resolvedMitOnly,
      noArgumentResolutionObserved:
        sourceResolution.resolution_mode === "no_argument_runtime" && resolvedMitOnly,
    },
    feed: {
      sourceId: mitFeed.id,
      sourceName: mitFeed.source,
      reachable: mitResult.reachable,
      observedItemCount: mitResult.observedItemCount,
      sampleItemCount: topItems.length,
      fetchErrorSummary: mitResult.errorSummary,
      topItems,
    },
    review: {
      signalQualityJudgment: signal.judgment,
      highSignalTopItemCount: signal.highSignalCount,
      noisyTopItemCount: signal.noisyCount,
      duplicationNoiseNotes: buildDuplicationNote(
        topItems,
        baselineItems,
        baselineFetchFailureCount,
        signal.noisyCount,
      ),
      contributionUsefulness: buildContributionUsefulness(mitResult.reachable, topItems, signal.judgment),
      baselineComparisonFeedCount: defaultFeeds.length,
      baselineFetchFailureCount,
    },
    issue: {
      number: 70,
      url: MIT_REVIEW_ISSUE_URL,
      historyAvailableInApp: false,
      note:
        "Issue #70 remains the durable multi-day review log. This app route does not fetch issue comments because no server-side GitHub history reader is configured.",
    },
    proves: [
      "The current build can resolve the governed no-argument runtime source set.",
      "MIT Technology Review is the only configured and resolved probationary runtime source when the source-resolution snapshot says so.",
      "The current request can show a sanitized live MIT sample when the feed is reachable.",
    ],
    doesNotProve: [
      "It does not prove MIT contributed to a ranked dashboard card or changed public MVP output.",
      "It does not establish a multi-day quality trend; Issue #70 remains the history source.",
      "It does not activate, deactivate, promote, remove, or boost any source.",
    ],
    safetyNotes: [
      "The page intentionally omits feed URLs, article URLs, headers, cookies, tokens, emails, user IDs, and registry dumps.",
      "The route is internal and noindexed; unauthenticated requests receive no review evidence.",
      "The sample is current-request evidence only, so reviewers should compare it with Issue #70 before making source-policy decisions.",
    ],
  };
}

async function fetchReviewFeed(fetcher: ReviewFeedFetcher, feed: DonorFeed, now: Date) {
  try {
    const articles = await fetcher(feed.fetch.feedUrl, feed.source, {
      timeoutMs: feed.fetch.timeoutMs,
      retryCount: feed.fetch.retryCount,
      headers: {
        "User-Agent": "daily-intelligence-internal-mit-review/1.0",
      },
    });

    return {
      reachable: true,
      observedItemCount: articles.length,
      errorSummary: null,
      items: articles.map((article) => toReviewItem(article, now)),
    };
  } catch (error) {
    return {
      reachable: false,
      observedItemCount: 0,
      errorSummary: sanitizeError(error),
      items: [],
    };
  }
}

function toReviewItem(article: FeedArticle, now: Date): MitReviewItem {
  const publishedAt = normalizePublishedAt(article.publishedAt);
  const ageHours = publishedAt ? getAgeHours(publishedAt, now) : null;

  return {
    title: sanitizePublicText(article.title, 180) || "Untitled item",
    summarySnippet: sanitizePublicText(article.summaryText || article.contentText || "", 220),
    publishedAt,
    ageHours,
    freshnessLabel: formatFreshnessLabel(ageHours),
  };
}

function normalizePublishedAt(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function getAgeHours(publishedAt: string, now: Date) {
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return null;

  return Number(((now.getTime() - date.getTime()) / 36e5).toFixed(1));
}

function formatFreshnessLabel(ageHours: number | null) {
  if (ageHours === null) return "unknown published time";
  if (ageHours < -0.1) return "future timestamp";
  if (ageHours < 1) return "less than 1 hour old";
  if (ageHours < 24) return `${ageHours.toFixed(1)} hours old`;

  const ageDays = ageHours / 24;
  return `${ageDays.toFixed(1)} days old`;
}

function sanitizeError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);

  return sanitizePublicText(raw, 240)
    .replace(/feedUrl/gi, "feed URL")
    .replace(
      /authorization|bearer|headers?|cookies?|tokens?|secrets?|passwords?|api[_-]?keys?|user[_-]?ids?|emails?|session/gi,
      "[redacted]",
    )
    .replace(/\b(?:sk|pk|rk)-[A-Za-z0-9_-]{8,}\b/g, "[redacted]");
}

function sanitizePublicText(value: string, maxLength: number) {
  return String(value ?? "")
    .replace(/https?:\/\/\S+/gi, "[link]")
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[email]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function classifySignal(items: MitReviewItem[]) {
  const highSignalPatterns = [
    /\bai\b/i,
    /artificial intelligence/i,
    /robot/i,
    /cyber/i,
    /chip/i,
    /semiconductor/i,
    /climate/i,
    /energy/i,
    /science/i,
    /technology/i,
    /policy/i,
    /security/i,
  ];
  const noisyPatterns = [
    /sponsored/i,
    /alumni/i,
    /quiz/i,
    /auction/i,
    /celebrity/i,
    /sports/i,
    /recipe/i,
  ];
  const highSignalCount = items.filter((item) =>
    highSignalPatterns.some((pattern) => pattern.test(`${item.title} ${item.summarySnippet}`)),
  ).length;
  const noisyCount = items.filter((item) =>
    noisyPatterns.some((pattern) => pattern.test(`${item.title} ${item.summarySnippet}`)),
  ).length;

  if (items.length === 0) {
    return {
      judgment: "unavailable" as const,
      highSignalCount,
      noisyCount,
    };
  }

  if (highSignalCount >= 3 && noisyCount <= 1) {
    return {
      judgment: "mostly relevant" as const,
      highSignalCount,
      noisyCount,
    };
  }

  return {
    judgment: "mixed" as const,
    highSignalCount,
    noisyCount,
  };
}

function tokenSet(text: string) {
  const stopWords = new Set(
    "the a an and or of to in for on with from by is are was were be been as at that this it its into how why what who will can could should would has have had not but about new old latest live news world global".split(
      " ",
    ),
  );

  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !stopWords.has(token)),
  );
}

function jaccard(left: string, right: string) {
  const leftSet = tokenSet(left);
  const rightSet = tokenSet(right);
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;

  return union ? intersection / union : 0;
}

function buildDuplicationNote(
  mitItems: MitReviewItem[],
  baselineItems: MitReviewItem[],
  baselineFetchFailureCount: number,
  noisyCount: number,
) {
  if (mitItems.length === 0) {
    return "No MIT items were observed, so duplication and noise pressure could not be assessed.";
  }

  if (baselineItems.length === 0) {
    return "Default-feed comparison is unavailable for this request; duplication judgment is limited.";
  }

  const overlapCount = mitItems.filter((mitItem) => {
    const mitText = `${mitItem.title} ${mitItem.summarySnippet}`;
    const nearestScore = Math.max(
      ...baselineItems.map((baselineItem) =>
        jaccard(mitText, `${baselineItem.title} ${baselineItem.summarySnippet}`),
      ),
    );

    return nearestScore >= 0.2;
  }).length;
  const failureNote =
    baselineFetchFailureCount > 0
      ? ` ${baselineFetchFailureCount} default comparison feed(s) were unreachable, so this is partial evidence.`
      : "";
  const noiseNote =
    noisyCount > 0
      ? ` Rule-based noise flags in top MIT items: ${noisyCount}.`
      : " No rule-based noise flags in top MIT items.";

  if (overlapCount > 0) {
    return `Possible duplicate pressure: ${overlapCount} top MIT item(s) had moderate title/snippet overlap with fetched default feeds.${failureNote}${noiseNote}`;
  }

  return `No obvious title/snippet duplication against fetched default feeds.${failureNote}${noiseNote}`;
}

function buildContributionUsefulness(
  feedReachable: boolean,
  topItems: MitReviewItem[],
  signalQualityJudgment: MitInternalReviewData["review"]["signalQualityJudgment"],
) {
  if (!feedReachable) {
    return "not useful in this sample because the MIT feed was not reachable";
  }

  if (topItems.length === 0) {
    return "not useful in this sample because no MIT items were observed";
  }

  if (signalQualityJudgment === "mostly relevant") {
    return "potentially useful; top MIT items include multiple technology or policy-relevant signals";
  }

  return "uncertain; MIT is contributing items, but automatic signal judgment remains conservative";
}
