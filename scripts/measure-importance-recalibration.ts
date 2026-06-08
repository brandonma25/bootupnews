/**
 * MEASUREMENT HARNESS (investigation/validation only — NOT shipped logic).
 *
 * Recomputes event_importance for the persisted 2026-06-08 candidate pool by
 * running the ACTUAL donor ranking-feature provider (mapClusterToRankingFeatures)
 * + the event_importance blend, on minimal clusters reconstructed from persisted
 * {title, summary, keywords, entities, source}. Run it on the CURRENT provider
 * (BEFORE) and again after editing registry.ts (AFTER); the diff script compares.
 *
 * Faithfulness: the corpus is reconstructed from the persisted (truncated)
 * summary, so harness_imp ≈ persisted_imp within a few points — the fidelity
 * column reports the gap. The BEFORE→AFTER delta cancels that reconstruction
 * bias because both runs use the identical corpus; only registry.ts changes.
 *
 * Usage: npx tsx scripts/measure-importance-recalibration.ts > /tmp/imp-before.json
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { getRankingFeatureProviders } from "@/adapters/donors";
import { classifyEvergreen, resolveEvergreenFilterConfig } from "@/lib/editorial/evergreen-filter";
import { classifyEventType } from "@/lib/signal-filtering";

const evergreenConfig = resolveEvergreenFilterConfig();

type Row = {
  id: string; title: string; src: string; tier: string; url: string;
  kw: string[] | null; ent: string[] | null; sum: string | null;
  imp: number; score: number; etype: string; elig: string;
};

const fixturePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(process.cwd(), "tests/fixtures/importance-recalibration/pool-2026-06-08.json");
const rows: Row[] = JSON.parse(readFileSync(fixturePath, "utf8"));

const provider = getRankingFeatureProviders()[0]?.provider;
if (!provider) throw new Error("No active ranking feature provider");

// event_importance blend — scoring-engine.ts buildGroupedScores (NOT changed by this PR).
function importanceOf(f: Record<string, number>): number {
  return Number(
    (
      f.structural_impact * 0.24 +
      f.downstream_consequence * 0.2 +
      f.actor_significance * 0.18 +
      f.cross_domain_relevance * 0.14 +
      f.actionability_or_decision_value * 0.14 +
      f.persistence_or_endurance * 0.1
    ).toFixed(2),
  );
}

// Minimal StoryCluster sufficient for mapClusterToRankingFeatures (corpus =
// title + content + topic_keywords; actors = representative + article entities).
function buildCluster(r: Row): unknown {
  const entities = (r.ent ?? []).filter(Boolean);
  const keywords = (r.kw ?? []).filter(Boolean);
  const article = {
    id: r.id,
    title: r.title,
    content: r.sum ?? "",
    url: r.url,
    source: r.src,
    keywords,
    entities,
    normalized_entities: entities,
    title_tokens: [],
    content_tokens: [],
    published_at: "2026-06-08T00:00:00.000Z",
    source_metadata: undefined,
  };
  return {
    cluster_id: r.id,
    cluster_size: 1,
    topic_keywords: keywords,
    representative_article: article,
    articles: [article],
  };
}

const out = rows.map((r) => {
  const cluster = buildCluster(r) as Parameters<typeof provider.mapClusterToRankingFeatures>[0];
  const f = provider.mapClusterToRankingFeatures(cluster, [cluster]) as Record<string, number>;
  return {
    id: r.id,
    title: r.title,
    src: r.src,
    url: r.url,
    elig: r.elig,
    etype: r.etype,
    persisted_imp: r.imp,
    persisted_score: r.score,
    evergreen: classifyEvergreen({ title: r.title, source: r.src, url: r.url }, evergreenConfig).isEvergreen,
    cet: classifyEventType({ title: r.title, summaryText: r.sum, topicName: null }),
    harness_imp: importanceOf(f),
    f: {
      structural_impact: f.structural_impact,
      downstream_consequence: f.downstream_consequence,
      actor_significance: f.actor_significance,
      cross_domain_relevance: f.cross_domain_relevance,
      actionability_or_decision_value: f.actionability_or_decision_value,
      persistence_or_endurance: f.persistence_or_endurance,
    },
  };
});

process.stdout.write(JSON.stringify(out, null, 0));
