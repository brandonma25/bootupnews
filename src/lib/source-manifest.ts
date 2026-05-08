import { demoSources } from "@/lib/demo-data";
import { classifySourcePreference } from "@/lib/source-policy";
import type { SourceRole } from "@/lib/source-accessibility-types";
import type { Source } from "@/lib/types";

export const PUBLIC_SURFACE_SOURCE_MANIFEST = {
  "public.home": [
    "source-verge",
    "source-ars",
    "source-mit-tech-review",
    "source-hacker-news-best",
    "source-techcrunch",
    "source-404-media",
    "source-ft",
    "source-reuters-business",
    "source-npr-business",
    "source-npr-economy",
    "source-fed-press-all",
    "source-fed-monetary-policy",
    "source-sec-press-releases",
    "source-bls-latest",
    "source-bls-cpi",
    "source-bls-employment-situation",
    "source-cnbc-business",
    "source-cnbc-economy",
    "source-cnbc-finance",
    "source-marketwatch",
    "source-heatmap",
    "source-liberty-street-economics",
    "source-fred-blog",
    "source-fed-feds-notes",
    "source-sf-fed-research-insights",
    "source-stlouisfed-on-the-economy",
    "source-bbc-world",
    "source-guardian-world",
    "source-foreign-affairs",
    "source-the-diplomat",
    "source-npr-world",
    "source-foreign-policy",
    "source-npr-politics",
    "source-pbs-newshour",
    "source-france24",
    "source-propublica-main",
    "source-semafor",
    "source-axios",
    "source-cnbc-politics",
    "source-politico-politics",
    "source-politico-congress",
    "source-politico-defense",
  ],
} as const;

export type PublicSurfaceKey = keyof typeof PUBLIC_SURFACE_SOURCE_MANIFEST;
export type PublicSourceRole = SourceRole;

export type PublicSourcePlanEntry = {
  id: string;
  displayName: string;
  category: string | null;
  feedUrl: string;
  homepageUrl: string | null;
  status: Source["status"];
  sourceRole: PublicSourceRole;
  sourceTier: ReturnType<typeof classifySourcePreference>;
  publicEligible: boolean;
};

export type PublicSourcePlan = {
  plan: "public_manifest";
  surface: PublicSurfaceKey;
  suppliedByManifest: true;
  sourceCount: number;
  sourceIds: string[];
  sources: PublicSourcePlanEntry[];
  warnings: string[];
};

const MANIFEST_SOURCE_IDS: ReadonlySet<string> = new Set(Object.values(PUBLIC_SURFACE_SOURCE_MANIFEST).flat());
const PUBLIC_SOURCE_GOVERNANCE: Record<string, { sourceRole: PublicSourceRole; publicEligible: boolean }> = {
  "source-verge": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-ars": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-mit-tech-review": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-hacker-news-best": {
    sourceRole: "corroboration_only",
    publicEligible: true,
  },
  "source-techcrunch": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-404-media": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-ft": {
    sourceRole: "primary_authoritative",
    publicEligible: true,
  },
  "source-reuters-business": {
    sourceRole: "primary_authoritative",
    publicEligible: true,
  },
  "source-npr-business": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-npr-economy": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-fed-press-all": {
    sourceRole: "primary_institutional",
    publicEligible: true,
  },
  "source-fed-monetary-policy": {
    sourceRole: "primary_institutional",
    publicEligible: true,
  },
  "source-sec-press-releases": {
    sourceRole: "primary_institutional",
    publicEligible: true,
  },
  "source-bls-latest": {
    sourceRole: "primary_institutional",
    publicEligible: true,
  },
  "source-bls-cpi": {
    sourceRole: "primary_institutional",
    publicEligible: true,
  },
  "source-bls-employment-situation": {
    sourceRole: "primary_institutional",
    publicEligible: true,
  },
  "source-cnbc-business": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-cnbc-economy": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-cnbc-finance": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-marketwatch": {
    sourceRole: "corroboration_only",
    publicEligible: true,
  },
  "source-heatmap": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-liberty-street-economics": {
    sourceRole: "primary_institutional",
    publicEligible: true,
  },
  "source-fred-blog": {
    sourceRole: "primary_institutional",
    publicEligible: true,
  },
  "source-fed-feds-notes": {
    sourceRole: "primary_institutional",
    publicEligible: true,
  },
  "source-sf-fed-research-insights": {
    sourceRole: "primary_institutional",
    publicEligible: true,
  },
  "source-stlouisfed-on-the-economy": {
    sourceRole: "primary_institutional",
    publicEligible: true,
  },
  "source-bbc-world": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-guardian-world": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-foreign-affairs": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-the-diplomat": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-npr-world": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-foreign-policy": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-npr-politics": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-pbs-newshour": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-france24": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-propublica-main": {
    sourceRole: "primary_authoritative",
    publicEligible: true,
  },
  "source-semafor": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-axios": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-cnbc-politics": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-politico-politics": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-politico-congress": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
  "source-politico-defense": {
    sourceRole: "secondary_authoritative",
    publicEligible: true,
  },
};

