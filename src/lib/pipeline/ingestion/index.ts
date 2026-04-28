import type { Source } from "@/lib/types";
import {
  getActiveSourceRegistry,
  getDefaultDonorFeeds,
  getIngestionAdapter,
  getProbationaryRuntimeFeeds,
  type DonorFeed,
} from "@/adapters/donors";
import type { SourceDefinition } from "@/lib/integration/subsystem-contracts";
import type { RawItem } from "@/lib/models/raw-item";
import { logPipelineEvent } from "@/lib/observability/logger";
import { captureRssFailure, classifyRssFailure } from "@/lib/observability/rss";
import {
  buildRuntimeSourceResolutionSnapshot,
  type RuntimeSourceResolutionSnapshot,
} from "@/lib/observability/pipeline-run";
import { fetchFeedArticles } from "@/lib/rss";
import { sanitizeUrl } from "@/lib/sentry-config";
import {
  buildArticleSourceAccessibility,
  buildFailedSourceAccessibility,
  inferSourceRole,
  normalizeSourceTier,
  summarizeSourceAccessibility,
} from "@/lib/source-accessibility";
import type { SourceAccessibilityDiagnostics } from "@/lib/source-accessibility-types";
import { getPublicSourceGovernance } from "@/lib/source-manifest";
import { classifySourcePreference } from "@/lib/source-policy";
import { cleanText, stableId } from "@/lib/pipeline/shared/text";

import { seedRawItems } from "./seed-items";

type IngestionFailure = {
  source_id: string;
  source: string;
  feedUrl: string;
  failure_type: string;
  error: string;
  source_accessibility: SourceAccessibilityDiagnostics;
};

type IngestionResult = {
  items: RawItem[];
  failures: IngestionFailure[];
  usedSeedFallback: boolean;
  sources: SourceDefinition[];
  source_resolution: RuntimeSourceResolutionSnapshot;
  source_contributions: Array<{
    source_id: string;
    source: string;
    donor: string;
    topic: string;
    source_class: string;
    trust_tier: string;
    source_tier: string;
    source_role: string;
    public_eligible: boolean;
    content_accessibility: string;
    accessible_text_length_max: number;
    extraction_method: string;
    fetch_status: string;
    parse_status: string;
    failure_reason: string | null;
    functional_for_core: boolean;
    functional_for_context: boolean;
    functional_for_depth: boolean;
    accessibility_warnings: string[];
    core_blocking_reasons: string[];
    item_count: number;
  }>;
};

function classifyCustomSourceTopic(topicName?: string) {
  const normalized = topicName?.trim().toLowerCase();

  if (normalized === "finance") {
    return {
      topic: "Finance" as const,
      credibility: 80,
      reliability: 0.8,
      sourceClass: "business_press" as const,
      trustTier: "tier_2" as const,
      provenance: "specialist_analysis" as const,
    };
  }

  if (normalized === "world" || normalized === "geopolitics" || normalized === "politics") {
    return {
      topic: "World" as const,
      credibility: 82,
      reliability: 0.82,
      sourceClass: "general_newswire" as const,
      trustTier: "tier_2" as const,
      provenance: "primary_reporting" as const,
    };
  }

  return {
    topic: "Tech" as const,
    credibility: 76,
    reliability: 0.76,
    sourceClass: "specialist_press" as const,
    trustTier: "tier_2" as const,
    provenance: "specialist_analysis" as const,
  };
}

