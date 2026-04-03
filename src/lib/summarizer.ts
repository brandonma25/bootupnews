import { env, isAiConfigured } from "@/lib/env";
import type { FeedArticle } from "@/lib/rss";
import { firstSentence } from "@/lib/utils";

export type StorySummary = {
  headline: string;
  whatHappened: string;
  keyPoints: [string, string, string];
  whyItMatters: string;
  estimatedMinutes: number;
};

export async function summarizeCluster(
  topicName: string,
  articles: FeedArticle[],
): Promise<StorySummary> {
  if (isAiConfigured) {
    try {
      return await summarizeWithAi(topicName, articles);
    } catch (error) {
      console.error("AI summary failed, falling back to heuristic summary.", error);
    }
  }

  return summarizeHeuristically(topicName, articles);
}

async function summarizeWithAi(
  topicName: string,
  articles: FeedArticle[],
): Promise<StorySummary> {
  const sourceBlock = articles
    .slice(0, 5)
    .map(
      (article, index) =>
        `${index + 1}. ${article.sourceName}\nTitle: ${article.title}\nSummary: ${article.summaryText}\nLink: ${article.url}`,
    )
    .join("\n\n");

  const response = await fetch(`${env.openAiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openAiApiKey}`,
    },
    body: JSON.stringify({
      model: env.openAiModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write concise executive intelligence briefings. Return strict JSON with headline, whatHappened, keyPoints, whyItMatters, estimatedMinutes. keyPoints must contain exactly 3 strings.",
        },
        {
          role: "user",
          content: `Topic: ${topicName}\n\nCreate a high-signal daily briefing item from these articles:\n\n${sourceBlock}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content);

  return {
    headline: parsed.headline,
    whatHappened: parsed.whatHappened,
    keyPoints: [
      parsed.keyPoints[0],
      parsed.keyPoints[1],
      parsed.keyPoints[2],
    ],
    whyItMatters: parsed.whyItMatters,
    estimatedMinutes: Number(parsed.estimatedMinutes) || 4,
  };
}

function summarizeHeuristically(topicName: string, articles: FeedArticle[]): StorySummary {
  const lead = articles[0];
  const backups = articles.slice(1, 4);

  return {
    headline: lead.title,
    whatHappened: firstSentence(
      lead.summaryText,
      `${lead.sourceName} reports a notable development in ${topicName.toLowerCase()}.`,
    ),
    keyPoints: [
      `Coverage appeared across ${articles.length} source${articles.length === 1 ? "" : "s"}, suggesting the story has broad relevance.`,
      `The strongest signal in the reporting is ${firstSentence(lead.summaryText, lead.title).toLowerCase()}.`,
      backups[0]
        ? `${backups[0].sourceName} adds supporting context that sharpens the same underlying trend.`
        : `This looks material enough to keep on the radar for the next briefing cycle.`,
    ],
    whyItMatters:
      `For ${topicName.toLowerCase()}, this matters because it could change near-term priorities, operating assumptions, or market expectations. Treat it as a story to monitor rather than background noise.`,
    estimatedMinutes: Math.min(6, Math.max(3, Math.ceil(articles.length * 1.5))),
  };
}
