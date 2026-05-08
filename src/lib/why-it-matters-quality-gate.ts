import type { ContentAccessibility } from "@/lib/source-accessibility-types";

export type WhyItMattersFailureMode =
  | "incomplete_sentence"
  | "template_placeholder_language"
  | "abstract_variable_list"
  | "minimum_specificity"
  | "summary_only_wording"
  | "unsupported_structural_claim"
  | "evidence_accessibility_mismatch";

export type WhyItMattersRecommendedAction = "approve" | "requires_human_rewrite";

export type WhyItMattersValidationTier =
  | "core_signal_eligible"
  | "context_signal_eligible"
  | "depth_only"
  | "exclude_from_public_candidates";

export type WhyItMattersValidationContext = {
  title?: string | null;
  eligibilityTier?: WhyItMattersValidationTier | null;
  contentAccessibility?: ContentAccessibility | null;
  accessibleTextLength?: number | null;
  eventType?: string | null;
};

export type WhyItMattersValidationResult = {
  passed: boolean;
  failures: WhyItMattersFailureMode[];
  failureDetails: string[];
  recommendedAction: WhyItMattersRecommendedAction;
};

export type WhyItMattersReviewStatus = "passed" | "requires_human_rewrite";

export type FlaggedWhyItMattersCard<T> = T & {
  whyItMattersValidation: WhyItMattersValidationResult;
  reviewStatus: WhyItMattersRecommendedAction;
  reviewFailureReasons: string[];
};

const TERMINAL_PUNCTUATION_PATTERN = /[.!?]$/;
const SIGNAL_SUFFIX_PATTERN = /\s*\(Signal:\s*[^)]+\)\s*$/i;
const UNRESOLVED_VARIABLE_PATTERN =
  /(?:\{\{\s*[^{}]+\s*\}\}|\{[a-z][a-z0-9_\s-]*\}|\[[a-z][a-z0-9_\s-]*\]|\$[a-z][a-z0-9_]*)/gi;
const DANGLING_ENDING_PATTERNS = [
  {
    label: "rather than",
    pattern: /\b(?:rather|instead)\s+than$/i,
    detail: "dangling comparison phrase",
  },
  {
    label: "more/less than",
    pattern: /\b(?:more|less|fewer|higher|lower)\s+than$/i,
    detail: "dangling comparison phrase",
  },
  {
    label: "clause connector",
    pattern: /\b(?:because|while|although|though|when|where|if|unless|until|which|whose|rather)$/i,
    detail: "incomplete clause ending",
  },
  {
    label: "dangling preposition",
    pattern: /\b(?:as|from|for|with|without|into|across|around|over|under|between|against|toward|through|via|by|of|to)$/i,
    detail: "dangling preposition or connector",
  },
];
const MALFORMED_SUBJECT_START_PATTERN =
  /^(?:can|how|why|the|an|a)\s+(?:matters|gives|changes|resets|opens|raises|shifts|is\s+not|could\s+(?:change|move|raise|shift))\b/i;
const POSSESSIVE_MANGLE_START_PATTERN =
  /^([A-Z][a-z]{2,}s)\s+(?:matters|gives|changes|resets|opens|raises|shifts|could\s+(?:change|move|raise|shift))\b/;

const TRUNCATION_PATTERNS = [
  "so it could raise",
  "so it could move",
  "so it could",
  "which could",
  "it could",
  "or risk in rates and equities over",
  "in policy risk and defense posture",
  "or pricing in rates and equities over",
  "with the clearest effect in",
  "especially in",
  "over the",
];