function buildCustomSourceDefinition(source: Source, options: { suppliedByManifest?: boolean } = {}): SourceDefinition {
  const metadata = classifyCustomSourceTopic(source.topicName);
  const sourcePolicyTier = classifySourcePreference({
    sourceName: source.name,
    sourceFeedUrl: source.feedUrl,
    sourceHomepageUrl: source.homepageUrl,
  });
  const governance = getPublicSourceGovernance(source.id);
  const trustTier = sourcePolicyTier === "tier1"
    ? "tier_1"
    : sourcePolicyTier === "tier2"
      ? "tier_2"
      : sourcePolicyTier === "tier3"
        ? "tier_3"
        : metadata.trustTier;
  const publicEligible = governance?.publicEligible ?? true;
  const sourceRole = governance?.sourceRole ?? inferSourceRole({
    sourceClass: metadata.sourceClass,
    trustTier,
    provenance: metadata.provenance,
    publicEligible,
  });

  return {
    sourceId: `custom-${source.id}`,
    donor: "openclaw",
    source: source.name,
    homepageUrl: source.homepageUrl ?? source.feedUrl,
    topic: metadata.topic,
    credibility: metadata.credibility,
    reliability: metadata.reliability,
    sourceClass: metadata.sourceClass,
    trustTier,
    provenance: metadata.provenance,
    status: source.status === "active" ? "active" : "inactive",
    availability: "custom",
    sourceRole,
    publicEligible,
    suppliedByManifest: Boolean(options.suppliedByManifest),
    fetch: {
      feedUrl: source.feedUrl,
      timeoutMs: 4500,
      retryCount: 1,
      maxItems: 6,
    },
    adapterOwner: "openclaw",
  };
}

function resolveIngestionSources(options: {
  sources?: Source[];
  suppliedByManifest?: boolean;
} = {}): SourceDefinition[] {
  const { sources, suppliedByManifest = false } = options;

  if (!sources?.length) {
    const sourceRegistryById = new Map(getActiveSourceRegistry().map((source) => [source.sourceId, source]));

    return [
      ...getDefaultDonorFeeds().map((feed) => {
        const source = sourceRegistryById.get(feed.id);

        if (!source) {
          throw new Error(`Default donor feed ${feed.id} is not present in the active source registry`);
        }

        return source;
      }),
      ...getProbationaryRuntimeFeeds().map((feed) => {
        const source = sourceRegistryById.get(feed.id);

        if (!source) {
          throw new Error(`Probationary runtime feed ${feed.id} is not present in the active source registry`);
        }

        return source;
      }),
    ];
  }

  const activeSources = sources.filter((source) => source.status === "active");
  /*
   * Keep user-supplied source lists capped so a signed-in account with many
   * Supabase sources cannot expand live fetch load without product review.
   * Public manifest lists are exempt because the manifest is the governed
   * size-bounding layer for public surfaces. Any future caller that passes
   * suppliedByManifest: true must be reviewed against this provenance rule.
   */
  const cappedSources = suppliedByManifest ? activeSources : activeSources.slice(0, 5);

  return cappedSources.map((source) => buildCustomSourceDefinition(source, { suppliedByManifest }));
}

export function resolveNoArgumentRuntimeSourceResolutionSnapshot(): RuntimeSourceResolutionSnapshot {
  return buildRuntimeSourceResolutionSnapshot({
    resolutionMode: "no_argument_runtime",
    resolvedSources: resolveIngestionSources(),
  });
}

async function fetchSourceWithAdapter(source: SourceDefinition) {
  const adapter = getIngestionAdapter(source.donor as DonorFeed["donor"]);

  if (!adapter) {
    throw new Error(`No ingestion adapter registered for donor ${source.donor}`);
  }

  const items = await adapter.fetchItems([{
    id: source.sourceId,
    donor: source.donor as DonorFeed["donor"],
    source: source.source,
    homepageUrl: source.homepageUrl,
    topic: source.topic,
    credibility: source.credibility,
    reliability: source.reliability,
        sourceClass: source.sourceClass,
        trustTier: source.trustTier,
        provenance: source.provenance,
        status: source.status,
        availability: source.availability,
        sourceRole: source.sourceRole,
        publicEligible: source.publicEligible,
        suppliedByManifest: source.suppliedByManifest,
        fetch: source.fetch,
      }], {
    fetchFeed: fetchFeedArticles,
    timeoutMs: source.fetch.timeoutMs ?? 4_500,
    retryCount: source.fetch.retryCount ?? 1,
  });

  return items;
}

