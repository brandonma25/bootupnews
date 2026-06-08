import type { SupabaseClient } from "@supabase/supabase-js";

import { classifyHomepageCategory } from "@/lib/homepage-taxonomy";
import type { NormalizedArticle } from "@/lib/models/normalized-article";
import type { StoryCluster } from "@/lib/models/signal-cluster";
import { logPipelineEvent } from "@/lib/observability/logger";
import { jaccardSimilarity, normalizeUrl, tokenize } from "@/lib/pipeline/shared/text";
import { resolveSurfacePoolSize } from "@/lib/pipeline/surface-pool";
import type { RankedStoryClusterResult } from "@/lib/scoring/scoring-engine";
import type { ArticleFilterEvaluation } from "@/lib/signal-filtering";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const PIPELINE_ARTICLE_CANDIDATES_TABLE = "pipeline_article_candidates";
// PRD-53 remediation — the surfaced-cluster ceiling now tracks the editorial pool
// size (resolveSurfacePoolSize(), default 22) so candidate telemetry/digest
// reflects the widened review pool rather than a hard top-5.

type PipelineStageReached = "normalized" | "deduped" | "clustered" | "ranked" | "surfaced";
type CandidateDropReason =
  | "duplicate_url"
  | "duplicate_title"
  | "low_cluster_score"
  | "below_rank_threshold"
  | "diversity_capped"
  | "editorial_excluded";

type PipelineCandidateClient = Pick<SupabaseClient, "from">;

type CandidateUpdate = {
  article: NormalizedArticle;
  values: {
    cluster_id?: string | null;
    ranking_score?: number | null;
    surfaced?: boolean;
    pipeline_stage_reached: PipelineStageReached;
    drop_reason?: CandidateDropReason | null;
  };
};

type CandidateInsertRow = {
  run_id: string;
  ingested_at: string;
  source_name: string;
  source_tier: string | null;
  source_class: string | null;
  category: string | null;
  canonical_url: string;
  title: string;
  summary: string | null;
  keywords: string[] | null;
  entities: string[] | null;
  published_at: string;
  cluster_id: string | null;
  ranking_score: number | null;
  surfaced: boolean;
  pipeline_stage_reached: PipelineStageReached;
  drop_reason: CandidateDropReason | null;
};

// PRD-53 remediation — build the insert payload, optionally omitting the newest
// columns when the live schema is older than the code (migration not yet
// applied). Strip order: observability (source_class, category) first, then
// published_at (the previously-added column). Lets candidate telemetry persist
// instead of blanking out during the migration window.
function toCandidateInsertPayload(
  row: CandidateInsertRow,
  opts: { observability: boolean; publishedAt: boolean },
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    run_id: row.run_id,
    ingested_at: row.ingested_at,
    source_name: row.source_name,
    source_tier: row.source_tier,
    canonical_url: row.canonical_url,
    title: row.title,
    summary: row.summary,
    keywords: row.keywords,
    entities: row.entities,
    cluster_id: row.cluster_id,
    ranking_score: row.ranking_score,
    surfaced: row.surfaced,
    pipeline_stage_reached: row.pipeline_stage_reached,
    drop_reason: row.drop_reason,
  };
  if (opts.publishedAt) {
    payload.published_at = row.published_at;
  }
  if (opts.observability) {
    payload.source_class = row.source_class;
    payload.category = row.category;
  }
  return payload;
}

function getPipelineCandidateClient() {
  return createSupabaseServiceRoleClient();
}

function resolveCanonicalUrl(article: NormalizedArticle) {
  return (article.discovery_metadata?.normalizedUrl ?? normalizeUrl(article.url)).toLowerCase();
}

function getCandidateMatch(article: NormalizedArticle) {
  return {
    canonicalUrl: resolveCanonicalUrl(article),
    title: article.title,
    sourceName: article.source,
  };
}

function getCandidateKey(article: NormalizedArticle) {
  const match = getCandidateMatch(article);
  return JSON.stringify([article.id, match.canonicalUrl, match.title, match.sourceName]);
}