const TEMPLATE_PLACEHOLDER_PHRASES = [
  "not a market-moving development",
  "not market-moving",
  "individual decision-making",
  "individual readers",
  "mainly useful for individual readers",
  "market-wide pricing",
  "editorial review needed",
  "source review needed",
  "does not yet show a structural change",
  "not suitable for public signal copy",
  "cannot support a public structural explanation yet",
  "changes assumptions about",
  "so it could raise",
  "so it could move expectations",
  "or market structure in",
  "so it could move market expectations",
  "could move expectations",
  "changes how investors price rates, demand, or risk",
  "this changes capital availability",
  "changes the macro baseline because this changes",
  "matters for defense and international relations because this changes",
  "The matters for",
  "The changes the",
  "this changes regulation, compliance, or market-access assumptions",
  "this changes revenue, margin, or guidance expectations",
  "this changes startup capital availability, ecosystem breadth, and early competitive pressure",
  "this reveals how public investors are valuing new issuance and balancing risk appetite",
  "this adds a concrete data point that can reset demand assumptions",
  "this changes leadership continuity, strategic direction, and execution confidence",
  "this changes adoption expectations, product comparison, and feature benchmarks",
  "this raises questions about governance credibility, diplomatic judgment, and policy follow-through",
  "this changes liability, operating flexibility, or reputational assumptions",
  "this changes execution expectations",
  "shift sector constraints, cost structures, or strategic flexibility",
  "move financial expectations, guidance credibility, or valuation",
  "reshape competition, capital allocation, or market structure",
  "expand startup competition, partner activity, or ecosystem experimentation",
  "shift valuation expectations, IPO sentiment, or capital-markets confidence",
  "move demand expectations, revenue assumptions, or narrative momentum",
  "shift strategy confidence, governance scrutiny, or execution expectations",
  "change adoption patterns, user behavior, or competitive feature dynamics",
  "shift governance credibility, political accountability, or policy risk",
  "raise defense risk, policy pressure, or international-relations risk",
  "raise downside risk for operations, cash flow, or reputation",
  "move market expectations, sector sentiment, or pricing",
  "change expectations around",
  "how capital availability changes competitive pressure",
  "how government adoption and procurement priorities shift",
  "how governance credibility and diplomatic scrutiny evolve",
  "how borrowing conditions feed into housing demand",
  "how demand signals feed into revenue expectations",
  "could have implications",
  "matters because it is important",
  "markets are watching",
  "the economy may be affected",
];

const SUMMARY_ONLY_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "because",
  "but",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "its",
  "matter",
  "matters",
  "of",
  "on",
  "or",
  "over",
  "that",
  "the",
  "this",
  "to",
  "which",
  "with",
]);

const STRUCTURAL_MECHANISM_PATTERN =
  /\b(?:allocation|assumptions?|capacity|capital|competition|cost|credit|demand|employment|enforcement|fed|federal reserve|financing|funding|governance|growth|inflation|infrastructure|institution|investment|labor|liquidity|market|monetary|neutral rate|permitting|policy|pricing|productivity|rate|rates|risk|supply|wage)\b/i;

const STRONG_STRUCTURAL_CLAIM_PATTERN =
  /\b(?:alter(?:s|ed|ing)?|chang(?:e|es|ed|ing)|constrain(?:s|ed|ing)?|feed(?:s|ing)? into|mov(?:e|es|ed|ing)|narrow(?:s|ed|ing)?|rais(?:e|es|ed|ing)|refram(?:e|es|ed|ing)|reset(?:s|ting)?|reshap(?:e|es|ed|ing)|shift(?:s|ed|ing)?|test(?:s|ed|ing)?)\b/i;

const RETROSPECTIVE_META_TITLE_PATTERN =
  /\b(?:countdown|most[-\s]?read|roundup|year in review|look back|top topics|most popular)\b/i;

const ABSTRACT_TERMS = new Set([
  "adoption expectations",
  "business planning decisions",
  "capital allocation",
  "capital availability",
  "capital-markets confidence",
  "cash flow",
  "competitive dynamics",
  "competitive feature dynamics",
  "competitive positioning",
  "competitive pressure",
  "competition",
  "compliance",
  "cost structures",
  "demand",
  "demand assumptions",
  "demand expectations",
  "defense posture",
  "defense risk",
  "diplomatic judgment",
  "ecosystem breadth",
  "ecosystem experimentation",
  "execution confidence",
  "execution expectations",
  "feature benchmarks",
  "financial expectations",
  "governance credibility",
  "governance scrutiny",
  "guidance credibility",
  "guidance expectations",
  "international alignment",
  "international-relations risk",
  "ipo sentiment",
  "liability",
  "leadership continuity",
  "margin",
  "market structure",
  "market-access assumptions",
  "narrative momentum",
  "operating flexibility",
  "partner activity",
  "policy follow-through",
  "policy pressure",
  "policy risk",
  "political accountability",
  "pricing",
  "product comparison",
  "rates",
  "regulation",
  "reputational assumptions",
  "reputation",
  "revenue",
  "revenue assumptions",
  "risk",
  "risk appetite",
  "sector constraints",
  "sector sentiment",
  "state capacity",
  "strategic direction",
  "strategic flexibility",
  "strategy confidence",
  "startup competition",
  "startup capital availability",
  "user behavior",
  "valuation",
  "valuation expectations",
]);

