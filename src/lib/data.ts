import { createHash } from "crypto";
import { formatISO } from "date-fns";

import { demoDashboardData, demoHistory, demoSources, demoTopics } from "@/lib/demo-data";
import { assembleExplanationPacket } from "@/lib/explanation-support";
import { isAiConfigured } from "@/lib/env";
import { buildEventIntelligence } from "@/lib/event-intelligence";
import {
  classifyHomepageCategory,
  countSourcesByHomepageCategory,
} from "@/lib/homepage-taxonomy";
import { logServerEvent } from "@/lib/observability";
import { runClusterFirstPipeline } from "@/lib/pipeline";
import { selectRelatedCoverage } from "@/lib/related-coverage";
import {
  compareBriefingItemsByRanking,
  rankNewsClusters,
} from "@/lib/ranking";
import { fetchFeedArticles, type FeedArticle } from "@/lib/rss";
import {
  applySignalFiltering,
  type EventType,
  type FilterDecision,
  type HeadlineQuality,
  type SourceTier,
} from "@/lib/signal-filtering";
import { summarizeCluster } from "@/lib/summarizer";
import { withServerFallback } from "@/lib/server-safety";
import { createSupabaseServerClient, safeGetUser } from "@/lib/supabase/server";
import { buildTimelineGroups } from "@/lib/timeline-builder";
import { matchTopicsForArticle } from "@/lib/topic-matching";
import type {
  BriefingItem,
  DailyBriefing,
  DashboardData,
  RelatedArticle,
  Source,
  Topic,
  ViewerAccount,
} from "@/lib/types";
import {
  buildTrustLayerPresentation,
  generateWhyThisMatters,
  isUsableWhyItMattersText,
} from "@/lib/why-it-matters";

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;

type StoredArticle = {
  id: string;
  title: string;
  summary_text: string | null;
  published_at: string | null;
  url: string;
  source_id: string | null;
  event_id?: string | null;
  source_tier?: SourceTier | null;
  headline_quality?: HeadlineQuality | null;
  event_type?: EventType | null;
  filter_decision?: FilterDecision | null;
  filter_reasons?: string[] | null;
};

type StoredArticleTopic = {
  article_id: string;
  topic_id: string;
  matched_keywords: string[] | null;
  match_score: number | null;
};

type StoredEvent = {
  id: string;
  topic_id: string | null;
  title: string;
  summary: string;
  why_it_matters: string;
  created_at: string;
};

type EventSeedArticle = StoredArticle & {
  topicId: string;
  topicName: string;
  sourceName: string;
  matchedKeywords: string[];
  matchScore: number;
  sourceTier: SourceTier;
  headlineQuality: HeadlineQuality;
  eventType: EventType;
  filterDecision: FilterDecision;
  filterReasons: string[];
};

type EventCluster = {
  representative: EventSeedArticle;
  sources: EventSeedArticle[];
};

type SourceFetchAttempt = {
  label: string;
  feedUrl: string;
  kind: "primary" | "fallback";
  timeoutMs?: number;
  retryCount?: number;
  maxAgeHours?: number;
};

type SourceFetchFailure = SourceFetchAttempt & {
  errorMessage: string;
};

type SourceFetchResult = {
  source: Source;
  articles: FeedArticle[];
  failures: SourceFetchFailure[];
  usedFallback: boolean;
  successfulAttempt?: SourceFetchAttempt;
};

type IngestionRunSummary = {
  activeSourceCount: number;
  successfulSourceCount: number;
  failedSourceCount: number;
  fallbackSourceCount: number;
  degradedSourceNames: string[];
};

type DashboardDataPath = "public_pipeline" | "personalized_query" | "personalized_fallback_to_public";

const PIPELINE_TOPIC_ALIASES: Record<"tech" | "finance" | "politics", string[]> = {
  tech: ["tech", "technology", "ai", "software", "cybersecurity"],
  finance: ["finance", "markets", "macro", "business", "economy"],
  politics: ["politics", "policy", "government", "geopolitics", "world"],
};

type BriefingSummaryFields = Pick<
  BriefingItem,
  "title" | "whatHappened" | "keyPoints" | "whyItMatters" | "estimatedMinutes"
>;

const LLM_SUMMARY_TIMEOUT_MS = 7000;

function createEmptyBriefing(): DailyBriefing {
  return {
    id: `generated-empty-${Date.now()}`,
    briefingDate: formatISO(new Date()),
    title: "Today's Briefing",
    intro: "No clustered events yet for your current topics. Try adjusting keywords or refreshing your briefing.",
    readingWindow: "0 minutes",
    items: [],
  };
}

type RequestAuthState = {
  route: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: Awaited<ReturnType<typeof safeGetUser>>["user"];
  sessionCookiePresent: boolean;
  viewer: ViewerAccount | null;
};

function buildViewerAccount(user: Awaited<ReturnType<typeof safeGetUser>>["user"]): ViewerAccount | null {
  if (!user?.email) {
    return null;
  }

  const localName = user.email.split("@")[0] ?? "Reader";
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    localName
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  const initials = (displayName || user.email)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);

  return {
    id: user.id,
    email: user.email,
    displayName: displayName || user.email,
    initials: initials || user.email.charAt(0).toUpperCase(),
  };
}

export async function getRequestAuthState(route: string): Promise<RequestAuthState> {
  const authState = await safeGetUser(route);

  return {
    route,
    ...authState,
    viewer: buildViewerAccount(authState.user),
  };
}

export async function getViewerAccount(
  route = "/",
  authState?: RequestAuthState,
): Promise<ViewerAccount | null> {
  const resolvedAuthState = authState ?? (await getRequestAuthState(route));
  const { viewer, sessionCookiePresent } = resolvedAuthState;

  if (!viewer) {
    if (sessionCookiePresent) {
      logServerEvent("warn", "Viewer lookup fell back to guest mode", {
        route: resolvedAuthState.route,
        sessionCookiePresent,
      });
    }
    return null;
  }

  return viewer;
}