function toRawItem(entry: Awaited<ReturnType<typeof fetchSourceWithAdapter>>[number]): RawItem {
  const sourceAccessibility = buildArticleSourceAccessibility(entry.article, entry.sourceDefinition);

  return {
    id: entry.article.stableId ?? stableId(entry.sourceDefinition.source, entry.article.url, entry.article.publishedAt),
    source: entry.article.sourceName || entry.sourceDefinition.source,
    title: cleanText(entry.article.title),
    url: entry.article.url,
    published_at: entry.article.publishedAt,
    raw_content: cleanText(entry.article.contentText ?? entry.article.summaryText),
    source_metadata: entry.sourceMetadata,
    source_accessibility: sourceAccessibility,
    discovery_metadata: entry.article.discoveryMetadata,
  };
}

export async function ingestRawItems(options: {
  sources?: Source[];
  suppliedByManifest?: boolean;
} = {}): Promise<IngestionResult> {
  const sources = resolveIngestionSources(options);
  const sourceResolution = buildRuntimeSourceResolutionSnapshot({
    resolutionMode: options.sources?.length ? "supplied_sources" : "no_argument_runtime",
    resolvedSources: sources,
  });
  const failures: IngestionFailure[] = [];

  logPipelineEvent("info", "Runtime source resolution snapshot", sourceResolution);

  const batches = await Promise.all(
    sources.map(async (source) => {
      try {
        const items = await fetchSourceWithAdapter(source);
        const maxItems = source.fetch.maxItems ?? 6;
        return items.slice(0, maxItems).map(toRawItem);
      } catch (error) {
        const failureType = classifyRssFailure(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const failedAccessibility = buildFailedSourceAccessibility({
          source,
          failureType,
          error: errorMessage,
        });
        const failure = {
          source_id: source.sourceId,
          source: source.source,
          feedUrl: sanitizeUrl(source.fetch.feedUrl),
          failure_type: failureType,
          error: errorMessage,
          source_accessibility: failedAccessibility,
        };
        failures.push(failure);
        captureRssFailure(error, {
          failureType,
          phase: "fetch",
          feedUrl: source.fetch.feedUrl,
          feedName: source.source,
          feedId: source.sourceId,
          retryCount: source.fetch.retryCount,
          timeoutMs: source.fetch.timeoutMs,
          level: "warning",
          message: "RSS source ingestion failed; pipeline will continue when other sources succeed.",
        });
        logPipelineEvent("warn", "Feed ingestion failed", failure);
        return [];
      }
    }),
  );

  const items = batches.flat();
  const failureBySourceId = new Map(failures.map((failure) => [failure.source_id, failure.source_accessibility]));
  const sourceContributions = sources.map((source) => ({
    source_id: source.sourceId,
    source: source.source,
    donor: source.donor,
    topic: source.topic,
    source_class: source.sourceClass,
    trust_tier: source.trustTier,
    item_count: items.filter((item) => item.source_metadata?.sourceId === source.sourceId).length,
    ...summarizeSourceAccessibility({
      source,
      diagnostics: items
        .filter((item) => item.source_metadata?.sourceId === source.sourceId)
        .map((item) => item.source_accessibility)
        .filter((value): value is SourceAccessibilityDiagnostics => Boolean(value)),
      failure: failureBySourceId.get(source.sourceId) ?? null,
    }),
  })).map((entry) => ({
    ...entry,
    source_tier: normalizeSourceTier(entry.trust_tier),
  }));

  logPipelineEvent("info", "Ingestion source contribution summary", {
    source_contributions: sourceContributions,
    used_seed_fallback: items.length === 0,
  });

  if (items.length > 0) {
    return {
      items,
      failures,
      usedSeedFallback: false,
      sources,
      source_resolution: sourceResolution,
      source_contributions: sourceContributions,
    };
  }

  logPipelineEvent("warn", "All live feed requests failed, using deterministic seed fallback", {
    failureCount: failures.length,
  });

  return {
    items: seedRawItems,
    failures,
    usedSeedFallback: true,
    sources,
    source_resolution: sourceResolution,
    source_contributions: sourceContributions,
  };
}