function normalizeSourceId(sourceId: string) {
  return sourceId.startsWith("custom-") ? sourceId.slice("custom-".length) : sourceId;
}

export function getPublicSourceGovernance(sourceId: string) {
  return PUBLIC_SOURCE_GOVERNANCE[normalizeSourceId(sourceId)] ?? null;
}

export function getSourcesForPublicSurface(surface: PublicSurfaceKey): Source[] {
  const sourceIds = PUBLIC_SURFACE_SOURCE_MANIFEST[surface];
  const sourcesById = new Map(demoSources.map((source) => [source.id, source]));

  return sourceIds.map((sourceId) => {
    const source = sourcesById.get(sourceId);

    if (!source) {
      throw new Error(`Public source manifest for ${surface} references missing demoSources entry ${sourceId}`);
    }

    return source;
  });
}

export function getRequiredSourcesForPublicSurface(surface: PublicSurfaceKey): Source[] {
  const sources = getSourcesForPublicSurface(surface);

  if (sources.length === 0) {
    throw new Error(`source_pool_unavailable: Public source manifest for ${surface} resolved zero sources.`);
  }

  return sources;
}

function buildPublicSourcePlanEntry(source: Source): PublicSourcePlanEntry {
  const governance = PUBLIC_SOURCE_GOVERNANCE[source.id];

  if (!governance) {
    throw new Error(`Public source manifest source ${source.id} is missing public source governance metadata`);
  }

  return {
    id: source.id,
    displayName: source.name,
    category: source.topicName ?? null,
    feedUrl: source.feedUrl,
    homepageUrl: source.homepageUrl ?? null,
    status: source.status,
    sourceRole: governance.sourceRole,
    sourceTier: classifySourcePreference({
      sourceName: source.name,
      sourceFeedUrl: source.feedUrl,
      sourceHomepageUrl: source.homepageUrl,
    }),
    publicEligible: governance.publicEligible,
  };
}

export function getPublicSourcePlanForSurface(surface: PublicSurfaceKey): PublicSourcePlan {
  const sources = getRequiredSourcesForPublicSurface(surface);
  const entries = sources.map(buildPublicSourcePlanEntry);
  const warnings = [
    entries.some((entry) => !entry.publicEligible) ? "manifest_contains_non_public_source" : null,
    entries.some((entry) => entry.sourceTier === "unknown") ? "manifest_contains_unknown_source_tier" : null,
    entries.some((entry) => entry.status !== "active") ? "manifest_contains_inactive_source" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    plan: "public_manifest",
    surface,
    suppliedByManifest: true,
    sourceCount: entries.length,
    sourceIds: entries.map((source) => source.id),
    sources: entries,
    warnings,
  };
}

export function isManifestSourceList(sources: Source[]): boolean {
  return sources.every((source) => MANIFEST_SOURCE_IDS.has(source.id));
}
