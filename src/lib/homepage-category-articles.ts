import { classifyHomepageCategory, HOMEPAGE_CATEGORY_CONFIG } from "@/lib/homepage-taxonomy";
import { logServerEvent } from "@/lib/observability";
import { cleanText, normalizeUrl, stableId } from "@/lib/pipeline/shared/text";
import { isLikelyPaywalledArticleSource } from "@/lib/source-accessibility";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type {
  BriefingItem,
  HomepageArticleCategory,
  HomepageCategoryArticle,
  HomepageCategoryArticleMap,
} from "@/lib/types";

export const HOMEPAGE_CATEGORY_ARTICLE_LIMIT = 12;
const HOMEPAGE_CATEGORY_ARTICLE_QUERY_LIMIT = 1000;
const LATEST_CRON_RUN_COUNT = 2;

type StoredPipelineArticleCandidate = {
  id?: string | null;
  run_id: string | null;
  ingested_at: string | null;
  source_name: string | null;
  canonical_url: string | null;
  title: string | null;
  summary: string | null;
  keywords: string[] | null;
  published_at?: string | null;
};

type PipelineArticleCandidateQueryResult = {
  data: StoredPipelineArticleCandidate[];
  error: unknown | null;
};

export function createEmptyHomepageCategoryArticleMap(): HomepageCategoryArticleMap {
  return {
    tech: [],
    finance: [],
    politics: [],
  };
}

function isMissingPublishedAtColumnError(error: unknown) {
  const maybeError = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const haystack = [maybeError.code, maybeError.message, maybeError.details, maybeError.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return (
    haystack.includes("42703") ||
    (haystack.includes("published_at") &&
      (haystack.includes("does not exist") || haystack.includes("could not find")))
  );
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return String(error);
}

function normalizeTitleKey(value: string) {
  return cleanText(value).toLowerCase();
}

function normalizeArticleUrlKey(value: string) {
  return normalizeUrl(value).toLowerCase();
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function collectSignalExclusions(items: BriefingItem[]) {
  const urls = new Set<string>();
  const titles = new Set<string>();

  for (const item of items) {
    titles.add(normalizeTitleKey(item.title));
    [...item.sources, ...(item.relatedArticles ?? [])].forEach((source) => {
      if (source.url && isHttpUrl(source.url)) {
        urls.add(normalizeArticleUrlKey(source.url));
      }
    });
  }

  return { urls, titles };
}

function getLatestRunIds(rows: StoredPipelineArticleCandidate[]) {
  const runIds: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const runId = row.run_id?.trim();

    if (!runId || seen.has(runId)) {
      continue;
    }

    runIds.push(runId);
    seen.add(runId);

    if (runIds.length === LATEST_CRON_RUN_COUNT) {
      break;
    }
  }

  return new Set(runIds);
}

function classifyArticle(row: StoredPipelineArticleCandidate): HomepageArticleCategory | null {
  const classification = classifyHomepageCategory({
    topicName: row.source_name ?? undefined,
    title: row.title ?? undefined,
    summary: row.summary ?? undefined,
    matchedKeywords: row.keywords ?? undefined,
    sourceNames: row.source_name ? [row.source_name] : [],
  });

  return classification.primaryCategory;
}

function mapCandidateToArticle(
  row: StoredPipelineArticleCandidate,
  category: HomepageArticleCategory,
): HomepageCategoryArticle | null {
  const title = cleanText(row.title);
  const sourceName = cleanText(row.source_name) || "Source";
  const url = cleanText(row.canonical_url);
  const ingestedAt = row.ingested_at ?? new Date(0).toISOString();
  const publishedAt = row.published_at ?? ingestedAt;

  if (!title || !url || !isHttpUrl(url)) {
    return null;
  }

  return {
    id: row.id ?? stableId(row.run_id ?? "", url, title),
    category,
    title,
    sourceName,
    url,
    summary: cleanText(row.summary),
    publishedAt,
    ingestedAt,
    runId: row.run_id ?? "",
  };
}

function compareArticlesByFreshness(left: HomepageCategoryArticle, right: HomepageCategoryArticle) {
  const leftTime = Date.parse(left.publishedAt || left.ingestedAt);
  const rightTime = Date.parse(right.publishedAt || right.ingestedAt);

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return left.title.localeCompare(right.title);
}

export function selectHomepageCategoryArticles(input: {
  rows: StoredPipelineArticleCandidate[];
  excludedSignalItems?: BriefingItem[];
}): HomepageCategoryArticleMap {
  const result = createEmptyHomepageCategoryArticleMap();
  const latestRunIds = getLatestRunIds(input.rows);
  const signalExclusions = collectSignalExclusions(input.excludedSignalItems ?? []);
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  for (const row of input.rows) {
    const runId = row.run_id?.trim();
    const url = cleanText(row.canonical_url);
    const title = cleanText(row.title);

    if (!runId || !latestRunIds.has(runId) || !url || !title || !isHttpUrl(url)) {
      continue;
    }

    if (isLikelyPaywalledArticleSource({ sourceName: row.source_name, url })) {
      continue;
    }

    const urlKey = normalizeArticleUrlKey(url);
    const titleKey = normalizeTitleKey(title);

    if (
      seenUrls.has(urlKey) ||
      seenTitles.has(titleKey) ||
      signalExclusions.urls.has(urlKey) ||
      signalExclusions.titles.has(titleKey)
    ) {
      continue;
    }

    const category = classifyArticle(row);

    if (!category) {
      continue;
    }

    const article = mapCandidateToArticle(row, category);

    if (!article) {
      continue;
    }

    result[category].push(article);
    seenUrls.add(urlKey);
    seenTitles.add(titleKey);
  }

  for (const category of HOMEPAGE_CATEGORY_CONFIG) {
    result[category.key] = result[category.key]
      .sort(compareArticlesByFreshness)
      .slice(0, HOMEPAGE_CATEGORY_ARTICLE_LIMIT);
  }

  return result;
}

async function queryPipelineArticleCandidates(
  client: NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>,
  selectColumns: string,
): Promise<PipelineArticleCandidateQueryResult> {
  const result = await client
    .from("pipeline_article_candidates")
    .select(selectColumns)
    .order("ingested_at", { ascending: false })
    .limit(HOMEPAGE_CATEGORY_ARTICLE_QUERY_LIMIT);

  return {
    data: (result.data ?? []) as unknown as StoredPipelineArticleCandidate[],
    error: result.error,
  };
}

export async function loadHomepageCategoryArticles(input: {
  excludedSignalItems?: BriefingItem[];
  route?: string;
} = {}): Promise<HomepageCategoryArticleMap> {
  const client = createSupabaseServiceRoleClient();

  if (!client) {
    return createEmptyHomepageCategoryArticleMap();
  }

  const baseSelect = "id, run_id, ingested_at, source_name, canonical_url, title, summary, keywords";
  let result = await queryPipelineArticleCandidates(client, `${baseSelect}, published_at`);

  if (result.error && isMissingPublishedAtColumnError(result.error)) {
    result = await queryPipelineArticleCandidates(client, baseSelect);
  }

  if (result.error) {
    logServerEvent("warn", "Homepage category article candidates could not be loaded", {
      route: input.route ?? "/",
      errorMessage: getErrorMessage(result.error),
    });
    return createEmptyHomepageCategoryArticleMap();
  }

  return selectHomepageCategoryArticles({
    rows: result.data,
    excludedSignalItems: input.excludedSignalItems,
  });
}
