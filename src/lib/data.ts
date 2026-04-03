import { formatISO } from "date-fns";

import { demoDashboardData, demoHistory, demoSources, demoTopics } from "@/lib/demo-data";
import { clusterArticles, fetchFeedArticles } from "@/lib/rss";
import { summarizeCluster } from "@/lib/summarizer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DailyBriefing, DashboardData, Source, Topic } from "@/lib/types";

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return demoDashboardData;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return demoDashboardData;
  }

  const [topicsResult, sourcesResult, briefingsResult] = await Promise.all([
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
  ]);

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
      readingWindow: latest.reading_window,
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
        })) ?? [],
    },
  };
}

export async function getHistory() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return demoHistory;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return demoHistory;

  const { data } = await supabase
    .from("daily_briefings")
    .select("id, briefing_date, title, intro, reading_window, briefing_items(id, topic_id, topic_name, title, what_happened, key_points, why_it_matters, sources, estimated_minutes, priority, is_read)")
    .eq("user_id", user.id)
    .order("briefing_date", { ascending: false })
    .limit(14);

  if (!data?.length) return demoHistory;

  return data.map(
    (briefing): DailyBriefing => ({
      id: briefing.id,
      briefingDate: briefing.briefing_date,
      title: briefing.title,
      intro: briefing.intro,
      readingWindow: briefing.reading_window,
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
        })) ?? [],
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

      const topCluster = clusterArticles(articles)[0];

      if (!topCluster) {
        return null;
      }

      const summary = await summarizeCluster(topic.name, topCluster.sources);

      return {
        id: `generated-${topic.id}`,
        topicId: topic.id,
        topicName: topic.name,
        title: summary.headline,
        whatHappened: summary.whatHappened,
        keyPoints: summary.keyPoints,
        whyItMatters: summary.whyItMatters,
        sources: topCluster.sources.slice(0, 3).map((article) => ({
          title: article.sourceName,
          url: article.url,
        })),
        estimatedMinutes: summary.estimatedMinutes,
        read: false,
        priority: index < 2 ? ("top" as const) : ("normal" as const),
      };
    }),
  );

  const validItems = items.filter(
    (
      item,
    ): item is NonNullable<(typeof items)[number]> => item !== null,
  );

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
