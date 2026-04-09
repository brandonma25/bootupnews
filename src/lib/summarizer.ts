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
  const leadSentence = firstSentence(
    lead.summaryText,
    `${lead.sourceName} reports a notable development in ${topicName.toLowerCase()}.`,
  );
  const backupSentences = backups
    .map((article) =>
      firstSentence(article.summaryText, article.title),
    )
    .filter(Boolean);
  const lens = inferStoryLens(topicName, articles);
  const estimatedMinutes = estimateReadingMinutes(articles);

  return {
    headline: lead.title,
    whatHappened: summarizeWhatHappened(leadSentence, backupSentences[0]),
    keyPoints: [
      normalizeInsight(leadSentence),
      backupSentences[0]
        ? `${backups[0].sourceName} adds context that ${normalizeClause(backupSentences[0])}.`
        : inferOperationalTakeaway(topicName, lens, lead.title),
      backupSentences[1]
        ? `${backups[1].sourceName} reinforces the angle that ${normalizeClause(backupSentences[1])}.`
        : inferSourceAngle(lead, articles.length),
    ],
    whyItMatters: inferWhyItMatters(topicName, lens, lead.title),
    estimatedMinutes,
  };
}

function summarizeWhatHappened(leadSentence: string, supportingSentence?: string) {
  if (!supportingSentence) {
    return leadSentence;
  }

  const support = normalizeSentence(supportingSentence);
  if (support.toLowerCase() === leadSentence.toLowerCase()) {
    return leadSentence;
  }

  return `${leadSentence} ${support}`;
}

function inferStoryLens(topicName: string, articles: FeedArticle[]) {
  const corpus = `${topicName} ${articles
    .slice(0, 4)
    .map((article) => `${article.title} ${article.summaryText}`)
    .join(" ")}`.toLowerCase();

  if (matchesAny(corpus, ["earnings", "guidance", "revenue", "profit"])) return "earnings";
  if (matchesAny(corpus, ["regulation", "lawsuit", "antitrust", "policy", "ban"])) return "regulation";
  if (matchesAny(corpus, ["breach", "security", "cyberattack", "hack"])) return "security";
  if (matchesAny(corpus, ["acquisition", "merger", "funding", "ipo"])) return "capital";
  if (matchesAny(corpus, ["fed", "inflation", "treasury", "rates", "tariff", "economy"])) return "macro";
  if (matchesAny(corpus, ["launch", "model", "chip", "product", "rollout", "feature"])) return "product";
  return topicName.toLowerCase().includes("finance") ? "market" : "strategy";
}

function inferWhyItMatters(topicName: string, lens: string, title: string) {
  const subject = shortenTitle(title);

  switch (lens) {
    case "earnings":
      return `${subject} could reset near-term expectations for revenue quality, spending discipline, or sector sentiment, which makes it relevant for finance teams watching the next reporting cycle.`;
    case "regulation":
      return `${subject} has the potential to change compliance requirements, deal timing, or product roadmaps, so it is more than just background policy noise for ${topicName.toLowerCase()} leaders.`;
    case "security":
      return `${subject} matters because security stories quickly become trust, resilience, and operating-risk issues for teams making platform or vendor decisions.`;
    case "capital":
      return `${subject} is a signal about capital allocation and competitive positioning, which can influence who has the resources to move fastest in ${topicName.toLowerCase()}.`;
    case "macro":
      return `${subject} can reshape investor expectations, financing conditions, or demand assumptions, so it has direct implications for planning rather than just market chatter.`;
    case "product":
      return `${subject} is relevant because product and infrastructure moves tend to change competitive positioning, customer adoption, and partner priorities quickly.`;
    case "market":
      return `${subject} is worth watching because it may affect sentiment, pricing assumptions, or management decisions in the next few sessions.`;
    default:
      return `${subject} is the kind of development that can shift operating priorities, competitive assumptions, or customer expectations faster than a routine update would.`;
  }
}

function inferOperationalTakeaway(topicName: string, lens: string, title: string) {
  const subject = shortenTitle(title);

  if (lens === "macro" || topicName.toLowerCase().includes("finance")) {
    return `The practical takeaway is to watch whether ${subject.toLowerCase()} changes sentiment, pricing, or demand assumptions over the next few sessions.`;
  }

  if (lens === "product") {
    return `The practical takeaway is to watch whether ${subject.toLowerCase()} changes roadmap pressure, customer expectations, or infrastructure demand.`;
  }

  return `The practical takeaway is to monitor whether ${subject.toLowerCase()} turns into a broader priority shift for teams operating in ${topicName.toLowerCase()}.`;
}

function inferSourceAngle(lead: FeedArticle, sourceCount: number) {
  return sourceCount > 1
    ? `Additional reporting suggests the core facts are stabilizing instead of remaining a single-source claim.`
    : `${lead.sourceName} is early on the story, so the next update will likely clarify the bigger implications.`;
}

function estimateReadingMinutes(articles: FeedArticle[]) {
  const wordCount = articles
    .slice(0, 3)
    .map((article) => `${article.title} ${article.summaryText}`.trim().split(/\s+/).length)
    .reduce((sum, value) => sum + value, 0);

  return Math.max(3, Math.min(7, Math.ceil(wordCount / 140)));
}

function normalizeInsight(value: string) {
  return normalizeSentence(value);
}

function normalizeClause(value: string) {
  return stripTrailingPunctuation(normalizeSentence(value)).replace(/^[A-Z]/, (match) =>
    match.toLowerCase(),
  );
}

function normalizeSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function stripTrailingPunctuation(value: string) {
  return value.replace(/[.!?]+$/, "");
}

function shortenTitle(title: string) {
  return title
    .replace(/\s*[-|:]\s*.*$/, "")
    .trim();
}

function matchesAny(corpus: string, keywords: string[]) {
  return keywords.some((keyword) => corpus.includes(keyword));
}