const SPECIFIC_ENTITY_TERMS = [
  "Amazon",
  "Anthropic",
  "Apple",
  "Bank of England",
  "China",
  "Congress",
  "European Union",
  "EU",
  "Federal Reserve",
  "Google",
  "Gulf",
  "Iran",
  "Japan",
  "NATO",
  "OpenAI",
  "OPEC",
  "Powell",
  "SEC",
  "Tesla",
  "UK",
  "United Kingdom",
  "United States",
  "U.S.",
  "US",
  "White House",
  "Yellen",
];

const GENERIC_SENTENCE_STARTERS = new Set([
  "A",
  "An",
  "At",
  "Can",
  "How",
  "In",
  "It",
  "Its",
  "That",
  "The",
  "Their",
  "This",
  "Those",
  "Why",
]);

const GENERIC_PROPER_NOUN_TERMS = new Set([
  "AI",
  "API",
  "Business",
  "Card",
  "Cards",
  "Cluster",
  "Clusters",
  "Context",
  "Finance",
  "Market",
  "Markets",
  "Policy",
  "Politics",
  "Signal",
  "Signals",
  "Story",
  "Stories",
  "Tech",
  "Technology",
  "Top",
  "Update",
  "Watch",
]);

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripSignalSuffix(value: string) {
  return value.replace(SIGNAL_SUFFIX_PATTERN, "").trim();
}

function stripTrailingPunctuation(value: string) {
  return value.replace(/[\s.?!…]+$/g, "").trim();
}

function addFailure(
  result: Map<WhyItMattersFailureMode, string[]>,
  failure: WhyItMattersFailureMode,
  detail: string,
) {
  const details = result.get(failure) ?? [];
  if (!details.includes(detail)) {
    result.set(failure, [...details, detail]);
  }
}

function getWordCount(value: string) {
  return value
    .split(/\s+/)
    .filter((word) => /[A-Za-z0-9]/.test(word)).length;
}

function getSentences(value: string) {
  const matches = value.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  return matches.map((sentence) => sentence.trim()).filter(Boolean);
}

function hasSpecificNoun(value: string) {
  if (/(?:[$€£]\s?\d|\b\d+(?:[\d,.]*)(?:\s?(?:%|percent|bps|billion|million|trillion|gigawatts?|gw|mw|q[1-4]))?\b)/i.test(value)) {
    return true;
  }

  if (SPECIFIC_ENTITY_TERMS.some((term) => new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(value))) {
    return true;
  }

  const properNounMatches = value.match(/\b[A-Z][A-Za-z0-9&.'-]+(?:\s+[A-Z][A-Za-z0-9&.'-]+)*\b/g) ?? [];
  return properNounMatches.some((match) => {
    const words = match.split(/\s+/);
    if (words.length === 1 && GENERIC_SENTENCE_STARTERS.has(words[0])) {
      return false;
    }

    if (words.every((word) => GENERIC_PROPER_NOUN_TERMS.has(word))) {
      return false;
    }

    if (/^(Signal|Why|How|Can|This|The|A|An|It|At)$/i.test(match)) {
      return false;
    }

    return true;
  });
}

function detectIncompleteSentence(value: string, failures: Map<WhyItMattersFailureMode, string[]>) {
  if (!TERMINAL_PUNCTUATION_PATTERN.test(value)) {
    addFailure(failures, "incomplete_sentence", "Output does not end with sentence punctuation.");
  }

  for (const sentence of getSentences(value)) {
    const strippedSentence = stripTrailingPunctuation(sentence);
    if (strippedSentence && getWordCount(strippedSentence) < 8) {
      addFailure(
        failures,
        "incomplete_sentence",
        `Sentence has fewer than 8 words: "${sentence}"`,
      );
    }
  }

  const terminal = stripTrailingPunctuation(value).toLowerCase();
  for (const pattern of TRUNCATION_PATTERNS) {
    if (terminal.endsWith(pattern)) {
      addFailure(failures, "incomplete_sentence", `Ends with truncation pattern: "${pattern}"`);
    }
  }

  for (const ending of DANGLING_ENDING_PATTERNS) {
    if (ending.pattern.test(terminal)) {
      addFailure(
        failures,
        "incomplete_sentence",
        `Ends with ${ending.detail}: "${ending.label}"`,
      );
    }
  }
}

