type Category = "Tech" | "Finance" | "Politics";

export type NewsletterCandidate = {
  headline: string;
  source: string;
  body: string;
  url: string;
  category: Category | null;
  newsletterCount: number;
};

export type RssCandidate = {
  headline: string;
  source: string;
  body: string;
  url: string;
  category: Category | null;
  baseScore: number;
};

export type MergedCandidate = {
  headline: string;
  source: string;
  body: string;
  url: string;
  category: Category | null;
  newsletterCoOccurrence: number;
  sourceOverlap: boolean;
  baseScore: number;
};

function normalizeHeadline(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): Set<string> {
  return new Set(
    normalizeHeadline(text)
      .split(" ")
      .filter((t) => t.length > 2),
  );
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  const intersection = new Set([...setA].filter((t) => setB.has(t)));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

function normalizeUrl(url: string): string {
  return url.toLowerCase().replace(/\/$/, "").replace(/^https?:\/\//, "");
}

const SIMILARITY_THRESHOLD = 0.75;

export function deduplicateCandidates(
  newsletterCandidates: NewsletterCandidate[],
  rssCandidates: RssCandidate[],
): MergedCandidate[] {
  const result: MergedCandidate[] = [];
  const usedNewsletterIndices = new Set<number>();

  for (const rss of rssCandidates) {
    let maxSimilarity = 0;
    let matchedIdx = -1;

    for (let i = 0; i < newsletterCandidates.length; i++) {
      if (usedNewsletterIndices.has(i)) continue;
      const nl = newsletterCandidates[i];

      if (rss.url && nl.url && normalizeUrl(rss.url) === normalizeUrl(nl.url)) {
        maxSimilarity = 1;
        matchedIdx = i;
        break;
      }

      const similarity = jaccardSimilarity(rss.headline, nl.headline);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        matchedIdx = i;
      }
    }

    if (maxSimilarity >= SIMILARITY_THRESHOLD && matchedIdx >= 0) {
      const nl = newsletterCandidates[matchedIdx];
      usedNewsletterIndices.add(matchedIdx);
      result.push({
        headline: rss.headline,
        source: rss.source,
        body: rss.body,
        url: rss.url,
        category: rss.category ?? nl.category,
        newsletterCoOccurrence: nl.newsletterCount,
        sourceOverlap: true,
        baseScore: rss.baseScore,
      });
    } else {
      result.push({
        headline: rss.headline,
        source: rss.source,
        body: rss.body,
        url: rss.url,
        category: rss.category,
        newsletterCoOccurrence: 0,
        sourceOverlap: false,
        baseScore: rss.baseScore,
      });
    }
  }

  for (let i = 0; i < newsletterCandidates.length; i++) {
    if (usedNewsletterIndices.has(i)) continue;
    const nl = newsletterCandidates[i];
    if (nl.newsletterCount >= 2) {
      result.push({
        headline: nl.headline,
        source: nl.source,
        body: nl.body,
        url: nl.url,
        category: nl.category,
        newsletterCoOccurrence: nl.newsletterCount,
        sourceOverlap: false,
        baseScore: 50,
      });
    }
  }

  return result;
}