async function runPipelineCandidateWrite(
  label: string,
  runId: string,
  operation: (client: PipelineCandidateClient) => Promise<void>,
) {
  const client = getPipelineCandidateClient();

  if (!client) {
    logPipelineEvent("warn", "Pipeline article candidate persistence skipped", {
      run_id: runId,
      label,
      reason: "Supabase service role client is not configured.",
    });
    return;
  }

  try {
    await operation(client);
  } catch (error) {
    logPipelineEvent("warn", "Pipeline article candidate persistence failed without blocking the run", {
      run_id: runId,
      label,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function schedulePipelineCandidateWrite(
  label: string,
  runId: string,
  operation: (client: PipelineCandidateClient) => Promise<void>,
) {
  return runPipelineCandidateWrite(label, runId, operation);
}

function getSourceTier(article: NormalizedArticle) {
  const tier = article.source_metadata?.trustTier;
  return tier === "tier_1" || tier === "tier_2" || tier === "tier_3" ? tier : null;
}

async function applyCandidateUpdates(
  client: PipelineCandidateClient,
  runId: string,
  updates: CandidateUpdate[],
) {
  const results = await Promise.all(
    updates.map(({ article, values }) => {
      const match = getCandidateMatch(article);

      return client
        .from(PIPELINE_ARTICLE_CANDIDATES_TABLE)
        .update(values)
        .eq("run_id", runId)
        .eq("canonical_url", match.canonicalUrl)
        .eq("title", match.title)
        .eq("source_name", match.sourceName);
    }),
  );

  const error = results.find((result) => result.error)?.error;
  if (error) {
    throw error;
  }
}

function getDedupDropReasons(articles: NormalizedArticle[]) {
  const accepted: NormalizedArticle[] = [];
  const seenUrls = new Set<string>();
  const dropReasons = new Map<string, CandidateDropReason>();

  articles
    .slice()
    .sort(
      (left, right) =>
        new Date(right.published_at).getTime() - new Date(left.published_at).getTime(),
    )
    .forEach((article) => {
      const normalizedUrl = resolveCanonicalUrl(article);
      if (seenUrls.has(normalizedUrl)) {
        dropReasons.set(getCandidateKey(article), "duplicate_url");
        return;
      }

      const titleTokens = tokenize(article.title);
      const nearDuplicate = accepted.some((existing) => {
        const similarity = jaccardSimilarity(titleTokens, tokenize(existing.title));
        return similarity >= 0.82;
      });

      if (nearDuplicate) {
        dropReasons.set(getCandidateKey(article), "duplicate_title");
        return;
      }

      seenUrls.add(normalizedUrl);
      accepted.push(article);
    });

  return dropReasons;
}

function isMissingColumnError(error: unknown) {
  const maybeError = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const haystack = [maybeError.code, maybeError.message, maybeError.details, maybeError.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return (
    haystack.includes("42703") || // undefined_column
    haystack.includes("pgrst204") || // PostgREST: column not in schema cache
    haystack.includes("does not exist") ||
    haystack.includes("could not find")
  );
}

function getSourceClass(article: NormalizedArticle): string | null {
  return article.source_metadata?.sourceClass ?? null;
}

function getArticleCategory(article: NormalizedArticle): string | null {
  const classification = classifyHomepageCategory({
    title: article.title,
    summary: article.content,
    matchedKeywords: article.keywords,
    sourceNames: [article.source],
  });
  return classification.primaryCategory ?? null;
}

export async function persistNormalizedArticleCandidates({
  runId,
  articles,
  ingestedAt = new Date(),
}: {
  runId: string;
  articles: NormalizedArticle[];
  ingestedAt?: Date;
}) {
  if (!articles.length) {
    return;
  }

  await schedulePipelineCandidateWrite("normalized_insert", runId, async (client) => {
    const rows = articles.map((article): CandidateInsertRow => ({
      run_id: runId,
      ingested_at: ingestedAt.toISOString(),
      source_name: article.source,
      source_tier: getSourceTier(article),
      source_class: getSourceClass(article),
      category: getArticleCategory(article),
      canonical_url: resolveCanonicalUrl(article),
      title: article.title,
      summary: article.content || null,
      keywords: article.keywords.length ? article.keywords : null,
      entities: article.normalized_entities.length ? article.normalized_entities : article.entities,
      published_at: article.published_at,
      cluster_id: null,
      ranking_score: null,
      surfaced: false,
      pipeline_stage_reached: "normalized",
      drop_reason: null,
    }));

    // PRD-53 remediation — insert with the new observability columns; on an older
    // schema (migration not yet applied) retry with them stripped, then without
    // published_at, so candidate telemetry persists through the migration window.
    let result = await client
      .from(PIPELINE_ARTICLE_CANDIDATES_TABLE)
      .insert(rows.map((row) => toCandidateInsertPayload(row, { observability: true, publishedAt: true })));
    if (result.error && isMissingColumnError(result.error)) {
      result = await client
        .from(PIPELINE_ARTICLE_CANDIDATES_TABLE)
        .insert(rows.map((row) => toCandidateInsertPayload(row, { observability: false, publishedAt: true })));
    }
    if (result.error && isMissingColumnError(result.error)) {
      result = await client
        .from(PIPELINE_ARTICLE_CANDIDATES_TABLE)
        .insert(rows.map((row) => toCandidateInsertPayload(row, { observability: false, publishedAt: false })));
    }

    if (result.error) {
      throw result.error;
    }

    logPipelineEvent("info", "Persisted normalized article candidates", {
      run_id: runId,
      candidate_count: rows.length,
    });
  });
}

export async function updateArticleCandidateClusters({
  runId,
  clusters,
}: {
  runId: string;
  clusters: StoryCluster[];
}) {
  const updates = clusters.flatMap((cluster) =>
    cluster.articles.map((article) => ({
      article,
      values: {
        cluster_id: cluster.cluster_id,
        pipeline_stage_reached: "clustered" as const,
        drop_reason: null,
      },
    })),
  );

  if (!updates.length) {
    return;
  }

  await schedulePipelineCandidateWrite("cluster_update", runId, async (client) => {
    await applyCandidateUpdates(client, runId, updates);
    logPipelineEvent("info", "Updated article candidate cluster assignments", {
      run_id: runId,
      candidate_count: updates.length,
    });
  });
}

export async function updateArticleCandidateRankingOutcomes({
  runId,
  normalizedArticles,
  dedupedArticles,
  rankedClusters,
  filterEvaluations,
}: {
  runId: string;
  normalizedArticles: NormalizedArticle[];
  dedupedArticles: NormalizedArticle[];
  rankedClusters: RankedStoryClusterResult[];
  /**
   * PRD-53 remediation — article-id → eligibility-filter evaluation. Lets the
   * normalize-stage drop record drop_reason="editorial_excluded" for articles the
   * eligibility filter (applyArticleSelectionFiltering) suppressed/rejected, so
   * that previously-silent removal is no longer invisible.
   */
  filterEvaluations?: Map<string, ArticleFilterEvaluation>;
}) {
  if (!normalizedArticles.length) {
    return;
  }

  const surfacePoolSize = resolveSurfacePoolSize();
  const dedupedKeys = new Set(dedupedArticles.map(getCandidateKey));
  const dedupDropReasons = getDedupDropReasons(normalizedArticles);
  const rankedOutcomes = new Map<string, CandidateUpdate["values"]>();

  rankedClusters.forEach((entry, index) => {
    const surfaced = index < surfacePoolSize;
    const nonSurfaceReason: CandidateDropReason =
      entry.ranked.ranking_debug.diversity.action !== "none"
        ? "diversity_capped"
        : "below_rank_threshold";

    entry.cluster.articles.forEach((article) => {
      rankedOutcomes.set(getCandidateKey(article), {
        cluster_id: entry.cluster.cluster_id,
        ranking_score: entry.ranked.score,
        surfaced,
        pipeline_stage_reached: surfaced ? "surfaced" : "ranked",
        drop_reason: surfaced ? null : nonSurfaceReason,
      });
    });
  });

  const updates = normalizedArticles.map((article) => {
    const key = getCandidateKey(article);
    const rankedOutcome = rankedOutcomes.get(key);

    if (rankedOutcome) {
      return {
        article,
        values: rankedOutcome,
      };
    }

    if (!dedupedKeys.has(key)) {
      // PRD-53 remediation — surface the previously-silent eligibility filter: if
      // applyArticleSelectionFiltering suppressed/rejected this article it never
      // reached dedup/clustering, so record editorial_excluded rather than a null
      // drop_reason indistinguishable from a dedup fold.
      const filterDecision = filterEvaluations?.get(article.id)?.filterDecision;
      const eligibilityDropped = filterDecision === "reject" || filterDecision === "suppress";
      return {
        article,
        values: {
          ranking_score: null,
          surfaced: false,
          pipeline_stage_reached: "normalized" as const,
          drop_reason: eligibilityDropped ? "editorial_excluded" : dedupDropReasons.get(key) ?? null,
        },
      };
    }

    return {
      article,
      values: {
        ranking_score: null,
        surfaced: false,
        pipeline_stage_reached: "deduped" as const,
        drop_reason: "low_cluster_score" as const,
      },
    };
  });

  await schedulePipelineCandidateWrite("ranking_surface_update", runId, async (client) => {
    await applyCandidateUpdates(client, runId, updates);
    logPipelineEvent("info", "Updated article candidate ranking outcomes", {
      run_id: runId,
      candidate_count: updates.length,
      surfaced_count: updates.filter((entry) => entry.values.surfaced).length,
    });
  });
}
