import { describe, expect, it } from "vitest";

import { selectHomepageCategoryArticles } from "@/lib/homepage-category-articles";
import type { BriefingItem } from "@/lib/types";

function row(overrides: {
  id: string;
  run_id?: string;
  ingested_at?: string;
  source_name?: string;
  canonical_url?: string;
  title?: string;
  summary?: string;
  keywords?: string[];
  published_at?: string;
}) {
  return {
    run_id: overrides.run_id ?? "pipeline-latest",
    ingested_at: overrides.ingested_at ?? "2026-05-12T11:45:00.000Z",
    source_name: overrides.source_name ?? "TechCrunch",
    canonical_url: overrides.canonical_url ?? `https://techcrunch.com/${overrides.id}`,
    title: overrides.title ?? `AI platform update ${overrides.id}`,
    summary: overrides.summary ?? "A software platform update affects AI infrastructure.",
    keywords: overrides.keywords ?? ["ai", "software"],
    published_at: overrides.published_at ?? "2026-05-12T10:30:00.000Z",
    id: overrides.id,
  };
}

function signalItem(overrides: Partial<BriefingItem>): BriefingItem {
  return {
    id: overrides.id ?? "signal-1",
    topicId: "topic-tech",
    topicName: "Tech",
    title: overrides.title ?? "Top Signal",
    whatHappened: "A top signal happened.",
    keyPoints: ["", "", ""],
    whyItMatters: "It matters.",
    sources: overrides.sources ?? [{ title: "The Verge", url: "https://www.theverge.com/top-signal" }],
    relatedArticles: overrides.relatedArticles,
    estimatedMinutes: 4,
    read: false,
    priority: "top",
  };
}

describe("selectHomepageCategoryArticles", () => {
  it("groups latest cron Article candidates into capped category tab lists", () => {
    const articles = selectHomepageCategoryArticles({
      rows: [
        row({ id: "tech-1", source_name: "TechCrunch", title: "AI platform vendors expand developer tools" }),
        row({
          id: "finance-1",
          source_name: "NPR Economy",
          canonical_url: "https://www.npr.org/economy/fed-rates",
          title: "Fed rate debate resets economic expectations",
          summary: "Federal Reserve officials weighed inflation and rate risks.",
          keywords: ["fed", "economy", "rates"],
        }),
        row({
          id: "politics-1",
          source_name: "Politico Politics News",
          canonical_url: "https://www.politico.com/news/policy",
          title: "Congressional committee advances policy package",
          summary: "Lawmakers advanced a government policy package.",
          keywords: ["congress", "policy"],
        }),
      ],
    });

    expect(articles.tech.map((article) => article.id)).toEqual(["tech-1"]);
    expect(articles.finance.map((article) => article.id)).toEqual(["finance-1"]);
    expect(articles.politics.map((article) => article.id)).toEqual(["politics-1"]);
  });

  it("excludes paywalled sources and duplicates from the top Signal Card set", () => {
    const articles = selectHomepageCategoryArticles({
      excludedSignalItems: [
        signalItem({
          title: "Top signal about chips",
          sources: [{ title: "The Verge", url: "https://www.theverge.com/top-signal" }],
        }),
      ],
      rows: [
        row({
          id: "top-duplicate",
          canonical_url: "https://www.theverge.com/top-signal?utm_source=rss",
          title: "Top signal about chips",
        }),
        row({
          id: "paywall",
          source_name: "Financial Times",
          canonical_url: "https://www.ft.com/content/paywalled",
          title: "Markets move after central bank signal",
          summary: "A market story.",
          keywords: ["markets"],
        }),
        row({
          id: "eligible",
          canonical_url: "https://arstechnica.com/ai/eligible",
          title: "Open source AI runtime lands new release",
          summary: "A technology story.",
          keywords: ["ai", "software"],
        }),
      ],
    });

    expect(articles.tech.map((article) => article.id)).toEqual(["eligible"]);
    expect(Object.values(articles).flat().map((article) => article.id)).not.toContain("paywall");
    expect(Object.values(articles).flat().map((article) => article.id)).not.toContain("top-duplicate");
  });

  it("uses only the latest two cron run ids", () => {
    const articles = selectHomepageCategoryArticles({
      rows: [
        row({ id: "latest", run_id: "pipeline-3", ingested_at: "2026-05-12T11:45:00.000Z" }),
        row({ id: "previous", run_id: "pipeline-2", ingested_at: "2026-05-12T10:15:00.000Z" }),
        row({ id: "stale", run_id: "pipeline-1", ingested_at: "2026-05-11T11:45:00.000Z" }),
      ],
    });

    expect(articles.tech.map((article) => article.id)).toEqual(["latest", "previous"]);
  });
});
