import {
  classifyNewsletterChrome,
  isBareUrlTitle,
  type ChromeRejection,
} from "@/lib/newsletter-ingestion/chrome-filter";
import {
  classifyUrlForArticleEligibility,
  type JunkRejection,
} from "@/lib/url-filtering";

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

/**
 * Result of a parse call. `stories` is the cleaned story list; `junkRejections`
 * captures URLs that were structurally not articles (Axios webfont CSS, Politico
 * tracking redirectors, etc.) so the promotion path can roll them up into a
 * single Source Health Log entry per source per run.
 */
export type NewsletterParseResult = {
  stories: ParsedNewsletterStory[];
  junkRejections: JunkRejection[];
  /** Layer-2 chrome reject-filter hits (footer/nav/address/tracking), for telemetry. */
  chromeRejections: ChromeRejection[];
};

type NewsletterFormat = "morning_brew" | "semafor" | "tldr" | "ap_wire" | "1440" | "unknown";

const MAX_STORIES_PER_EMAIL = 8;
const MIN_HEADLINE_LENGTH = 12;
const MAX_HEADLINE_LENGTH = 180;
const MIN_SNIPPET_LENGTH = 30;
const URL_PATTERN = /https?:\/\/[^\s)<>"']+/giu;
const NOISE_PATTERN =
  /\b(?:unsubscribe|sponsored|advertisement|view in browser|manage preferences|privacy policy|share this newsletter|forwarded this email|download the app|subscribe now)\b/i;

/**
 * Match a `<style>...</style>` block OR a raw `@font-face { … }` / `@media { … }`
 * CSS-at-rule construct that appears in newsletter HTML bodies. The Axios
 * extraction failure on 2026-05-17 traced to inline `@font-face` blocks whose
 * `src: url('https://static.axios.com/fonts/...woff2')` declarations were
 * harvested as candidate article URLs by `extractFirstUrl`. Pre-stripping
 * removes the entire CSS context before block-splitting runs.
 */