function detectTemplatePlaceholderLanguage(
  value: string,
  failures: Map<WhyItMattersFailureMode, string[]>,
) {
  const normalized = value.toLowerCase();
  for (const phrase of TEMPLATE_PLACEHOLDER_PHRASES) {
    if (normalized.includes(phrase.toLowerCase())) {
      addFailure(
        failures,
        "template_placeholder_language",
        `Contains template placeholder phrase: "${phrase}"`,
      );
    }
  }

  const unresolvedVariables = value.match(UNRESOLVED_VARIABLE_PATTERN) ?? [];
  for (const variable of unresolvedVariables) {
    addFailure(
      failures,
      "template_placeholder_language",
      `Contains unresolved template variable: "${variable}"`,
    );
  }

  const malformedSubjectMatch = value.match(MALFORMED_SUBJECT_START_PATTERN);
  if (malformedSubjectMatch) {
    addFailure(
      failures,
      "template_placeholder_language",
      `Contains malformed generated subject/verb sequence: "${malformedSubjectMatch[0]}"`,
    );
  }

  const possessiveMangleMatch = value.match(POSSESSIVE_MANGLE_START_PATTERN);
  if (possessiveMangleMatch) {
    const subject = possessiveMangleMatch[1];
    const isKnownSpecificEntity = SPECIFIC_ENTITY_TERMS.some(
      (term) => term.toLowerCase() === subject.toLowerCase(),
    );
    if (!isKnownSpecificEntity) {
      addFailure(
        failures,
        "template_placeholder_language",
        `Contains title/subject mangling before template verb: "${possessiveMangleMatch[0]}"`,
      );
    }
  }
}

