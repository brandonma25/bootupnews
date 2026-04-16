import { env, isAiConfigured } from "@/lib/env";
import { buildEventIntelligence } from "@/lib/event-intelligence";
import { classifyHomepageCategory, getHomepageCategoryLabel } from "@/lib/homepage-taxonomy";
import type { FeedArticle } from "@/lib/rss";
import { generateWhyThisMattersHeuristically } from "@/lib/why-it-matters";
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
  const intelligence = buildEventIntelligence(articles, {
    topicName,
  });
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
          content: `Topic: ${topicName}

Structured event intelligence:
- Event type: ${intelligence.eventType}
- Entities: ${intelligence.entities.join(", ") || "None"}
- Primary impact: ${intelligence.primaryImpact}
- Affected markets: ${intelligence.affectedMarkets.join(", ") || "broad markets"}
- Time horizon: ${intelligence.timeHorizon}

Create a high-signal daily briefing item from these articles:

${sourceBlock}

For whyItMatters specifically:
- Focus on causality (what changes and why)
- Be specific to this event
- Avoid generic phrases
- Do not repeat the summary`,
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

export function summarizeHeuristically(topicName: string, articles: FeedArticle[]): StorySummary {
  const lead = articles[0];
  const second = articles[1];
  const third = articles[2];
  const classification = classifyHomepageCategory({
    topicName,
    title: lead.title,
    summary: articles.slice(0, 3).map((article) => article.summaryText).join(" "),
    sourceNames: articles.map((article) => article.sourceName),
  });
  const primaryCategory = classification.primaryCategory
    ? getHomepageCategoryLabel(classification.primaryCategory)
    : topicName;
  const sourceCount = new Set(articles.map((article) => article.sourceName)).size;
  const leadSummary = firstSentence(lead.summaryText, lead.title);
  const intelligence = buildEventIntelligence(articles, {
    topicName,
  });

  const whatHappened = firstSentence(
    lead.summaryText,
    `${lead.sourceName} is reporting a notable ${primaryCategory.toLowerCase()} development.`,
  );

  const points: [string, string, string] = [
    leadSummary,
    second
      ? `${second.sourceName} corroborates the event with ${firstSentence(second.summaryText, second.title).toLowerCase()}`
      : `${lead.sourceName} is still the only tracked outlet carrying this development.`,
    third
      ? `${third.sourceName} adds ${firstSentence(third.summaryText, third.title).toLowerCase()}`
      : articles.length > 1
        ? `${sourceCount} sources have picked up the same event, which strengthens confidence.`
        : `Treat this as an early signal until more independent sources confirm it.`,
  ];

  const whyItMatters = `${generateWhyThisMattersHeuristically(intelligence)} (Signal: ${intelligence.signalStrength.charAt(0).toUpperCase()}${intelligence.signalStrength.slice(1)})`;

  return {
    headline: lead.title,
    whatHappened,
    keyPoints: points,
    whyItMatters,
    estimatedMinutes: Math.min(6, Math.max(3, Math.ceil(articles.length * 1.5))),
  };
}
