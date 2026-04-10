import { formatISO } from "date-fns";

import { demoDashboardData, demoHistory, demoSources, demoTopics } from "@/lib/demo-data";
import { logServerEvent } from "@/lib/observability";
import { rankNewsClusters } from "@/lib/ranking";
import { clusterArticles, fetchFeedArticles } from "@/lib/rss";
import { withServerFallback } from "@/lib/server-safety";
import { summarizeCluster } from "@/lib/summarizer";
import { createSupabaseServerClient, safeGetUser } from "@/lib/supabase/server";
import type { DailyBriefing, DashboardData, Source, Topic, ViewerAccount } from "@/lib/types";

export async function getViewerAccount(): Promise<ViewerAccount | null> {
  const { user, sessionCookiePresent } = await safeGetUser("/");

  if (!user?.email) {
    if (sessionCookiePresent) {
      logServerEvent("warn", "Viewer lookup fell back to guest mode", {
        route: "/",
        sessionCookiePresent,
      });
    }
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

export async function getDashboardData(): Promise<DashboardData> {
  const { supabase, user, sessionCookiePresent } = await safeGetUser("/dashboard");

  if (!supabase || !user) {
    if (sessionCookiePresent) {
      logServerEvent("warn", "Dashboard SSR fell back to public mode", {
        route: "/dashboard",
        sessionCookiePresent,
      });
    }
    return getPublicDashboardData();
  }

  const dashboardQueryResults = await withServerFallback(
    "dashboard queries",
    async () =>
      Promise.all([
        supabase
          .from("topics")
          .select("id, user_id, name, description, color, created_at")
          .eq("user_id", user.id)
          .order("name"),
        supabase
          .from("sources")
          .select("id, user_id, name, feed_url, homepage_url, topic_id, status, created_at, topics(name)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("daily_briefings")
          .select("id, briefing_date, title, intro, reading_window, briefing_items(id, topic_id, topic_name, title, what_happened, key_points, why_it_matters, sources, estimated_minutes, priority, is_read)")
          .eq("user_id", user.id)
          .order("briefing_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]),
    null,
    { route: "/dashboard", userId: user.id },
  );

  if (!dashboardQueryResults) {
    logServerEvent("warn", "Dashboard data degraded to public fallback", {
      route: "/dashboard",
      userId: user.id,
      reason: "query bundle failed",
    });
    return getPublicDashboardData();
  }

  const [topicsResult, sourcesResult, briefingsResult] = dashboardQueryResults;

  if (topicsResult.error || sourcesResult.error || briefingsResult.error) {
    logServerEvent("warn", "Dashboard data degraded to public fallback", {
      route: "/dashboard",
      userId: user.id,
      topicsError: topicsResult.error?.message,
      sourcesError: sourcesResult.error?.message,
      briefingsError: briefingsResult.error?.message,
    });
    return getPublicDashboardData();
  }

  const topics: Topic[] =
    topicsResult.data?.map((topic) => ({
      id: topic.id,
      userId: topic.user_id,
      name: topic.name,
      description: topic.description,
      color: topic.color,
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

  const latest = briefingsResult.data;

  if (!topics.length || !sources.some((source) => source.status === "active")) {
    return getPublicDashboardData();
  }

  if (!latest) {
    const generated = await generateDailyBriefing(topics, sources);
    return {
      mode: "live",
      briefing: generated,
      topics,
      sources,
    };
  }

  return {
    mode: "live",
    topics,
    sources,
    briefing: {
      id: latest.id,
      briefingDate: latest.briefing_date,
      title: latest.title,
      intro: latest.intro,
      items:
        latest.briefing_items?.map((item) => ({
          id: item.id,
          topicId: item.topic_id,
          topicName: item.topic_name,
          title: item.title,
          whatHappened: item.what_happened,
          keyPoints: item.key_points as [string, string, string],
          whyItMatters: item.why_it_matters,
          sources: (item.sources as Array<{ title: string; url: string }>) ?? [],
          estimatedMinutes: item.estimated_minutes,
          read: item.is_read,
          priority: item.priority,
          importanceScore: undefined,
          importanceLabel: undefined,
          rankingSignals: [],
        })) ?? [],
      readingWindow: deriveReadingWindow(
        latest.briefing_items?.map((item) => item.estimated_minutes) ?? [],
        latest.reading_window,
      ),
    },
  };
}

async function getPublicDashboardData(): Promise<DashboardData> {
  const briefing = await generateDailyBriefing(demoTopics, demoSources);

  return {
    mode: "public",
    briefing,
    topics: demoTopics,
    sources: demoSources,
  };
}

export async function getHistory() {
  const { supabase, user, sessionCookiePresent } = await safeGetUser("/history");
  if (!supabase || !user) {
    if (sessionCookiePresent) {
      logServerEvent("warn", "History SSR fell back to demo history", {
        route: "/history",
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
    { route: "/history", userId: user.id },
  );

  if (!historyResult || historyResult.error) {
    logServerEvent("warn", "History data degraded to demo history", {
      route: "/history",
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
          estimatedMinutes: item.estimated_minutes,
          read: item.is_read,
          priority: item.priority,
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

export async function generateDailyBriefing(
  topics: Topic[] = demoTopics,
  sources: Source[] = demoSources,
): Promise<DailyBriefing> {
  const items = await Promise.all(
    topics.map(async (topic, index) => {
      const topicSources = sources.filter((source) => source.topicId === topic.id && source.status === "active");
      const feedArticles = await Promise.allSettled(
        topicSources.map((source) => fetchFeedArticles(source.feedUrl, source.name)),
      );

      const articles = feedArticles.flatMap((result) =>
        result.status === "fulfilled" ? result.value : [],
      );

      if (!articles.length) {
        return null;
      }

      const rankedClusters = rankNewsClusters(topic.name, clusterArticles(articles)).slice(0, 3);

      if (!rankedClusters.length) {
        return null;
      }

      const summaries = await Promise.all(
        rankedClusters.map(async (cluster, clusterIndex) => {
          const summary = await summarizeCluster(topic.name, cluster.sources);

          return {
            id: `generated-${topic.id}-${clusterIndex + 1}`,
            topicId: topic.id,
            topicName: topic.name,
            title: summary.headline,
            whatHappened: summary.whatHappened,
            keyPoints: summary.keyPoints,
            whyItMatters: summary.whyItMatters,
            sources: cluster.sources.slice(0, 3).map((article) => ({
              title: article.sourceName,
              url: article.url,
            })),
            estimatedMinutes: summary.estimatedMinutes,
            read: false,
            priority: index < 2 ? ("top" as const) : ("normal" as const),
            importanceScore: cluster.importanceScore,
            importanceLabel: cluster.importanceLabel,
            rankingSignals: cluster.rankingSignals,
          };
        }),
      );

      return summaries;
    }),
  );

  const validItems = items
    .flat()
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => (right.importanceScore ?? 0) - (left.importanceScore ?? 0))
    .map((item, index) => ({
      ...item,
      priority: index < 5 ? ("top" as const) : ("normal" as const),
    }));

  if (!validItems.length) {
    return demoDashboardData.briefing;
  }

  const totalMinutes = validItems.reduce((sum, item) => sum + item.estimatedMinutes, 0);

  return {
    id: `generated-${Date.now()}`,
    briefingDate: formatISO(new Date()),
    title: "Daily Executive Briefing",
    intro: "A concise scan of the stories most likely to affect decisions today.",
    readingWindow: `${totalMinutes} minutes`,
    items: validItems,
  };
}

function deriveReadingWindow(estimatedMinutes: number[], fallback: string) {
  const totalMinutes = estimatedMinutes.reduce((sum, minutes) => sum + minutes, 0);
  return totalMinutes > 0 ? `${totalMinutes} minutes` : fallback;
}