function normalizeAbstractTerm(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(?:in|around|across|over|tied to|for)\b.*$/i, "")
    .replace(/[^a-z\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isAbstractTerm(value: string) {
  const normalized = normalizeAbstractTerm(value);
  if (!normalized) {
    return false;
  }

  if (ABSTRACT_TERMS.has(normalized)) {
    return true;
  }

  return Array.from(ABSTRACT_TERMS).some((term) => normalized === term || normalized.endsWith(` ${term}`));
}

function detectAbstractVariableList(
  value: string,
  failures: Map<WhyItMattersFailureMode, string[]>,
) {
  const listPattern = /\b([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,3}),\s+([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,3}),?\s+(?:or|and)\s+([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,6})/gi;
  let match: RegExpExecArray | null;

  while ((match = listPattern.exec(value)) !== null) {
    const terms = [match[1], match[2], match[3]].filter((term): term is string => Boolean(term));
    if (terms.length === 3 && terms.every(isAbstractTerm)) {
      addFailure(
        failures,
        "abstract_variable_list",
        `Contains abstract variable list: "${match[0]}"`,
      );
    }
  }
}

function detectMinimumSpecificity(value: string, failures: Map<WhyItMattersFailureMode, string[]>) {
  if (!hasSpecificNoun(value)) {
    addFailure(
      failures,
      "minimum_specificity",
      "Output has no number, percentage, named organization, country, region, or person.",
    );
  }
}

function isCoreOrContextTier(context: WhyItMattersValidationContext | undefined) {
  return (
    context?.eligibilityTier === "core_signal_eligible" ||
    context?.eligibilityTier === "context_signal_eligible"
  );
}

function normalizeForSummaryCheck(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSignificantTokens(value: string) {
  return normalizeForSummaryCheck(value)
    .split(" ")
    .filter((token) => token.length > 2 && !SUMMARY_ONLY_STOPWORDS.has(token));
}

function tokenOverlapScore(left: string, right: string) {
  const leftTokens = new Set(getSignificantTokens(left));
  const rightTokens = new Set(getSignificantTokens(right));
  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / leftTokens.size;
}

function removeTitleTokens(value: string, title: string) {
  const titleTokens = new Set(getSignificantTokens(title));
  return getSignificantTokens(value)
    .filter((token) => !titleTokens.has(token))
    .join(" ");
}

function extractBecauseClause(value: string) {
  const match = value.match(/\b(?:because|which matters because)\b(.+)$/i);
  return match?.[1]?.trim() ?? value;
}

function detectSummaryOnlyWording(
  value: string,
  context: WhyItMattersValidationContext | undefined,
  failures: Map<WhyItMattersFailureMode, string[]>,
) {
  if (!isCoreOrContextTier(context) || !context?.title) {
    return;
  }

  const title = normalizeForSummaryCheck(context.title);
  const becauseClause = normalizeForSummaryCheck(extractBecauseClause(value));
  if (!title || !becauseClause) {
    return;
  }

  const overlap = tokenOverlapScore(context.title, becauseClause);
  const repeatsTitle = becauseClause.includes(title);
  const mechanismRemainder = removeTitleTokens(becauseClause, context.title);
  if ((repeatsTitle || overlap >= 0.72) && !STRUCTURAL_MECHANISM_PATTERN.test(mechanismRemainder)) {
    addFailure(
      failures,
      "summary_only_wording",
      "Core/Context WITM repeats the headline or summary without a structural mechanism.",
    );
  }
}

function hasSufficientCoreContextEvidence(context: WhyItMattersValidationContext | undefined) {
  const accessibility = context?.contentAccessibility;
  const accessibleLength = context?.accessibleTextLength ?? 0;

  if (!accessibility) {
    return true;
  }

  if (accessibility === "full_text_available") {
    return accessibleLength >= 800;
  }

  if (accessibility === "partial_text_available") {
    return accessibleLength >= 800;
  }

  if (accessibility === "abstract_only") {
    return accessibleLength >= 1000;
  }

  return false;
}

function detectEvidenceAccessibilityMismatch(
  value: string,
  context: WhyItMattersValidationContext | undefined,
  failures: Map<WhyItMattersFailureMode, string[]>,
) {
  if (!isCoreOrContextTier(context) || hasSufficientCoreContextEvidence(context)) {
    return;
  }

  if (STRONG_STRUCTURAL_CLAIM_PATTERN.test(value)) {
    addFailure(
      failures,
      "evidence_accessibility_mismatch",
      "Core/Context WITM makes a structural claim without enough accessible source evidence.",
    );
  }
}

function detectUnsupportedStructuralClaim(
  value: string,
  context: WhyItMattersValidationContext | undefined,
  failures: Map<WhyItMattersFailureMode, string[]>,
) {
  if (!isCoreOrContextTier(context)) {
    return;
  }

  const title = context?.title ?? "";
  if (context?.eligibilityTier === "core_signal_eligible" && RETROSPECTIVE_META_TITLE_PATTERN.test(title)) {
    addFailure(
      failures,
      "unsupported_structural_claim",
      "Core WITM is attached to a retrospective or meta-story that needs selection review before publication.",
    );
  }

  const normalized = value.toLowerCase();
  if (
    /fresh read on (?:rates and equities|the economy|markets|market conditions)\b/i.test(normalized) ||
    /gives policymakers and investors a fresh read\b/i.test(normalized)
  ) {
    addFailure(
      failures,
      "unsupported_structural_claim",
      "Core/Context WITM uses generic macro fresh-read language without a specific structural mechanism.",
    );
  }
}

function detectContextualCoreContextFailures(
  value: string,
  context: WhyItMattersValidationContext | undefined,
  failures: Map<WhyItMattersFailureMode, string[]>,
) {
  detectSummaryOnlyWording(value, context, failures);
  detectEvidenceAccessibilityMismatch(value, context, failures);
  detectUnsupportedStructuralClaim(value, context, failures);
}

export function validateWhyItMatters(
  text: string,
  context: WhyItMattersValidationContext = {},
): WhyItMattersValidationResult {
  const normalized = stripSignalSuffix(normalizeText(text));
  const failuresByMode = new Map<WhyItMattersFailureMode, string[]>();

  if (!normalized) {
    addFailure(failuresByMode, "incomplete_sentence", "Output is empty.");
    addFailure(
      failuresByMode,
      "minimum_specificity",
      "Output has no number, percentage, named organization, country, region, or person.",
    );
  } else {
    detectIncompleteSentence(normalized, failuresByMode);
    detectTemplatePlaceholderLanguage(normalized, failuresByMode);
    detectAbstractVariableList(normalized, failuresByMode);
    detectMinimumSpecificity(normalized, failuresByMode);
    detectContextualCoreContextFailures(normalized, context, failuresByMode);
  }

  const failures = Array.from(failuresByMode.keys());
  const failureDetails = Array.from(failuresByMode.entries()).flatMap(([failure, details]) =>
    details.map((detail) => `${failure}: ${detail}`),
  );
  const passed = failures.length === 0;

  return {
    passed,
    failures,
    failureDetails,
    recommendedAction: passed ? "approve" : "requires_human_rewrite",
  };
}

export function flagCardForRewrite<T extends { aiWhyItMatters?: string; whyItMatters?: string }>(
  card: T,
): FlaggedWhyItMattersCard<T> {
  const validation = validateWhyItMatters(card.aiWhyItMatters ?? card.whyItMatters ?? "");

  return {
    ...card,
    whyItMattersValidation: validation,
    reviewStatus: validation.recommendedAction,
    reviewFailureReasons: validation.failureDetails,
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const __testing__ = {
  TEMPLATE_PLACEHOLDER_PHRASES,
  TRUNCATION_PATTERNS,
};