const STYLE_BLOCK_PATTERN = /<style\b[\s\S]*?<\/style>/giu;
const CSS_AT_RULE_PATTERN = /@(?:font-face|media|supports|keyframes|charset|import|page)\b[^{;]*\{[\s\S]*?\}/giu;
/**
 * Plain CSS selector blocks (`selector { declarations }`) that survive in the
 * plain-text body of HTML newsletters. The Axios fix only stripped @-rules, but
 * Money Stuff leaked `a{text-decoration:none} body{width:100%…}` into a snippet
 * and 1440 leaked `} blockquote #_two50 { background-image:url('…tracker…') }`
 * — a leading "}" that became a story headline. Single-level (no nested braces),
 * applied in two passes for adjacent rules.
 */
const CSS_RULE_BLOCK_PATTERN = /[^\n{}]*\{[^{}]*\}/gu;

/**
 * Lines that look like CSS source rather than story content. Used to reject
 * a parsed "block" whose only headline candidate is a CSS declaration.
 */
const CSS_LIKE_LINE_PATTERN = /\b(?:src\s*:|url\s*\(|format\s*\(|font-family\s*:|font-style\s*:|font-weight\s*:|@font-face|@media|@import)/iu;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "\u2014",
  ndash: "\u2013",
  hellip: "\u2026",
  rsquo: "\u2019",
  lsquo: "\u2018",
  rdquo: "\u201d",
  ldquo: "\u201c",
  copy: "\u00a9",
  reg: "\u00ae",
  trade: "\u2122",
};

// Zero-width / invisible code points newsletters inject as preview-text padding
// (the a16z body was hundreds of `&#847; &#8199; &#173;` runs). Strip entirely.
const INVISIBLE_CODEPOINTS = new Set([0x00ad, 0x034f, 0x200b, 0x200c, 0x200d, 0x2060, 0xfeff]);

function codePointToText(codePoint: number): string {
  if (!Number.isFinite(codePoint) || codePoint <= 0) return "";
  if (INVISIBLE_CODEPOINTS.has(codePoint)) return "";
  if (codePoint === 0x2007 || codePoint === 0x00a0) return " "; // figure space / nbsp \u2192 space
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return "";
  }
}

/**
 * Decode the HTML entities newsletters leave un-rendered in plain-text bodies:
 * numeric (`&#8217;` \u2192 \u2019, `&#x2019;`), named (`&amp;`, `&mdash;`, `&hellip;`),
 * and the invisible preview-padding runs (`&#847;`, `&#173;`) which are removed.
 * Before this, "Lil&#8217; Biotech" and "&#847; &#8199; &#173;" reached
 * headlines/snippets verbatim.
 */
function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/giu, (_match, hex: string) => codePointToText(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/gu, (_match, dec: string) => codePointToText(Number.parseInt(dec, 10)))
    .replace(/&([a-z][a-z0-9]*);/giu, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

function normalizeText(value: string | null | undefined) {
  if (!value) return "";
  return decodeHtmlEntities(value)
    .replace(/[\u00ad\u034f\u200b-\u200d\u2060\ufeff]/gu, "") // literal invisibles
    .replace(/[\u00a0\u2007]/gu, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeLine(value: string) {
  return normalizeText(
    value
      .replace(/^[-*•]\s+/u, "")
      .replace(/^\d+[.)]\s+/u, "")
      .replace(/^#{1,6}\s+/u, ""),
  );
}

/**
 * Strip URL / angle-bracket / parenthetical link wrappers out of a chosen
 * headline so a real title is never stored with a tracking link glued on.
 */
function cleanHeadline(line: string): string {
  return normalizeText(
    line
      .replace(/\(\s*https?:\/\/[^\s)]+\s*\)/giu, " ")
      .replace(/<\s*https?:\/\/[^\s>]+\s*>/giu, " ")
      .replace(/https?:\/\/[^\s)<>"'\]]+/giu, " ")
      .replace(/\[\s*\]|\(\s*\)|<\s*>/gu, " "),
  ).trim();
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

/**
 * Find the first URL in `value` that looks like a real article. URLs that
 * `classifyUrlForArticleEligibility` rejects (asset extensions, tracking
 * hostnames, marketing wrappers, utility paths) are appended to `rejections`
 * and skipped over so we never silently store a webfont URL as a story.
 *
 * Returns `null` when no candidate in the block passes the filter — the
 * caller drops the block.
 */
function extractFirstArticleUrl(value: string, rejections: JunkRejection[]) {
  const matches = value.match(URL_PATTERN) ?? [];

  for (const match of matches) {
    const normalized = normalizeUrl(match);
    if (!normalized) continue;
    const verdict = classifyUrlForArticleEligibility(normalized);
    if (verdict.ok) return normalized;
    rejections.push({ url: normalized, reason: verdict.reason, detail: verdict.detail });
  }

  return null;
}

/**
 * Strip `<style>...</style>` blocks AND raw CSS at-rules from a newsletter
 * body before block splitting. The Axios 2026-05-17 case was the parser
 * picking up the first URL inside an inline `@font-face` declaration.
 */
function stripInlineCss(rawContent: string): string {
  return rawContent
    .replace(STYLE_BLOCK_PATTERN, "\n")
    .replace(CSS_AT_RULE_PATTERN, "\n")
    .replace(CSS_RULE_BLOCK_PATTERN, "\n")
    .replace(CSS_RULE_BLOCK_PATTERN, "\n") // second pass: adjacent "a{}b{}" rules
    .replace(/^[ \t]*\}[ \t]*/gmu, ""); // leftover leading stray "}" on a line
}

function isLikelyHeadline(line: string) {
  // A line that is only a link / angle-bracket URL, or starts with a stray CSS
  // brace, is chrome — not a story title. Money Stuff staged
  // "<https://bloom.bg/3PWd74F>" as a headline; 1440 a leading-"}" CSS fragment.
  // Reject before the length/keyword checks.
  if (/^[{}]/u.test(line.trim()) || isBareUrlTitle(line)) {
    return false;
  }

  if (line.length < MIN_HEADLINE_LENGTH || line.length > MAX_HEADLINE_LENGTH) {
    return false;
  }

  if (NOISE_PATTERN.test(line)) {
    return false;
  }

  // CSS source lines are not headlines (`src: url('...woff2')`,
  // `url('...ttf') format('truetype')`, `@font-face`, …). The Axios
  // 2026-05-17 garbage rows had titles like
  //   "src: url('https://static.axios.com/fonts/atizatext-bold-webfont.eot');"
  // because the headline-picker accepted CSS declarations that happened to
  // pass the alphanumeric check.
  if (CSS_LIKE_LINE_PATTERN.test(line)) {
    return false;
  }

  if (/^(read more|learn more|source|by the numbers|what happened|why it matters)$/iu.test(line)) {
    return false;
  }

  return /[A-Za-z]/u.test(line);
}

function splitCandidateBlocks(rawContent: string) {
  // Strip `<style>` and CSS at-rules BEFORE line-splitting so `@font-face`
  // blocks don't survive as multi-line CSS that the block-splitter then
  // treats as story content.
  const lines = normalizeText(stripInlineCss(rawContent))
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

function buildStoryFromBlock(
  block: string[],
  format: NewsletterFormat,
  rejections: JunkRejection[],
): ParsedNewsletterStory | null {
  const headlineLine = block.find(isLikelyHeadline) ?? "";
  const headlineIndex = block.indexOf(headlineLine);
  // Strip any URL / link wrapper glued onto the chosen title so a real headline
  // is never stored with a tracking URL appended, e.g.
  // "Charts of the Week: Retail to the Moon (https://substack.com/redirect/…)".
  const headline = cleanHeadline(headlineLine);
  const snippetLines = block
    .slice(Math.max(0, headlineIndex + 1))
    .filter((line) => !URL_PATTERN.test(line) || line.replace(URL_PATTERN, "").trim().length > 0)
    .slice(0, 3);
  const snippet = normalizeText(snippetLines.join(" "));

  if (!headline || headline.length < MIN_HEADLINE_LENGTH || snippet.length < MIN_SNIPPET_LENGTH) {
    return null;
  }

  const blockText = block.join(" ");
  // Filtering-aware URL extraction: skip URLs that fail the
  // article-eligibility predicate (Axios webfonts, Politico ss/c trackers,
  // etc.). When nothing in the block looks article-like, drop the story
  // entirely rather than store a junk URL as the source.
  const sourceUrl = extractFirstArticleUrl(blockText, rejections);
  if (!sourceUrl) {
    return null;
  }
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

/**
 * Backwards-compatible parser entrypoint: returns the story list only.
 * Callers that need junk-rejection telemetry (the promotion path that writes
 * the Source Health Log) should use `parseNewsletterStoriesDetailed` instead.
 */
export function parseNewsletterStories(input: NewsletterStoryExtractionInput) {
  return parseNewsletterStoriesDetailed(input).stories;
}

/**
 * Telemetry-aware parser entrypoint. Returns the cleaned stories AND the
 * URL-rejection log so the caller can fold counts into Source Health.
 */
export function parseNewsletterStoriesDetailed(
  input: NewsletterStoryExtractionInput,
): NewsletterParseResult {
  const format = detectNewsletterFormat(input);
  const junkRejections: JunkRejection[] = [];
  const chromeRejections: ChromeRejection[] = [];
  const built = splitCandidateBlocks(input.rawContent)
    .map((block) => buildStoryFromBlock(block, format, junkRejections))
    .filter((story): story is ParsedNewsletterStory => Boolean(story))
    .filter((story) => story.extractionConfidence >= (format === "1440" ? 0.48 : 0.55));

  // Layer 2 — mechanism-agnostic chrome reject-filter. Anything chrome-shaped
  // that survived the Layer-1 heuristics (bare-URL title, footer/social/app-promo
  // phrase, postal address, tracking/shortener source) is dropped here with a
  // logged reason. Never a silent drop.
  const stories = built.filter((story) => {
    const verdict = classifyNewsletterChrome({
      headline: story.headline,
      snippet: story.snippet,
      sourceUrl: story.sourceUrl,
      sourceDomain: story.sourceDomain,
    });
    if (verdict.rejected) {
      chromeRejections.push({
        headline: story.headline.slice(0, 80),
        reason: verdict.reason,
        detail: verdict.detail,
      });
      return false;
    }
    return true;
  });

  return {
    stories: dedupeStories(stories).slice(0, MAX_STORIES_PER_EMAIL),
    junkRejections,
    chromeRejections,
  };
}
