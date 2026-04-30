import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  parseEditorialWhyItMattersContent,
  type EditorialWhyItMattersContent,
} from "@/lib/editorial-content";
import type { BriefingItem, DashboardData } from "@/lib/types";

type PublishedSignalPostRow = {
  title: string | null;
  source_url: string | null;
  published_why_it_matters: string | null;
  published_why_it_matters_payload: unknown | null;
  editorial_status: string | null;
  editorial_decision: string | null;
  published_at: string | null;
};

export type PublishedHomepageEditorialOverride = {
  title: string;
  sourceUrl: string;
  whyItMatters: string;
  structuredWhyItMatters: EditorialWhyItMattersContent | null;
};

function normalizeMatchValue(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function normalizeEditorialText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function isPubliclyAllowedEditorialDecision(value: string | null | undefined) {
  return value === null || value === undefined || value === "approved" || value === "draft_edited";
}

function getItemSourceUrl(item: BriefingItem) {
  return item.sources[0]?.url ?? item.relatedArticles?.[0]?.url ?? "";
}

function buildOverrideKey(title: string, sourceUrl: string) {
  const normalizedTitle = normalizeMatchValue(title);
  const normalizedSourceUrl = normalizeMatchValue(sourceUrl);

  return normalizedSourceUrl ? `${normalizedTitle}::${normalizedSourceUrl}` : normalizedTitle;
}

function buildOverrideIndexes(overrides: PublishedHomepageEditorialOverride[]) {
  const byTitleAndSource = new Map<string, PublishedHomepageEditorialOverride>();
  const byTitle = new Map<string, PublishedHomepageEditorialOverride>();

  overrides.forEach((override) => {
    const title = normalizeMatchValue(override.title);
    const sourceUrl = normalizeMatchValue(override.sourceUrl);

    if (!title) {
      return;
    }

    if (sourceUrl) {
      byTitleAndSource.set(buildOverrideKey(title, sourceUrl), override);
    }

    if (!byTitle.has(title)) {
      byTitle.set(title, override);
    }
  });

  return {
    byTitleAndSource,
    byTitle,
  };
}

export function applyPublishedHomepageEditorialOverrides(
  items: BriefingItem[],
  overrides: PublishedHomepageEditorialOverride[],
) {
  if (items.length === 0 || overrides.length === 0) {
    return items;
  }

  const indexes = buildOverrideIndexes(overrides);

  return items.map((item) => {
    const title = normalizeMatchValue(item.title);
    const sourceUrl = normalizeMatchValue(getItemSourceUrl(item));
    const override =
      indexes.byTitleAndSource.get(buildOverrideKey(title, sourceUrl)) ??
      indexes.byTitle.get(title);

    if (!override) {
      return item;
    }

    return {
      ...item,
      whyItMatters: override.whyItMatters,
      publishedWhyItMatters: override.whyItMatters,
      publishedWhyItMattersStructured: override.structuredWhyItMatters,
      editorialWhyItMatters: override.structuredWhyItMatters,
      editorialStatus: "published" as const,
    };
  });
}

export async function getPublishedHomepageEditorialOverrides(): Promise<
  PublishedHomepageEditorialOverride[]
> {
  const client = createSupabaseServiceRoleClient();

  if (!client) {
    return [];
  }

  const result = await client
    .from("signal_posts")
    .select("title, source_url, published_why_it_matters, published_why_it_matters_payload, editorial_status, editorial_decision, published_at")
    .eq("is_live", true)
    .eq("editorial_status", "published")
    .not("published_at", "is", null)
    .order("rank", { ascending: true })
    .limit(5);

  if (result.error) {
    return [];
  }

  return ((result.data ?? []) as PublishedSignalPostRow[])
    .filter((row) => isPubliclyAllowedEditorialDecision(row.editorial_decision))
    .map((row) => ({
      title: normalizeEditorialText(row.title),
      sourceUrl: normalizeEditorialText(row.source_url),
      whyItMatters: normalizeEditorialText(row.published_why_it_matters),
      structuredWhyItMatters: parseEditorialWhyItMattersContent(row.published_why_it_matters_payload),
    }))
    .filter((override) => override.title && override.whyItMatters);
}

export async function applyHomepageEditorialOverridesToDashboardData(
  data: DashboardData,
): Promise<DashboardData> {
  const overrides = await getPublishedHomepageEditorialOverrides();

  if (overrides.length === 0) {
    return data;
  }

  return {
    ...data,
    briefing: {
      ...data.briefing,
      items: applyPublishedHomepageEditorialOverrides(data.briefing.items, overrides),
    },
  };
}
