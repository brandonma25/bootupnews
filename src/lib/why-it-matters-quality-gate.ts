export type WhyItMattersFailureMode =
  | "incomplete_sentence"
  | "template_placeholder_language"
  | "abstract_variable_list"
  | "minimum_specificity";

export type WhyItMattersRecommendedAction = "approve" | "requires_human_rewrite";

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
  "changes assumptions about",
  "so it could raise",
  "or market structure in",
  "so it could move market expectations",
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
];

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
  "In",
  "It",
  "Its",
  "That",
  "The",
  "Their",
  "This",
  "Those",
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

    if (/^(Signal|Why|This|The|A|An|It|At)$/i.test(match)) {
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

export function validateWhyItMatters(text: string): WhyItMattersValidationResult {
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
