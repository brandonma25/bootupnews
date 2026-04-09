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
  const second = articles[1];
  const third = articles[2];

  // Build a specific what-happened from the lead article
  const whatHappened = firstSentence(
    lead.summaryText,
    `${lead.sourceName} is reporting a notable development in ${topicName.toLowerCase()}.`,
  );

  // Build three distinct, article-grounded key points
  const points: [string, string, string] = [
    // Point 1: lead story grounded
    lead.summaryText
      ? firstSentence(lead.summaryText, lead.title)
      : lead.title,
    // Point 2: second source if available, otherwise a count observation
    second
      ? `${second.sourceName} is covering the same story: ${firstSentence(second.summaryText, second.title).toLowerCase()}`
      : `${lead.sourceName} is the primary source — no corroborating coverage from other tracked feeds yet.`,
    // Point 3: third source or signal count
    third
      ? `${third.sourceName} adds: ${firstSentence(third.summaryText, third.title).toLowerCase()}`
      : articles.length > 1
        ? `${articles.length} sources across your ${topicName} feeds picked up this cluster, indicating broad relevance.`
        : `Only one source has reported on this so far — treat as an early signal rather than confirmed news.`,
  ];

  // Build a specific why-it-matters using the topic and lead title
  const whyItMatters = `${topicName} operators tracking this area should note it: the lead signal — "${lead.title}" — is the kind of development that tends to affect near-term priorities or assumptions. Connect an AI key in Settings to get analyst-quality analysis instead of this heuristic summary.`;

  return {
    headline: lead.title,
    whatHappened,
    keyPoints: points,
    whyItMatters,
    estimatedMinutes: Math.min(6, Math.max(3, Math.ceil(articles.length * 1.5))),
  };
}
