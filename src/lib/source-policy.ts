export type SourcePreferenceTier = "tier1" | "tier2" | "tier3";
export type SourcePreferenceClassification = SourcePreferenceTier | "unknown";

export type SourcePreferenceRule = {
  tier: SourcePreferenceTier;
  hosts: string[];
  names: string[];
};

export const SOURCE_PREFERENCE_RULES: SourcePreferenceRule[] = [
  {
    tier: "tier1",
    hosts: [
      "reuters.com",
      "apnews.com",
      "ft.com",
      "bloomberg.com",
      "wsj.com",
      "nytimes.com",
      "washingtonpost.com",
      "economist.com",
      "imf.org",
      "worldbank.org",
      "oecd.org",
      "sec.gov",
      "federalreserve.gov",
      "newyorkfed.org",
      "stlouisfed.org",
      "frbsf.org",
      "bls.gov",
      "europa.eu",
      "ec.europa.eu",
      "whitehouse.gov",
      "treasury.gov",
      "propublica.org",
    ],
    names: [
      "reuters",
      "associated press",
      "ap news",
      "financial times",
      "bloomberg",
      "wall street journal",
      "new york times",
      "washington post",
      "economist",
      "international monetary fund",
      "world bank",
      "federal reserve",
      "federal reserve bank of new york",
      "liberty street economics",
      "federal reserve bank of st louis",
      "st louis fed",
      "fred blog",
      "federal reserve bank of san francisco",
      "sf fed",
      "bureau of labor statistics",
      "bls",
      "u.s. securities and exchange commission",
      "propublica",
    ],
  },
  {
    tier: "tier2",
    hosts: [
      "techcrunch.com",
      "arstechnica.com",
      "theinformation.com",
      "semafor.com",
      "axios.com",
      "404media.co",
      "heatmap.news",
      "theverge.com",
      "tldr.tech",
      "marketwatch.com",
      "nikkei.com",
      "technologyreview.com",
      "bbc.com",
      "bbc.co.uk",
      "theguardian.com",
      "pbs.org",
      "france24.com",
      "foreignaffairs.com",
      "foreignpolicy.com",
      "thediplomat.com",
      "politico.com",
      "npr.org",
      "cnbc.com",
    ],
    names: [
      "techcrunch",
      "ars technica",
      "the information",
      "semafor",
      "axios",
      "404 media",
      "heatmap",
      "the verge",
      "tldr",
      "marketwatch",
      "nikkei",
      "mit technology review",
      "bbc world news",
      "bbc",
      "guardian",
      "pbs newshour",
      "france24",
      "foreign affairs",
      "foreign policy",
      "the diplomat",
      "politico",
      "npr",
      "cnbc",
    ],
  },
  {
    tier: "tier3",
    hosts: [
      "gdeltproject.org",
      "thenewsapi.com",
      "newsapi.org",
      "substack.com",
      "medium.com",
      "blogspot.com",
      "ycombinator.com",
    ],
    names: [
      "gdelt",
      "thenewsapi",
      "newsapi",
      "substack",
      "medium",
      "newsletter",
      "blog",
      "hacker news",
    ],
  },
];

function normalizeSourceValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function getHostname(value: string | undefined) {
  if (!value) return null;

  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function classifySourcePreference(input: {
  sourceName: string;
  url?: string;
  sourceFeedUrl?: string | null;
  sourceHomepageUrl?: string | null;
}): SourcePreferenceClassification {
  const sourceName = normalizeSourceValue(input.sourceName);
  const hosts = [
    input.url,
    input.sourceFeedUrl ?? undefined,
    input.sourceHomepageUrl ?? undefined,
  ]
    .map(getHostname)
    .filter((value): value is string => Boolean(value));

  for (const rule of SOURCE_PREFERENCE_RULES) {
    if (
      rule.names.some((name) => sourceName.includes(normalizeSourceValue(name))) ||
      rule.hosts.some((host) => hosts.some((candidateHost) => candidateHost === host || candidateHost.endsWith(`.${host}`)))
    ) {
      return rule.tier;
    }
  }

  return "unknown";
}