export async function getDashboardData(
  route = "/dashboard",
  authState?: RequestAuthState,
): Promise<DashboardData> {
  const resolvedAuthState = authState ?? (await getRequestAuthState(route));
  const { supabase, user, sessionCookiePresent } = resolvedAuthState;

  logServerEvent("info", "Dashboard data request received", {
    route: resolvedAuthState.route,
    sessionExists: Boolean(user),
    sessionCookiePresent,
  });

  if (!supabase || !user) {
    if (sessionCookiePresent) {
      logServerEvent("warn", "Dashboard SSR fell back to public mode", {
        route: resolvedAuthState.route,
        sessionCookiePresent,
      });
    }
    return getPipelineBackedDashboardData({
      route: resolvedAuthState.route,
      path: "public_pipeline",
      mode: "public",
      sessionExists: false,
    });
  }

  const dashboardQueryResults = await withServerFallback(
    "dashboard queries",
    async () =>
      Promise.all([
        supabase
          .from("topics")
          .select("id, user_id, name, description, color, keywords, exclude_keywords, created_at")
          .eq("user_id", user.id)
          .order("name"),
        supabase
          .from("sources")
          .select("id, user_id, name, feed_url, homepage_url, topic_id, status, created_at, topics(name)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]),
    null,
    { route: resolvedAuthState.route, userId: user.id },
  );

  if (!dashboardQueryResults) {
    logServerEvent("warn", "Dashboard data degraded to public fallback", {
      route: resolvedAuthState.route,
      userId: user.id,
      reason: "query bundle failed",
    });
    return getPipelineBackedDashboardData({
      route: resolvedAuthState.route,
      path: "personalized_fallback_to_public",
      mode: "live",
      sessionExists: true,
      userId: user.id,
      fallbackReason: "query bundle failed",
    });
  }

  const [topicsResult, sourcesResult] = dashboardQueryResults;

  if (topicsResult.error || sourcesResult.error) {
    logServerEvent("warn", "Dashboard data degraded to public fallback", {
      route: resolvedAuthState.route,
      userId: user.id,
      topicsError: topicsResult.error?.message,
      sourcesError: sourcesResult.error?.message,
    });
    return getPipelineBackedDashboardData({
      route: resolvedAuthState.route,
      path: "personalized_fallback_to_public",
      mode: "live",
      sessionExists: true,
      userId: user.id,
      fallbackReason: "user-scoped query error",
    });
  }

  const topics: Topic[] =
    topicsResult.data?.map((topic) => ({
      id: topic.id,
      userId: topic.user_id,
      name: topic.name,
      description: topic.description,
      color: topic.color,
      keywords: (topic.keywords as string[] | null | undefined) ?? [],
      excludeKeywords: (topic.exclude_keywords as string[] | null | undefined) ?? [],
      createdAt: topic.created_at,
    })) ?? [];

  const sources: Source[] =
    sourcesResult.data?.map((source) => ({
      id: source.id,
      userId: source.user_id,
      name: source.name,
      feedUrl: source.feed_url,
      homepageUrl: source.homepage_url,
      topicId: source.topic_id,
      topicName: Array.isArray(source.topics) ? source.topics[0]?.name : undefined,
      status: source.status,
      createdAt: source.created_at,
    })) ?? [];

  logServerEvent("info", "Dashboard personalized query resolved", {
    route: resolvedAuthState.route,
    path: "personalized_query" satisfies DashboardDataPath,
    sessionExists: true,
    userId: user.id,
    topicCount: topics.length,
    sourceCount: sources.length,
    activeSourceCount: sources.filter((source) => source.status === "active").length,
  });

  const ingestionSummary = await persistRawArticles(
    supabase,
    user.id,
    sources,
    resolvedAuthState.route,
  );
  await syncArticleSignalFilters(supabase, user.id, sources, resolvedAuthState.route);
  await syncTopicMatches(supabase, user.id, topics);
  await syncEventClusters(supabase, user.id, topics, sources);

  const briefing = await buildMatchedBriefing(supabase, user.id, topics, sources);
  const shouldFallbackToPipeline =
    topics.length === 0 ||
    sources.filter((source) => source.status === "active").length === 0 ||
    briefing.items.length === 0;

  if (shouldFallbackToPipeline) {
    const fallbackReason =
      topics.length === 0
        ? "no personalized topics"
        : sources.filter((source) => source.status === "active").length === 0
          ? "no active personalized sources"
          : "personalized briefing returned no items";

    logServerEvent("warn", "Signed-in dashboard fell back to pipeline briefing", {
      route: resolvedAuthState.route,
      path: "personalized_fallback_to_public" satisfies DashboardDataPath,
      sessionExists: true,
      userId: user.id,
      topicCount: topics.length,
      sourceCount: sources.length,
      activeSourceCount: sources.filter((source) => source.status === "active").length,
      personalizedItemsCount: briefing.items.length,
      fallbackReason,
    });

    return getPipelineBackedDashboardData({
      route: resolvedAuthState.route,
      path: "personalized_fallback_to_public",
      mode: "live",
      sessionExists: true,
      userId: user.id,
      topics,
      sources,
      fallbackReason,
    });
  }

  const homepageDiagnostics = await buildHomepageDiagnostics(
    supabase,
    user.id,
    sources,
    ingestionSummary,
  );

  return {
    mode: "live",
    topics,
    sources,
    briefing,
    homepageDiagnostics,
  };
}

export async function getDashboardPageState(route: string): Promise<{
  data: DashboardData;
  viewer: ViewerAccount | null;
}> {
  const authState = await getRequestAuthState(route);

  const [data, viewer] = await Promise.all([
    getDashboardData(route, authState),
    getViewerAccount(route, authState),
  ]);

  return {
    data,
    viewer,
  };
}

async function getPipelineBackedDashboardData(input: {
  route: string;
  path: DashboardDataPath;
  mode: DashboardData["mode"];
  sessionExists: boolean;
  userId?: string;
  topics?: Topic[];
  sources?: Source[];
  fallbackReason?: string;
}): Promise<DashboardData> {
  const fallbackTopics = input.topics?.length ? input.topics : demoTopics;
  const fallbackSources = input.sources?.length ? input.sources : demoSources;
  const { briefing, pipelineRun } = await generateDailyBriefing(fallbackTopics, fallbackSources);
  const explanationModes = briefing.items.reduce<Record<string, number>>((counts, item) => {
    const mode = item.explanationPacket?.explanation_mode ?? "missing";
    counts[mode] = (counts[mode] ?? 0) + 1;
    return counts;
  }, {});
  const enrichmentStatuses = briefing.items.reduce<Record<string, number>>((counts, item) => {
    const status = item.trustDebug?.enrichment.status ?? "missing";
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
  const connectionModes = briefing.items.reduce<Record<string, number>>((counts, item) => {
    const mode = item.explanationPacket?.connection_layer?.connection_mode ?? "missing";
    counts[mode] = (counts[mode] ?? 0) + 1;
    return counts;
  }, {});
  const connectionStatuses = briefing.items.reduce<Record<string, number>>((counts, item) => {
    const status = item.trustDebug?.connection.status ?? "missing";
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});

  logServerEvent("info", "Dashboard pipeline path resolved", {
    route: input.route,
    path: input.path,
    sessionExists: input.sessionExists,
    userId: input.userId,
    fallbackReason: input.fallbackReason,
    topicCount: fallbackTopics.length,
    sourceCount: fallbackSources.length,
    generatedItemsCount: briefing.items.length,
    pipelineClusterCount: pipelineRun.num_clusters,
    explanationModes,
    enrichmentStatuses,
    connectionModes,
    connectionStatuses,
  });

  return {
    mode: input.mode,
    briefing,
    topics: fallbackTopics,
    sources: fallbackSources,
    homepageDiagnostics: {
      totalArticlesFetched: pipelineRun.num_raw_items,
      totalCandidateEvents: pipelineRun.num_clusters,
      lastSuccessfulFetchTime: pipelineRun.timestamp,
      lastRankingRunTime: pipelineRun.timestamp,
      failedSourceCount: pipelineRun.feed_failures.length,
      fallbackSourceCount: pipelineRun.used_seed_fallback ? 1 : 0,
      degradedSourceNames: pipelineRun.feed_failures.map((failure) => failure.source),
      sourceCountsByCategory: countSourcesByHomepageCategory(fallbackSources),
    },
  };
}

export async function getHistory(
  route = "/history",
  authState?: RequestAuthState,
) {
  const resolvedAuthState = authState ?? (await getRequestAuthState(route));
  const { supabase, user, sessionCookiePresent } = resolvedAuthState;
  if (!supabase || !user) {
    if (sessionCookiePresent) {
      logServerEvent("warn", "History SSR fell back to demo history", {
        route: resolvedAuthState.route,
        sessionCookiePresent,
      });
    }
    return demoHistory;
  }

  const historyResult = await withServerFallback(
    "history query",
    async () =>
      supabase
        .from("daily_briefings")
        .select("id, briefing_date, title, intro, reading_window, briefing_items(id, topic_id, topic_name, title, what_happened, key_points, why_it_matters, sources, estimated_minutes, priority, is_read)")
        .eq("user_id", user.id)
        .order("briefing_date", { ascending: false })
        .limit(14),
    null,
    { route: resolvedAuthState.route, userId: user.id },
  );

  if (!historyResult || historyResult.error) {
    logServerEvent("warn", "History data degraded to demo history", {
      route: resolvedAuthState.route,
      userId: user.id,
      errorMessage: historyResult?.error?.message ?? "history query failed",
    });
    return demoHistory;
  }

  const { data } = historyResult;

  if (!data?.length) return demoHistory;

  return data.map(
    (briefing): DailyBriefing => ({
      id: briefing.id,
      briefingDate: briefing.briefing_date,
      title: briefing.title,
      intro: briefing.intro,
      items:
        briefing.briefing_items?.map((item) => ({
          id: item.id,
          topicId: item.topic_id,
          topicName: item.topic_name,
          title: item.title,
          whatHappened: item.what_happened,
          keyPoints: item.key_points as [string, string, string],
          whyItMatters: item.why_it_matters,
          sources: (item.sources as Array<{ title: string; url: string }>) ?? [],
          sourceCount: ((item.sources as Array<{ title: string; url: string }>) ?? []).length,
          estimatedMinutes: item.estimated_minutes,
          read: item.is_read,
          priority: item.priority,
          matchedKeywords: extractMatchedKeywords(item.key_points as string[]),
          importanceScore: undefined,
          importanceLabel: undefined,
          rankingSignals: [],
        })) ?? [],
      readingWindow: deriveReadingWindow(
        briefing.briefing_items?.map((item) => item.estimated_minutes) ?? [],
        briefing.reading_window,
      ),
    }),
  );
}

export async function getHistoryPageState(route = "/history") {
  const authState = await getRequestAuthState(route);

  const [history, viewer] = await Promise.all([
    getHistory(route, authState),
    getViewerAccount(route, authState),
  ]);

  return {
    history,
    viewer,
  };
}

export async function generateDailyBriefing(
  topics: Topic[] = demoTopics,
  sources: Source[] = demoSources,
): Promise<{ briefing: DailyBriefing; pipelineRun: Awaited<ReturnType<typeof runClusterFirstPipeline>>["run"] }> {
  const { run, ranked_clusters } = await runClusterFirstPipeline({ sources });
  const topicFallback = topics[0] ?? demoTopics[0];

  const candidateItems: BriefingItem[] = ranked_clusters.map(({ cluster, ranked }) => {
    const feedArticles = cluster.articles.map((article) => ({
      title: article.title,
      url: article.url,
      summaryText: article.content,
      contentText: article.content,
      sourceName: article.source,
      publishedAt: article.published_at,
    }));
    const provisionalTopic = resolvePipelineTopic(topics, cluster, topicFallback);
    const intelligence = buildEventIntelligence(feedArticles, {
      topicName: provisionalTopic.name,
      matchedKeywords: cluster.topic_keywords,
      createdAt: cluster.representative_article.published_at,
    });
    const topic = resolvePipelineTopic(topics, cluster, topicFallback, intelligence);
    const sourceCount = new Set(cluster.articles.map((article) => article.source)).size;
    const rankingSignals = [intelligence.rankingReason];
    const trustLayer = buildTrustLayerPresentation(intelligence, {
      title: intelligence.title,
      topicName: topic.name,
      sourceCount,
      rankingSignals,
    });
    const { packet, trustDebug } = assembleExplanationPacket({
      title: intelligence.title,
      topicName: topic.name,
      intelligence,
      sourceNames: cluster.articles.map((article) => article.source),
      sourceCount,
      whyItMatters: trustLayer.body,
      rankingExplanation: ranked.ranking_debug.explanation,
      rankingSignals,
      rankingDebug: ranked.ranking_debug,
      cluster,
    });
    const relatedArticles = cluster.articles.slice(0, 4).map((article, articleIndex) => ({
      title: article.title,
      url: article.url,
      sourceName: article.source,
      note: articleIndex === 0 ? "Lead coverage" : "Corroborating coverage",
    }));
    const corroborationWindow = getClusterCorroborationWindow(cluster.articles.map((article) => article.published_at));

    return {
      id: `generated-${cluster.cluster_id}`,
      topicId: topic.id,
      topicName: topic.name,
      title: intelligence.title,
      whatHappened: packet.what_happened,
      keyPoints: [
        `${cluster.cluster_size} article${cluster.cluster_size === 1 ? "" : "s"} from ${sourceCount} ${sourceCount === 1 ? "source" : "sources"} are covering the same development.`,
        `Coverage lined up ${corroborationWindow} around the representative report.`,
        packet.what_to_watch,
      ],
      whyItMatters: packet.why_it_matters,
      sources: relatedArticles.map((article) => ({
        title: article.sourceName,
        url: article.url,
      })),
      relatedArticles,
      sourceCount,
      estimatedMinutes: Math.min(6, Math.max(3, cluster.cluster_size + 1)),
      read: false,
      priority: "normal" as const,
      matchedKeywords: cluster.topic_keywords,
      matchScore: ranked.score,
      publishedAt: cluster.representative_article.published_at,
      importanceScore: ranked.score,
      importanceLabel: ranked.score >= 80 ? "Critical" : ranked.score >= 65 ? "High" : "Watch",
      rankingSignals: [
        packet.why_this_ranks_here,
        buildPublicRankingSignal(cluster.cluster_size, sourceCount, intelligence),
        `Recent coverage and source agreement kept this event near the top of the briefing.`,
        `Confidence ${packet.confidence}.`,
      ],
      eventIntelligence: intelligence,
      explanationPacket: packet,
      trustDebug,
      signalRole: packet.signal_role,
    };
  });
  const items = selectPublicBriefingItems(candidateItems).map((item, index) => ({
    ...item,
    priority: index < 5 ? ("top" as const) : ("normal" as const),
  }));

  const briefing =
    items.length > 0
      ? {
          id: `generated-${Date.now()}`,
          briefingDate: formatISO(new Date()),
          title: "Daily Executive Briefing",
          intro: "A deterministic scan of the strongest multi-source news clusters moving right now.",
          readingWindow: `${items.reduce((sum, item) => sum + item.estimatedMinutes, 0)} minutes`,
          items,
        }
      : topics === demoTopics && sources === demoSources
        ? demoDashboardData.briefing
        : createEmptyBriefing();

  return {
    briefing,
    pipelineRun: run,
  };
}

function resolvePipelineTopic(
  topics: Topic[],
  cluster: Awaited<ReturnType<typeof runClusterFirstPipeline>>["ranked_clusters"][number]["cluster"],
  fallbackTopic: Topic,
  intelligence?: ReturnType<typeof buildEventIntelligence>,
) {
  const topicByName = new Map(topics.map((topic) => [topic.name.toLowerCase(), topic]));
  const classification = classifyHomepageCategory({
    topicName: intelligence?.topics?.[0] ?? cluster.representative_article.source,
    title: intelligence?.title ?? cluster.representative_article.title,
    summary: intelligence?.summary ?? cluster.representative_article.content,
    matchedKeywords: cluster.topic_keywords,
    rankingSignals: intelligence ? [intelligence.rankingReason] : [],
    sourceNames: cluster.articles.map((article) => article.source),
  });
  const candidates = [
    ...(intelligence?.topics ?? []),
    ...cluster.topic_keywords,
    ...(classification.primaryCategory ? PIPELINE_TOPIC_ALIASES[classification.primaryCategory] : []),
  ].map((value) => value.toLowerCase());

  for (const candidate of candidates) {
    const directMatch = topicByName.get(candidate);
    if (directMatch) {
      return directMatch;
    }

    if (PIPELINE_TOPIC_ALIASES.tech.includes(candidate)) {
      const techTopic = topicByName.get("tech");
      if (techTopic) return techTopic;
    }

    if (PIPELINE_TOPIC_ALIASES.finance.includes(candidate)) {
      const financeTopic = topicByName.get("finance");
      if (financeTopic) return financeTopic;
    }

    if (PIPELINE_TOPIC_ALIASES.politics.includes(candidate)) {
      const politicsTopic = topicByName.get("politics");
      if (politicsTopic) return politicsTopic;
    }
  }

  return fallbackTopic;
}

function selectPublicBriefingItems(items: BriefingItem[], limit = 5) {
  const sorted = items
    .slice()
    .sort((left, right) => {
      const highSignalDelta =
        Number(Boolean(right.eventIntelligence?.isHighSignal)) -
        Number(Boolean(left.eventIntelligence?.isHighSignal));
      if (highSignalDelta !== 0) {
        return highSignalDelta;
      }

      return compareBriefingItemsByRanking(left, right);
    });
  const selected: BriefingItem[] = [];
  const topicCounts = new Map<string, number>();
  const skippedForSecondPass: BriefingItem[] = [];

  for (const item of sorted) {
    const topicKey = item.topicName.toLowerCase();
    const topicCount = topicCounts.get(topicKey) ?? 0;
    const isNonSignal = item.eventIntelligence?.eventType === "non_signal";

    if (isNonSignal && selected.length < limit) {
      skippedForSecondPass.push(item);
      continue;
    }

    if (topicCount >= 2) {
      skippedForSecondPass.push(item);
      continue;
    }

    selected.push(item);
    topicCounts.set(topicKey, topicCount + 1);

    if (selected.length === limit) {
      return selected;
    }
  }

  for (const item of skippedForSecondPass) {
    if (selected.some((selectedItem) => selectedItem.id === item.id)) {
      continue;
    }

    selected.push(item);
    if (selected.length === limit) {
      break;
    }
  }

  return selected;
}

function buildPublicRankingSignal(
  clusterSize: number,
  sourceCount: number,
  intelligence: ReturnType<typeof buildEventIntelligence>,
) {
  if (sourceCount >= 3) {
    return `Ranked high because multiple credible sources converged on the same development while it was still fresh.`;
  }

  if (clusterSize >= 2) {
    return `Ranked highly because the development already has corroborating coverage and could still move the story further.`;
  }

  if (intelligence.isHighSignal) {
    return `Ranked for likely impact even though coverage is still early.`;
  }

  return `Ranked as a watch item because it is recent and potentially meaningful, but still lightly confirmed.`;
}

function getClusterCorroborationWindow(publishedAtValues: string[]) {
  const timestamps = publishedAtValues
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => right - left);

  if (timestamps.length < 2) {
    return "around the same reporting window";
  }

  const spreadHours = Math.max(0, (timestamps[0] - timestamps[timestamps.length - 1]) / (1000 * 60 * 60));

  if (spreadHours < 1) {
    return "within the same hour";
  }

  if (spreadHours < 24) {
    return `within roughly ${Math.round(spreadHours)} hours`;
  }

  return `within roughly ${Math.round(spreadHours / 24)} days`;
}

export async function syncTopicMatches(
  supabase: SupabaseServerClient,
  userId: string,
  topics: Topic[],
) {
  const articleResult = await supabase
    .from("articles")
    .select("id, title, summary_text, filter_decision")
    .eq("user_id", userId);

  if (articleResult.error) {
    logServerEvent("warn", "Topic matching article lookup failed", {
      route: "/dashboard",
      userId,
      errorMessage: articleResult.error.message,
    });
    return;
  }

  const articles = (articleResult.data ?? []).filter(
    (article) => article.filter_decision !== "reject",
  );
  if (!articles.length || !topics.length) {
    return;
  }

  const rows = articles.flatMap((article) =>
    matchTopicsForArticle(
      {
        id: article.id,
        title: article.title,
        summaryText: article.summary_text,
      },
      topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        keywords: topic.keywords,
        excludeKeywords: topic.excludeKeywords,
      })),
    ).map((match) => ({
      article_id: article.id,
      topic_id: match.topicId,
      matched_keywords: match.matchedKeywords,
      match_score: match.matchScore,
    })),
  );

  if (!rows.length) {
    logServerEvent("warn", "Topic matching preserved previous matches because recompute returned no rows", {
      route: "/dashboard",
      userId,
      articleCount: articles.length,
      topicCount: topics.length,
    });
    return;
  }

  const articleIds = articles.map((article) => article.id);

  if (articleIds.length) {
    const deleteResult = await supabase.from("article_topics").delete().in("article_id", articleIds);
    if (deleteResult.error) {
      logServerEvent("warn", "Topic matching cleanup failed", {
        route: "/dashboard",
        userId,
        errorMessage: deleteResult.error.message,
      });
      return;
    }
  }

  const insertResult = await supabase.from("article_topics").insert(rows);
  if (insertResult.error) {
    logServerEvent("warn", "Topic matching insert failed", {
      route: "/dashboard",
      userId,
      errorMessage: insertResult.error.message,
      attemptedRows: rows.length,
    });
  }
}

export async function syncEventClusters(
  supabase: SupabaseServerClient,
  userId: string,
  topics: Topic[],
  sources: Source[],
) {
  const [articleResult, matchResult] = await Promise.all([
    supabase
      .from("articles")
      .select("id, title, summary_text, published_at, url, source_id, source_tier, headline_quality, event_type, filter_decision, filter_reasons")
      .eq("user_id", userId),
    supabase
      .from("article_topics")
      .select("article_id, topic_id, matched_keywords, match_score"),
  ]);

  if (articleResult.error || matchResult.error) {
    logServerEvent("warn", "Event clustering prerequisites failed", {
      route: "/dashboard",
      userId,
      articlesError: articleResult.error?.message,
      matchesError: matchResult.error?.message,
    });
    return;
  }

  const articles = (articleResult.data ?? []) as StoredArticle[];
  const matches = (matchResult.data ?? []) as StoredArticleTopic[];
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const primaryMatches = getPrimaryMatches(matches);

  const seededArticles = articles
    .filter((article) => article.filter_decision === "pass")
    .map((article) => {
      const match = primaryMatches.get(article.id);
      const topic = match ? topicById.get(match.topic_id) : undefined;

      if (!match || !topic) {
        return null;
      }

      const sourceName =
        (article.source_id ? sourceById.get(article.source_id)?.name : undefined) ?? topic.name;

      return {
        ...article,
        topicId: topic.id,
        topicName: topic.name,
        sourceName,
        matchedKeywords: (match.matched_keywords ?? []).filter(Boolean),
        matchScore: match.match_score ?? 0,
        sourceTier: article.source_tier ?? "unknown",
        headlineQuality: article.headline_quality ?? "medium",
        eventType: article.event_type ?? "generic_commentary",
        filterDecision: article.filter_decision ?? "suppress",
        filterReasons: (article.filter_reasons ?? []).filter(Boolean),
      } satisfies EventSeedArticle;
    })
    .filter((article): article is EventSeedArticle => Boolean(article));

  if (!seededArticles.length) {
    logServerEvent("warn", "Event clustering preserved previous events because no seeded articles were available", {
      route: "/dashboard",
      userId,
      articleCount: articles.length,
      matchCount: matches.length,
      topicCount: topics.length,
    });
    return;
  }

  const clearArticleEvents = await supabase
    .from("articles")
    .update({ event_id: null })
    .eq("user_id", userId);

  if (clearArticleEvents.error) {
    logServerEvent("warn", "Event clustering could not clear article event links", {
      route: "/dashboard",
      userId,
      errorMessage: clearArticleEvents.error.message,
    });
    return;
  }

  const deleteEvents = await supabase.from("events").delete().eq("user_id", userId);

  if (deleteEvents.error) {
    logServerEvent("warn", "Event clustering could not clear previous events", {
      route: "/dashboard",
      userId,
      errorMessage: deleteEvents.error.message,
    });
    return;
  }
  const groupedByTopic = new Map<string, EventSeedArticle[]>();
  seededArticles.forEach((article) => {
    const group = groupedByTopic.get(article.topicId) ?? [];
    group.push(article);
    groupedByTopic.set(article.topicId, group);
  });

  for (const [topicId, topicArticles] of groupedByTopic.entries()) {
    const topic = topicById.get(topicId);
    if (!topic) continue;

    const clusters = clusterEventSeedArticles(topicArticles);
    const whyHistory: string[] = [];

    for (const cluster of clusters) {
      const feedArticles = cluster.sources.map(toFeedArticle);
      const intelligence = buildEventIntelligence(feedArticles, {
        topicName: topic.name,
        matchedKeywords: cluster.sources.flatMap((article) => article.matchedKeywords),
        createdAt: cluster.representative.published_at ?? undefined,
      });
      const whyItMatters = await generateWhyThisMatters(intelligence, {
        previousOutputs: whyHistory,
      });
      whyHistory.push(whyItMatters);
      const insertEvent = await supabase
        .from("events")
        .insert({
          user_id: userId,
          topic_id: topic.id,
          title: intelligence.title,
          summary: intelligence.summary,
          why_it_matters: whyItMatters,
        })
        .select("id")
        .single();

      if (insertEvent.error || !insertEvent.data?.id) {
        logServerEvent("warn", "Event insert failed during clustering", {
          route: "/dashboard",
          userId,
          topicId: topic.id,
          errorMessage: insertEvent.error?.message ?? "missing event id",
          sourceCount: cluster.sources.length,
        });
        continue;
      }

      const eventId = insertEvent.data.id;
      const articleIds = cluster.sources.map((article) => article.id);
      const updateArticles = await supabase
        .from("articles")
        .update({ event_id: eventId })
        .in("id", articleIds);

      if (updateArticles.error) {
        logServerEvent("warn", "Event-to-article assignment failed", {
          route: "/dashboard",
          userId,
          topicId: topic.id,
          eventId,
          errorMessage: updateArticles.error.message,
          articleCount: articleIds.length,
        });
      }
    }
  }
}

export async function buildMatchedBriefing(
  supabase: SupabaseServerClient,
  userId: string,
  topics: Topic[],
  sources: Source[],
): Promise<DailyBriefing> {
  if (!topics.length) {
    logServerEvent("info", "Matched briefing skipped because no personalized topics exist", {
      route: "/dashboard",
      path: "personalized_query" satisfies DashboardDataPath,
      sessionExists: true,
      userId,
      topicCount: 0,
      sourceCount: sources.length,
    });
    return createEmptyBriefing();
  }

  const [articleResult, eventResult, matchResult] = await Promise.all([
    supabase
      .from("articles")
      .select("id, title, summary_text, published_at, url, source_id, event_id, source_tier, headline_quality, event_type, filter_decision, filter_reasons")
      .eq("user_id", userId),
    supabase
      .from("events")
      .select("id, topic_id, title, summary, why_it_matters, created_at")
      .eq("user_id", userId),
    supabase
      .from("article_topics")
      .select("article_id, topic_id, matched_keywords, match_score"),
  ]);

  if (articleResult.error || eventResult.error || matchResult.error) {
    logServerEvent("warn", "Matched briefing query failed", {
      route: "/dashboard",
      userId,
      articlesError: articleResult.error?.message,
      eventsError: eventResult.error?.message,
      matchesError: matchResult.error?.message,
    });
    return createEmptyBriefing();
  }

  const articles = (articleResult.data ?? []) as StoredArticle[];
  const events = (eventResult.data ?? []) as StoredEvent[];
  const matches = (matchResult.data ?? []) as StoredArticleTopic[];
  logServerEvent("info", "Matched briefing personalized rows loaded", {
    route: "/dashboard",
    path: "personalized_query" satisfies DashboardDataPath,
    sessionExists: true,
    userId,
    personalizedArticleCount: articles.length,
    personalizedEventCount: events.length,
    personalizedMatchCount: matches.length,
    topicCount: topics.length,
    sourceCount: sources.length,
  });
  const eventById = new Map(events.map((event) => [event.id, event]));
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const primaryMatches = getPrimaryMatches(matches);
  const articlesByEvent = new Map<string, EventSeedArticle[]>();

  articles.forEach((article) => {
    if (!article.event_id) {
      return;
    }

    const match = primaryMatches.get(article.id);
    const event = eventById.get(article.event_id);
    const topic = (match ? topicById.get(match.topic_id) : undefined) ?? (event?.topic_id ? topicById.get(event.topic_id) : undefined);

    if (!topic) {
      return;
    }

    const sourceName =
      (article.source_id ? sourceById.get(article.source_id)?.name : undefined) ?? topic.name;

    const seeded: EventSeedArticle = {
      ...article,
      topicId: topic.id,
      topicName: topic.name,
      sourceName,
      matchedKeywords: (match?.matched_keywords ?? []).filter(Boolean),
      matchScore: match?.match_score ?? 0,
      sourceTier: article.source_tier ?? "unknown",
      headlineQuality: article.headline_quality ?? "medium",
      eventType: article.event_type ?? "generic_commentary",
      filterDecision: article.filter_decision ?? "suppress",
      filterReasons: (article.filter_reasons ?? []).filter(Boolean),
    };

    const bucket = articlesByEvent.get(article.event_id) ?? [];
    bucket.push(seeded);
    articlesByEvent.set(article.event_id, bucket);
  });

  const items = (await Promise.all(
    events.map(async (event) => {
      const eventArticles = (articlesByEvent.get(event.id) ?? []).sort(
        (left, right) =>
          new Date(right.published_at ?? 0).getTime() -
          new Date(left.published_at ?? 0).getTime(),
      );
      const topic = event.topic_id ? topicById.get(event.topic_id) : undefined;

      if (!topic || !eventArticles.length) {
        return null;
      }

      const feedArticles = eventArticles.map(toFeedArticle);
      const rankedCluster = rankNewsClusters(topic.name, [
        {
          representative: feedArticles[0],
          sources: feedArticles,
        },
      ])[0];
      const matchedKeywords = [...new Set(eventArticles.flatMap((article) => article.matchedKeywords))];
      const relatedArticles = buildRelatedArticles(eventArticles);
      const timeline = buildTimelineGroups(
        eventArticles.map((article) => ({
          title: article.title,
          url: article.url,
          sourceName: article.sourceName,
          summaryText: article.summary_text,
          publishedAt: article.published_at,
        })),
      );
      const sourceCount = new Set(eventArticles.map((article) => article.sourceName)).size;
      const freshest = eventArticles[0];
      const intelligence =
        rankedCluster?.eventIntelligence ??
        buildEventIntelligence(feedArticles, {
          topicName: topic.name,
          matchedKeywords,
          createdAt: event.created_at,
        });
      const trustLayer = buildTrustLayerPresentation(intelligence, {
        title: intelligence.title,
        topicName: topic.name,
        whyItMatters: event.why_it_matters,
        sourceCount,
        rankingSignals: rankedCluster?.rankingSignals,
      });
      const { packet, trustDebug } = assembleExplanationPacket({
        title: intelligence.title,
        topicName: topic.name,
        intelligence,
        sourceNames: eventArticles.map((article) => article.sourceName),
        sourceCount,
        whyItMatters: trustLayer.body,
        rankingSignals: rankedCluster?.rankingSignals,
      });
      const keyPoints = buildKeyPoints(intelligence, freshest.sourceName, freshest.published_at, matchedKeywords);
      const fallbackSummary = {
        title: intelligence.title,
        whatHappened: packet.what_happened,
        keyPoints: [
          keyPoints[0],
          keyPoints[1],
          packet.what_to_watch,
        ],
        whyItMatters: packet.why_it_matters,
        estimatedMinutes: Math.min(6, Math.max(3, Math.ceil(eventArticles.length * 1.5))),
      } satisfies BriefingSummaryFields;

      if (!intelligence.isHighSignal) {
        return null;
      }

      const summary = await resolveClusterSummary({
        topicName: topic.name,
        articles: feedArticles,
        fallback: fallbackSummary,
      });

      return {
        id: `generated-event-${event.id}`,
        topicId: topic.id,
        topicName: topic.name,
        title: summary.title,
        whatHappened: summary.whatHappened,
        keyPoints: summary.keyPoints,
        whyItMatters: summary.whyItMatters,
        sources: relatedArticles.map((article) => ({
          title: article.sourceName,
          url: article.url,
        })),
        relatedArticles,
        timeline,
        sourceCount,
        estimatedMinutes: summary.estimatedMinutes,
        read: false,
        priority: "normal" as const,
        matchedKeywords,
        matchScore: Math.max(...eventArticles.map((article) => article.matchScore), 0),
        publishedAt: freshest.published_at ?? undefined,
        importanceScore: intelligence.rankingScore,
        importanceLabel: getImportanceLabel(intelligence.rankingScore),
        rankingSignals: [
          packet.why_this_ranks_here,
          `Confidence ${intelligence.confidenceScore}/100.`,
          ...buildSignalBreakdown(intelligence),
        ],
        eventIntelligence: intelligence,
        explanationPacket: packet,
        trustDebug,
        signalRole: packet.signal_role,
      } satisfies BriefingItem;
    }),
  ))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    // Product ordering should follow the same ranking activation rules everywhere.
    .sort(compareBriefingItemsByRanking)
    .map((item, index) => ({
      ...item,
      priority: index < 5 ? ("top" as const) : ("normal" as const),
    }));

  if (!items.length) {
    logServerEvent("warn", "Matched briefing produced zero visible items", {
      route: "/dashboard",
      path: "personalized_query" satisfies DashboardDataPath,
      sessionExists: true,
      userId,
      personalizedArticleCount: articles.length,
      personalizedEventCount: events.length,
      personalizedMatchCount: matches.length,
      topicCount: topics.length,
      sourceCount: sources.length,
    });
    return createEmptyBriefing();
  }

  return {
    id: `generated-${Date.now()}`,
    briefingDate: formatISO(new Date()),
    title: "Today's Briefing",
    intro: "Related reporting is clustered into events so you can scan developments instead of isolated articles.",
    readingWindow: `${items.reduce((sum, item) => sum + item.estimatedMinutes, 0)} minutes`,
    items,
  };
}

async function resolveClusterSummary(input: {
  topicName: string;
  articles: FeedArticle[];
  fallback: BriefingSummaryFields;
  timeoutMs?: number;
}): Promise<BriefingSummaryFields> {
  if (
    !isAiConfigured ||
    !input.articles.length ||
    !input.articles.some((article) => article.title.trim() || article.summaryText.trim())
  ) {
    return input.fallback;
  }

  try {
    const summary = await withTimeout(
      summarizeCluster(input.topicName, input.articles),
      input.timeoutMs ?? LLM_SUMMARY_TIMEOUT_MS,
    );

    return {
      title: summary.headline.trim() || input.fallback.title,
      whatHappened: summary.whatHappened.trim() || input.fallback.whatHappened,
      keyPoints: normalizeSummaryKeyPoints(summary.keyPoints, input.fallback.keyPoints),
      whyItMatters: normalizeWhyItMatters(summary.whyItMatters, {
        fallback: input.fallback.whyItMatters,
        title: summary.headline.trim() || input.fallback.title,
        whatHappened: summary.whatHappened.trim() || input.fallback.whatHappened,
      }),
      estimatedMinutes: normalizeEstimatedMinutes(summary.estimatedMinutes, input.fallback.estimatedMinutes),
    };
  } catch {
    return input.fallback;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function normalizeSummaryKeyPoints(
  keyPoints: unknown,
  fallback: BriefingSummaryFields["keyPoints"],
): BriefingSummaryFields["keyPoints"] {
  if (!Array.isArray(keyPoints)) {
    return fallback;
  }

  const normalized = keyPoints
    .map((point) => (typeof point === "string" ? point.trim() : ""))
    .filter(Boolean)
    .slice(0, 3);

  if (normalized.length !== 3) {
    return fallback;
  }

  return [normalized[0], normalized[1], normalized[2]];
}

function normalizeEstimatedMinutes(value: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(6, Math.max(3, Math.round(value)));
}

function normalizeWhyItMatters(
  value: unknown,
  input: {
    fallback: string;
    title: string;
    whatHappened: string;
  },
) {
  const text = typeof value === "string" ? value.trim() : "";

  if (
    isUsableWhyItMattersText(text, {
      title: input.title,
      whatHappened: input.whatHappened,
    })
  ) {
    return text;
  }

  return input.fallback;
}

export async function persistRawArticles(
  supabase: SupabaseServerClient,
  userId: string,
  sources: Source[],
  route = "/dashboard",
) {
  const activeSources = sources.filter((source) => source.status === "active");

  if (!activeSources.length) {
    logServerEvent("info", "Skipping raw article persistence because no active sources exist", {
      route,
      userId,
    });
    return {
      activeSourceCount: 0,
      successfulSourceCount: 0,
      failedSourceCount: 0,
      fallbackSourceCount: 0,
      degradedSourceNames: [],
    } satisfies IngestionRunSummary;
  }

  const fetchedResults = await Promise.all(
    activeSources.map((source) => fetchSourceArticlesWithFallback(source)),
  );

  fetchedResults.forEach((result) => {
    if (!result.failures.length) {
      return;
    }

    const failureDetails = result.failures.map((failure, index) => ({
      failureIndex: index,
      feedLabel: failure.label,
      feedKind: failure.kind,
      feedUrl: failure.feedUrl,
      errorMessage: failure.errorMessage,
    }));

    if (result.articles.length === 0) {
      logServerEvent("warn", "Source remained unavailable after fallback attempts", {
        route,
        userId,
        sourceName: result.source.name,
        failures: failureDetails,
      });
      return;
    }

    if (result.usedFallback && result.successfulAttempt) {
      logServerEvent("info", "Fallback feed used during raw article persistence", {
        route,
        userId,
        sourceName: result.source.name,
        fallbackLabel: result.successfulAttempt.label,
        fallbackFeedUrl: result.successfulAttempt.feedUrl,
        recoveredArticleCount: result.articles.length,
        failures: failureDetails,
      });
    }
  });

  const failedSourceNames = fetchedResults
    .filter((result) => result.articles.length === 0)
    .map((result) => result.source.name);
  const fallbackSourceCount = fetchedResults.filter((result) => result.usedFallback).length;
  const fetchedArticles = fetchedResults.flatMap((result) =>
    result.articles.map((article) => {
      const canonicalUrl = canonicalizeArticleUrl(article.url);
      return {
        sourceId: result.source.id,
        sourceName: article.sourceName,
        title: article.title,
        url: canonicalUrl,
        summaryText: article.summaryText,
        contentText: article.contentText,
        publishedAt: article.publishedAt,
        dedupeKey: createArticleDedupeKey(article.title, canonicalUrl),
      };
    }),
  );

  if (!fetchedArticles.length) {
    logServerEvent("warn", "No raw articles were fetched from active sources", {
      route,
      userId,
      activeSourceCount: activeSources.length,
      failedSourceCount: failedSourceNames.length,
      degradedSourceNames: failedSourceNames,
    });
    return {
      activeSourceCount: activeSources.length,
      successfulSourceCount: 0,
      failedSourceCount: failedSourceNames.length,
      fallbackSourceCount,
      degradedSourceNames: failedSourceNames,
    } satisfies IngestionRunSummary;
  }

  const fetchedCount = fetchedArticles.length;
  console.info(
    "[ingestion] fetched_count=",
    fetchedCount,
    "failed_source_count=",
    failedSourceNames.length,
    "fallback_source_count=",
    fallbackSourceCount,
  );

  const dedupeKeys = [...new Set(fetchedArticles.map((article) => article.dedupeKey))];

  const existingResult = await supabase
    .from("articles")
    .select("dedupe_key")
    .eq("user_id", userId)
    .in("dedupe_key", dedupeKeys);

  if (existingResult.error) {
    logServerEvent("warn", "Existing raw article lookup failed", {
      route,
      userId,
      errorMessage: existingResult.error.message,
      attemptedKeys: dedupeKeys.length,
    });
    return {
      activeSourceCount: activeSources.length,
      successfulSourceCount: fetchedResults.length - failedSourceNames.length,
      failedSourceCount: failedSourceNames.length,
      fallbackSourceCount,
      degradedSourceNames: failedSourceNames,
    } satisfies IngestionRunSummary;
  }

  const existingKeys = new Set(
    (existingResult.data ?? [])
      .map((row) => row.dedupe_key)
      .filter((value): value is string => Boolean(value)),
  );

  const rowsToInsert = fetchedArticles
    .filter((article) => !existingKeys.has(article.dedupeKey))
    .map((article) => ({
      user_id: userId,
      source_id: article.sourceId,
      title: article.title,
      url: article.url,
      summary_text: article.summaryText,
      published_at: article.publishedAt,
      dedupe_key: article.dedupeKey,
    }));

  const skippedCount = fetchedCount - rowsToInsert.length;

  if (!rowsToInsert.length) {
    console.info(
      "[ingestion] inserted_count=",
      0,
      "skipped_count=",
      skippedCount,
      "failed_source_count=",
      failedSourceNames.length,
      "fallback_source_count=",
      fallbackSourceCount,
    );
    logServerEvent("info", "No new raw articles to insert after dedupe", {
      route,
      userId,
      fetchedRows: fetchedCount,
      skippedCount,
      failedSourceCount: failedSourceNames.length,
      fallbackSourceCount,
    });
    return {
      activeSourceCount: activeSources.length,
      successfulSourceCount: fetchedResults.length - failedSourceNames.length,
      failedSourceCount: failedSourceNames.length,
      fallbackSourceCount,
      degradedSourceNames: failedSourceNames,
    } satisfies IngestionRunSummary;
  }

  const insertResult = await supabase.from("articles").insert(rowsToInsert);

  if (insertResult.error) {
    logServerEvent("warn", "Raw article persistence failed", {
      route,
      userId,
      errorMessage: insertResult.error.message,
      attemptedRows: rowsToInsert.length,
      skippedCount,
      failedSourceCount: failedSourceNames.length,
      fallbackSourceCount,
    });
    return {
      activeSourceCount: activeSources.length,
      successfulSourceCount: fetchedResults.length - failedSourceNames.length,
      failedSourceCount: failedSourceNames.length,
      fallbackSourceCount,
      degradedSourceNames: failedSourceNames,
    } satisfies IngestionRunSummary;
  }

  console.info(
    "[ingestion] inserted_count=",
    rowsToInsert.length,
    "skipped_count=",
    skippedCount,
    "failed_source_count=",
    failedSourceNames.length,
    "fallback_source_count=",
    fallbackSourceCount,
  );

  logServerEvent("info", "Stored raw articles", {
    route,
    userId,
    fetchedCount,
    insertedRows: rowsToInsert.length,
    skippedCount,
    failedSourceCount: failedSourceNames.length,
    fallbackSourceCount,
    degradedSourceNames: failedSourceNames,
  });

  return {
    activeSourceCount: activeSources.length,
    successfulSourceCount: fetchedResults.length - failedSourceNames.length,
    failedSourceCount: failedSourceNames.length,
    fallbackSourceCount,
    degradedSourceNames: failedSourceNames,
  } satisfies IngestionRunSummary;
}

export async function syncArticleSignalFilters(
  supabase: SupabaseServerClient,
  userId: string,
  sources: Source[],
  route = "/dashboard",
) {
  const articleResult = await supabase
    .from("articles")
    .select("id, title, summary_text, published_at, url, source_id")
    .eq("user_id", userId);

  if (articleResult.error) {
    logServerEvent("warn", "Signal filtering article lookup failed", {
      route,
      userId,
      errorMessage: articleResult.error.message,
    });
    return;
  }

  const articles = (articleResult.data ?? []) as StoredArticle[];
  if (!articles.length) {
    return;
  }

  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const evaluations = applySignalFiltering(
    articles.map((article) => {
      const source = article.source_id ? sourceById.get(article.source_id) : undefined;

      return {
        id: article.id,
        title: article.title,
        summaryText: article.summary_text,
        url: article.url,
        publishedAt: article.published_at,
        sourceName: source?.name ?? "Unknown source",
        sourceFeedUrl: source?.feedUrl,
        sourceHomepageUrl: source?.homepageUrl,
        topicName: source?.topicName,
      };
    }),
  );

  const updateResults = await Promise.all(
    evaluations.map((evaluation) =>
      supabase
        .from("articles")
        .update({
          source_tier: evaluation.sourceTier,
          headline_quality: evaluation.headlineQuality,
          event_type: evaluation.eventType,
          filter_decision: evaluation.filterDecision,
          filter_reasons: evaluation.filterReasons,
          filter_evaluated_at: new Date().toISOString(),
        })
        .eq("id", evaluation.id),
    ),
  );

  const failedUpdates = updateResults.filter((result) => result.error);
  if (failedUpdates.length) {
    logServerEvent("warn", "Signal filtering metadata update partially failed", {
      route,
      userId,
      attemptedRows: evaluations.length,
      failedRows: failedUpdates.length,
    });
  }

  const counts = evaluations.reduce(
    (summary, evaluation) => {
      summary[evaluation.filterDecision] += 1;
      return summary;
    },
    { pass: 0, suppress: 0, reject: 0 },
  );

  logServerEvent("info", "Signal filtering updated article metadata", {
    route,
    userId,
    totalArticles: evaluations.length,
    passCount: counts.pass,
    suppressCount: counts.suppress,
    rejectCount: counts.reject,
  });
}

function getPrimaryMatches(matches: StoredArticleTopic[]) {
  const primaryMatches = new Map<string, StoredArticleTopic>();

  matches.forEach((match) => {
    const existing = primaryMatches.get(match.article_id);
    const matchScore = match.match_score ?? 0;
    const existingScore = existing?.match_score ?? 0;
    const matchKeywordCount = match.matched_keywords?.length ?? 0;
    const existingKeywordCount = existing?.matched_keywords?.length ?? 0;

    if (
      !existing ||
      matchScore > existingScore ||
      (matchScore === existingScore && matchKeywordCount > existingKeywordCount)
    ) {
      primaryMatches.set(match.article_id, match);
    }
  });

  return primaryMatches;
}

function clusterEventSeedArticles(articles: EventSeedArticle[]): EventCluster[] {
  const sortedArticles = [...articles].sort(
    (left, right) =>
      new Date(right.published_at ?? 0).getTime() - new Date(left.published_at ?? 0).getTime(),
  );
  const clusters: EventCluster[] = [];

  sortedArticles.forEach((article) => {
    const match = clusters.find((cluster) => isSameEvent(article, cluster));

    if (match) {
      match.sources.push(article);
      return;
    }

    clusters.push({
      representative: article,
      sources: [article],
    });
  });

  return clusters.sort((left, right) => {
    const sourceDelta = right.sources.length - left.sources.length;
    if (sourceDelta !== 0) return sourceDelta;

    return (
      new Date(right.representative.published_at ?? 0).getTime() -
      new Date(left.representative.published_at ?? 0).getTime()
    );
  });
}

function isSameEvent(article: EventSeedArticle, cluster: EventCluster) {
  const titleSimilarity = jaccardSimilarity(
    normalizeSignal(article.title),
    normalizeSignal(cluster.representative.title),
  );
  const keywordSimilarity = jaccardSimilarity(
    article.matchedKeywords.map(normalizeKeyword),
    cluster.sources.flatMap((source) => source.matchedKeywords.map(normalizeKeyword)),
  );

  return titleSimilarity >= 0.55 || (titleSimilarity >= 0.35 && keywordSimilarity >= 0.2);
}

function toFeedArticle(article: EventSeedArticle): FeedArticle {
  return {
    title: article.title,
    url: article.url,
    summaryText: article.summary_text?.trim() || article.title,
    contentText: article.summary_text?.trim() || article.title,
    sourceName: article.sourceName,
    publishedAt: article.published_at ?? new Date().toISOString(),
  };
}

function buildKeyPoints(
  intelligence: NonNullable<BriefingItem["eventIntelligence"]>,
  freshestSourceName: string,
  freshestPublishedAt: string | null | undefined,
  matchedKeywords: string[],
): [string, string, string] {
  const entityLabel = intelligence.keyEntities.length
    ? `Key entities: ${intelligence.keyEntities.slice(0, 3).join(", ")}.`
    : `Primary change: ${intelligence.primaryChange}.`;

  return [
    entityLabel,
    `Latest confirmation: ${freshestSourceName} on ${formatPublishedLabel(freshestPublishedAt ?? null)}.`,
    matchedKeywords.length
      ? `Matched signals: ${matchedKeywords.slice(0, 3).join(", ")}.`
      : intelligence.rankingReason,
  ];
}

function buildSignalBreakdown(intelligence: NonNullable<BriefingItem["eventIntelligence"]>) {
  return [
    `Covered by ${intelligence.signals.articleCount} ${intelligence.signals.articleCount === 1 ? "article" : "articles"}.`,
    `Seen across ${intelligence.signals.sourceDiversity} ${intelligence.signals.sourceDiversity === 1 ? "source" : "sources"}.`,
    intelligence.signals.velocityScore >= 70 ? "Rapidly developing story." : null,
  ].filter((value): value is string => Boolean(value));
}

function getImportanceLabel(score: number | undefined) {
  if ((score ?? 0) >= 80) return "Critical" as const;
  if ((score ?? 0) >= 65) return "High" as const;
  return "Watch" as const;
}

function buildRelatedArticles(articles: EventSeedArticle[]): RelatedArticle[] {
  const sorted = articles
    .slice()
    .sort(
      (left, right) =>
        new Date(right.published_at ?? 0).getTime() - new Date(left.published_at ?? 0).getTime(),
    );

  const lead = sorted[0];
  if (!lead) {
    return [];
  }

  return selectRelatedCoverage(
    {
      title: lead.title,
      url: lead.url,
      sourceName: lead.sourceName,
      summaryText: lead.summary_text,
      matchedKeywords: lead.matchedKeywords,
    },
    sorted.map((article) => ({
      title: article.title,
      url: article.url,
      sourceName: article.sourceName,
      summaryText: article.summary_text,
      matchedKeywords: article.matchedKeywords,
    })),
    4,
  );
}

async function buildHomepageDiagnostics(
  supabase: SupabaseServerClient,
  userId: string,
  sources: Source[],
  ingestionSummary?: IngestionRunSummary,
) {
  const [articleResult, eventResult] = await Promise.all([
    supabase
      .from("articles")
      .select("id, created_at")
      .eq("user_id", userId),
    supabase
      .from("events")
      .select("id, created_at")
      .eq("user_id", userId),
  ]);

  if (articleResult.error || eventResult.error) {
    logServerEvent("warn", "Homepage diagnostics query failed", {
      route: "/dashboard",
      userId,
      articlesError: articleResult.error?.message,
      eventsError: eventResult.error?.message,
    });

    return {
      totalArticlesFetched: null,
      totalCandidateEvents: null,
      failedSourceCount: ingestionSummary?.failedSourceCount ?? 0,
      fallbackSourceCount: ingestionSummary?.fallbackSourceCount ?? 0,
      degradedSourceNames: ingestionSummary?.degradedSourceNames ?? [],
      sourceCountsByCategory: countSourcesByHomepageCategory(sources),
    };
  }

  const articles = articleResult.data ?? [];
  const events = eventResult.data ?? [];

  return {
    totalArticlesFetched: articles.length,
    totalCandidateEvents: events.length,
    lastSuccessfulFetchTime: latestCreatedAt(articles.map((article) => article.created_at)),
    lastRankingRunTime: latestCreatedAt(events.map((event) => event.created_at)),
    failedSourceCount: ingestionSummary?.failedSourceCount ?? 0,
    fallbackSourceCount: ingestionSummary?.fallbackSourceCount ?? 0,
    degradedSourceNames: ingestionSummary?.degradedSourceNames ?? [],
    sourceCountsByCategory: countSourcesByHomepageCategory(sources),
  };
}

async function fetchSourceArticlesWithFallback(source: Source): Promise<SourceFetchResult> {
  const attempts = buildSourceFetchAttempts(source);
  const failures: SourceFetchFailure[] = [];

  for (const attempt of attempts) {
    try {
      const articles = filterAttemptArticles(
        await fetchFeedArticles(attempt.feedUrl, source.name, {
          timeoutMs: attempt.timeoutMs,
          retryCount: attempt.retryCount,
        }),
        attempt,
      );

      if (articles.length > 0) {
        return {
          source,
          articles,
          failures,
          usedFallback: attempt.kind === "fallback",
          successfulAttempt: attempt,
        };
      }

      failures.push({
        ...attempt,
        errorMessage: "Feed returned zero articles",
      });
    } catch (error) {
      failures.push({
        ...attempt,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    source,
    articles: [],
    failures,
    usedFallback: false,
  };
}

function buildSourceFetchAttempts(source: Source): SourceFetchAttempt[] {
  const attempts: SourceFetchAttempt[] = [
    {
      label: source.name,
      feedUrl: source.feedUrl,
      kind: "primary",
      timeoutMs: isGdeltSource(source) ? 4_500 : 8_000,
      retryCount: isGdeltSource(source) ? 0 : 1,
    },
  ];

  if (!isGdeltSource(source)) {
    return attempts;
  }

  const fallbackFeeds = getGdeltFallbackFeeds(source);
  const seen = new Set([source.feedUrl]);

  fallbackFeeds.forEach((fallback) => {
    if (seen.has(fallback.feedUrl)) {
      return;
    }

    seen.add(fallback.feedUrl);
    attempts.push({
      ...fallback,
      kind: "fallback",
    });
  });

  return attempts;
}

function isGdeltSource(source: Source) {
  return /gdelt/i.test(source.name) || /api\.gdeltproject\.org/i.test(source.feedUrl);
}

function getGdeltFallbackFeeds(source: Source) {
  const topic = (source.topicName ?? source.name).toLowerCase();

  if (/finance|market|business/.test(topic)) {
    return [
      {
        label: "Reuters Business fallback",
        feedUrl: "https://feeds.reuters.com/reuters/businessNews",
        timeoutMs: 4_500,
        retryCount: 0,
        maxAgeHours: 72,
      },
    ];
  }

  if (/politic|geopolit|world/.test(topic)) {
    return [
      {
        label: "AP Top News fallback",
        feedUrl: "https://apnews.com/hub/apf-topnews?output=rss",
        timeoutMs: 4_500,
        retryCount: 0,
        maxAgeHours: 72,
      },
    ];
  }

  return [
    {
      label: "TechCrunch fallback",
      feedUrl: "https://techcrunch.com/feed/",
      timeoutMs: 4_500,
      retryCount: 0,
      maxAgeHours: 72,
    },
  ];
}

function filterAttemptArticles(articles: FeedArticle[], attempt: SourceFetchAttempt) {
  const deduped = dedupeFeedArticles(articles);

  if (!attempt.maxAgeHours) {
    return deduped;
  }

  const freshestAllowedAt = Date.now() - attempt.maxAgeHours * 60 * 60 * 1000;
  return deduped.filter((article) => {
    const publishedAt = new Date(article.publishedAt).getTime();
    return Number.isFinite(publishedAt) && publishedAt >= freshestAllowedAt;
  });
}

function dedupeFeedArticles(articles: FeedArticle[]) {
  const seen = new Set<string>();

  return articles.filter((article) => {
    const key = canonicalizeArticleUrl(article.url).toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export const __testing__ = {
  buildSourceFetchAttempts,
  fetchSourceArticlesWithFallback,
  resolveClusterSummary,
};

function normalizeSignal(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase();
}

function jaccardSimilarity(left: string[], right: string[]) {
  const leftSet = new Set(left.filter(Boolean));
  const rightSet = new Set(right.filter(Boolean));
  const overlap = [...leftSet].filter((word) => rightSet.has(word)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : overlap / union;
}

function extractMatchedKeywords(keyPoints: string[]) {
  const matchedOn = keyPoints.find((point) => point.startsWith("Matched on:"));
  if (!matchedOn) return [];
  return matchedOn
    .replace(/^Matched on:\s*/i, "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatPublishedLabel(value: string | null) {
  if (!value) {
    return "recently";
  }

  const published = new Date(value);
  if (Number.isNaN(published.getTime())) {
    return "recently";
  }

  return published.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function latestCreatedAt(values: Array<string | null | undefined>) {
  const timestamps = values
    .map((value) => (value ? new Date(value).getTime() : Number.NaN))
    .filter((value) => Number.isFinite(value));

  if (!timestamps.length) {
    return undefined;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function canonicalizeArticleUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";

    const allowed = new URLSearchParams();
    url.searchParams.forEach((paramValue, key) => {
      const normalizedKey = key.toLowerCase();
      if (
        normalizedKey.startsWith("utm_") ||
        normalizedKey === "fbclid" ||
        normalizedKey === "gclid" ||
        normalizedKey === "mc_cid" ||
        normalizedKey === "mc_eid"
      ) {
        return;
      }
      allowed.append(key, paramValue);
    });

    const query = allowed.toString();
    url.search = query ? `?${query}` : "";
    return url.toString();
  } catch {
    return value.trim();
  }
}

function createArticleDedupeKey(title: string, url: string) {
  return createHash("sha256")
    .update(`${title.trim().toLowerCase()}::${url.trim().toLowerCase()}`)
    .digest("hex");
}

function deriveReadingWindow(estimatedMinutes: number[], fallback: string) {
  const totalMinutes = estimatedMinutes.reduce((sum, minutes) => sum + minutes, 0);
  return totalMinutes > 0 ? `${totalMinutes} minutes` : fallback;
}
