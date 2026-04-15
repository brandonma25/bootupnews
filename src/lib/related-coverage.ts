export type RelatedCoverageCandidate = {
  title: string;
  url: string;
  sourceName: string;
  summaryText?: string | null;
  matchedKeywords?: string[];
};

export function selectRelatedCoverage(
  lead: RelatedCoverageCandidate,
  candidates: RelatedCoverageCandidate[],
  limit = 4,
) {
  const seenUrls = new Set<string>();
  const sourceCounts = new Map<string, number>();
  const leadTokens = tokenize(`${lead.title} ${lead.summaryText ?? ""}`);
  const leadKeywords = new Set((lead.matchedKeywords ?? []).map(normalizeValue).filter(Boolean));

  return candidates
    .filter((candidate) => isValidStoryUrl(candidate.url))
    .filter((candidate) => {
      const canonical = normalizeUrl(candidate.url);
      if (!canonical || seenUrls.has(canonical)) {
        return false;
      }
      seenUrls.add(canonical);
      return true;
    })
    .map((candidate) => ({
      candidate,
      score: relevanceScore(candidate, leadTokens, leadKeywords),
    }))
    .filter(({ score }, index) => score >= 0.16 || index === 0)
    .sort((left, right) => right.score - left.score)
    .filter(({ candidate }) => {
      const normalizedSource = normalizeValue(candidate.sourceName);
      const current = sourceCounts.get(normalizedSource) ?? 0;
      if (current >= 1) {
        return false;
      }
      sourceCounts.set(normalizedSource, current + 1);
      return true;
    })
    .slice(0, limit)
    .map(({ candidate }) => ({
      title: candidate.title,
      url: candidate.url,
      sourceName: candidate.sourceName,
    }));
}

function relevanceScore(
  candidate: RelatedCoverageCandidate,
  leadTokens: Set<string>,
  leadKeywords: Set<string>,
) {
  const candidateTokens = tokenize(`${candidate.title} ${candidate.summaryText ?? ""}`);
  const overlap = [...candidateTokens].filter((token) => leadTokens.has(token)).length;
  const union = new Set([...leadTokens, ...candidateTokens]).size || 1;
  const tokenScore = overlap / union;
  const keywordOverlap = (candidate.matchedKeywords ?? [])
    .map(normalizeValue)
    .filter((keyword) => leadKeywords.has(keyword)).length;

  return tokenScore + keywordOverlap * 0.12;
}

function tokenize(value: string) {
  return new Set(
    normalizeValue(value)
      .split(/\s+/)
      .filter((part) => part.length > 2),
  );
}

function normalizeValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function isValidStoryUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
