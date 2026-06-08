import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedArticle } from "@/lib/models/normalized-article";
import type { ArticleFilterEvaluation } from "@/lib/signal-filtering";

const captured: { inserts: Record<string, unknown>[][]; updates: Record<string, unknown>[] } = {
  inserts: [],
  updates: [],
};

// Minimal PostgREST builder double: .update(values).eq().eq()... is thenable and
// resolves to { error: null }; .insert(rows) captures the payload.
function makeEqChain() {
  const chain: Record<string, unknown> = {};
  chain.eq = () => chain;
  chain.then = (resolve: (value: { error: null }) => unknown) => resolve({ error: null });
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: () => ({
    from: () => ({
      insert: (rows: Record<string, unknown>[]) => {
        captured.inserts.push(rows);
        return Promise.resolve({ error: null });
      },
      update: (values: Record<string, unknown>) => {
        captured.updates.push(values);
        return makeEqChain();
      },
    }),
  }),
}));

import {
  persistNormalizedArticleCandidates,
  updateArticleCandidateRankingOutcomes,
} from "@/lib/pipeline/article-candidates";

function makeArticle(overrides: Partial<NormalizedArticle> & { id: string }): NormalizedArticle {
  return {
    id: overrides.id,
    title: overrides.title ?? `Title ${overrides.id}`,
    source: overrides.source ?? "Reuters",
    url: overrides.url ?? `https://example.com/${overrides.id}`,
    published_at: overrides.published_at ?? "2026-06-08T00:00:00.000Z",
    content: overrides.content ?? "Body content about technology and AI chips.",
    entities: overrides.entities ?? [],
    normalized_entities: overrides.normalized_entities ?? [],
    keywords: overrides.keywords ?? ["tech"],
    title_tokens: overrides.title_tokens ?? [],
    content_tokens: overrides.content_tokens ?? [],
    source_metadata: overrides.source_metadata,
  };
}

beforeEach(() => {
  captured.inserts = [];
  captured.updates = [];
});

describe("article-candidates observability (PRD-53)", () => {
  it("persists source_class + category on normalized candidates", async () => {
    await persistNormalizedArticleCandidates({
      runId: "run-1",
      articles: [
        makeArticle({
          id: "a",
          source_metadata: {
            sourceClass: "research_institutional",
            trustTier: "tier_1",
          } as unknown as NormalizedArticle["source_metadata"],
        }),
      ],
    });

    const rows = captured.inserts[0];
    expect(rows).toHaveLength(1);
    expect(rows[0].source_class).toBe("research_institutional");
    // category is classified at persist time (string or null), no longer absent.
    expect(rows[0]).toHaveProperty("category");
  });

  it("records drop_reason=editorial_excluded for eligibility-filtered articles (formerly-silent normalize drop)", async () => {
    const rejected = makeArticle({ id: "rej" });
    const dedupedOut = makeArticle({ id: "ded" });

    await updateArticleCandidateRankingOutcomes({
      runId: "run-1",
      normalizedArticles: [rejected, dedupedOut],
      // 'rej' was removed by the eligibility filter BEFORE dedup, so it is not in deduped.
      dedupedArticles: [dedupedOut],
      rankedClusters: [],
      filterEvaluations: new Map<string, ArticleFilterEvaluation>([
        ["rej", { id: "rej", filterDecision: "reject" } as unknown as ArticleFilterEvaluation],
      ]),
    });

    const reasons = captured.updates.map((update) => update.drop_reason);
    expect(reasons).toContain("editorial_excluded"); // the eligibility-rejected article
    expect(reasons).toContain("low_cluster_score"); // deduped-but-unranked article
  });
});
