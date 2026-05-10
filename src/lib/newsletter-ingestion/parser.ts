export type NewsletterStoryCategory = "Finance" | "Tech" | "Politics";

export type NewsletterStoryExtractionInput = {
  sender: string;
  subject: string;
  rawContent: string;
};

export type ParsedNewsletterStory = {
  headline: string;
  snippet: string;
  sourceUrl: string | null;
  sourceDomain: string | null;
  category: NewsletterStoryCategory | null;
  extractionConfidence: number;
};

type NewsletterFormat = "morning_brew" | "semafor" | "tldr" | "ap_wire" | "1440" | "unknown";

const MAX_STORIES_PER_EMAIL = 8;
const MIN_HEADLINE_LENGTH = 12;
const MAX_HEADLINE_LENGTH = 180;
const MIN_SNIPPET_LENGTH = 30;
const URL_PATTERN = /https?:\/\/[^\s)<>"']+/giu;
const NOISE_PATTERN =
  /\b(?:unsubscribe|sponsored|advertisement|view in browser|manage preferences|privacy policy|share this newsletter|forwarded this email|download the app|subscribe now)\b/i;

function normalizeText(value: string | null | undefined) {
  return value
    ?.replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim() ?? "";
}

function normalizeLine(value: string) {
  return normalizeText(
    value
      .replace(/^[-*•]\s+/u, "")
      .replace(/^\d+[.)]\s+/u, "")
      .replace(/^#{1,6}\s+/u, ""),
  );
}

function detectNewsletterFormat(input: NewsletterStoryExtractionInput): NewsletterFormat {
  const haystack = `${input.sender} ${input.subject} ${input.rawContent.slice(0, 500)}`.toLowerCase();

  if (haystack.includes("morning brew")) return "morning_brew";
  if (haystack.includes("semafor")) return "semafor";
  if (haystack.includes("tldr")) return "tldr";
  if (haystack.includes("associated press") || haystack.includes("ap wire")) return "ap_wire";
  if (haystack.includes("1440")) return "1440";
  return "unknown";
}

function inferCategory(value: string): NewsletterStoryCategory | null {
  const text = value.toLowerCase();

  if (
    /\b(?:fed|federal reserve|rates?|inflation|treasury|bond|stocks?|markets?|earnings|revenue|margin|ipo|bank|tariff|oil|gas|jobs|labor|housing|gdp|venture|funding|capital)\b/u.test(text)
  ) {
    return "Finance";
  }

  if (
    /\b(?:ai|chip|chips|semiconductor|software|cloud|data center|cyber|platform|app store|apple|google|microsoft|openai|startup|technology)\b/u.test(text)
  ) {
    return "Tech";
  }

  if (
    /\b(?:congress|white house|senate|house|trump|biden|election|court|supreme court|lawmakers?|regulation|policy|tariff|defense|ukraine|china|iran|israel|gaza|nato)\b/u.test(text)
  ) {
    return "Politics";
  }

  return null;
}

function getSourceDomain(sourceUrl: string | null) {
  if (!sourceUrl) {
    return null;
  }

  try {
    return new URL(sourceUrl).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

function normalizeUrl(value: string | null | undefined) {
  const url = value?.trim().replace(/[.,;:!?]+$/u, "") ?? "";

  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return /^https?:$/i.test(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function extractFirstUrl(value: string) {
  const match = value.match(URL_PATTERN)?.[0] ?? null;

  return normalizeUrl(match);
}

function isLikelyHeadline(line: string) {
  if (line.length < MIN_HEADLINE_LENGTH || line.length > MAX_HEADLINE_LENGTH) {
    return false;
  }

  if (NOISE_PATTERN.test(line)) {
    return false;
  }

  if (/^(read more|learn more|source|by the numbers|what happened|why it matters)$/iu.test(line)) {
    return false;
  }

  return /[A-Za-z]/u.test(line);
}

function splitCandidateBlocks(rawContent: string) {
  const lines = normalizeText(rawContent)
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (NOISE_PATTERN.test(line)) {
      continue;
    }

    const startsNewBlock = isLikelyHeadline(line) && current.length >= 2;

    if (startsNewBlock) {
      blocks.push(current);
      current = [line];
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    blocks.push(current);
  }

  return blocks;
}

function confidenceForFormat(format: NewsletterFormat, story: {
  sourceUrl: string | null;
  snippet: string;
  category: NewsletterStoryCategory | null;
}) {
  const base: Record<NewsletterFormat, number> = {
    morning_brew: 0.78,
    semafor: 0.74,
    tldr: 0.82,
    ap_wire: 0.76,
    "1440": 0.58,
    unknown: 0.5,
  };
  const sourceBonus = story.sourceUrl ? 0.08 : -0.08;
  const categoryBonus = story.category ? 0.04 : 0;
  const snippetBonus = story.snippet.length > 80 ? 0.04 : 0;

  return Math.max(0.2, Math.min(0.94, Number((base[format] + sourceBonus + categoryBonus + snippetBonus).toFixed(2))));
}

function buildStoryFromBlock(block: string[], format: NewsletterFormat): ParsedNewsletterStory | null {
  const headline = block.find(isLikelyHeadline) ?? "";
  const headlineIndex = block.indexOf(headline);
  const snippetLines = block
    .slice(Math.max(0, headlineIndex + 1))
    .filter((line) => !URL_PATTERN.test(line) || line.replace(URL_PATTERN, "").trim().length > 0)
    .slice(0, 3);
  const snippet = normalizeText(snippetLines.join(" "));

  if (!headline || snippet.length < MIN_SNIPPET_LENGTH) {
    return null;
  }

  const blockText = block.join(" ");
  const sourceUrl = extractFirstUrl(blockText);
  const category = inferCategory(`${headline} ${snippet}`);
  const sourceDomain = getSourceDomain(sourceUrl);

  return {
    headline,
    snippet,
    sourceUrl,
    sourceDomain,
    category,
    extractionConfidence: confidenceForFormat(format, {
      sourceUrl,
      snippet,
      category,
    }),
  };
}

function dedupeStories(stories: ParsedNewsletterStory[]) {
  const seen = new Set<string>();
  const deduped: ParsedNewsletterStory[] = [];

  for (const story of stories) {
    const key = story.sourceUrl ?? story.headline.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(story);
  }

  return deduped;
}

export function parseNewsletterStories(input: NewsletterStoryExtractionInput) {
  const format = detectNewsletterFormat(input);
  const stories = splitCandidateBlocks(input.rawContent)
    .map((block) => buildStoryFromBlock(block, format))
    .filter((story): story is ParsedNewsletterStory => Boolean(story))
    .filter((story) => story.extractionConfidence >= (format === "1440" ? 0.48 : 0.55));

  return dedupeStories(stories).slice(0, MAX_STORIES_PER_EMAIL);
}
