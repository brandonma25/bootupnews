import { describe, expect, it } from "vitest";

import {
  applySignalFiltering,
  classifyEventType,
  classifyHeadlineQuality,
  classifySourceTier,
  evaluateArticleFilterCandidate,
  type ArticleFilterCandidate,
} from "@/lib/signal-filtering";

function createCandidate(overrides: Partial<ArticleFilterCandidate> = {}): ArticleFilterCandidate {
  return {
    id: overrides.id ?? "article-1",
    title: overrides.title ?? "Reuters reports Fed signals new tariff policy on chip imports",
    summaryText: overrides.summaryText ?? "The move could tighten semiconductor supply and reshape margins.",
    url: overrides.url ?? "https://www.reuters.com/world/us/fed-signals-policy-shift-2026-04-17/",
    publishedAt: overrides.publishedAt ?? new Date().toISOString(),
    sourceName: overrides.sourceName ?? "Reuters",
    sourceFeedUrl: overrides.sourceFeedUrl ?? "https://feeds.reuters.com/reuters/businessNews",
    sourceHomepageUrl: overrides.sourceHomepageUrl ?? "https://www.reuters.com",
    topicName: overrides.topicName ?? "Markets",
  };
}

describe("signal filtering", () => {
  it("classifies source tiers with central rules", () => {
    expect(classifySourceTier(createCandidate())).toBe("tier1");
    expect(
      classifySourceTier(
        createCandidate({
          sourceName: "TechCrunch",
          url: "https://techcrunch.com/2026/04/17/startup-raises-series-b/",
          sourceFeedUrl: "https://techcrunch.com/feed/",
          sourceHomepageUrl: "https://techcrunch.com",
        }),
      ),
    ).toBe("tier2");
    expect(
      classifySourceTier(
        createCandidate({
          sourceName: "GDELT AI Monitor",
          url: "https://www.gdeltproject.org/story",
          sourceFeedUrl: "https://api.gdeltproject.org/api/v2/doc/doc?query=ai",
          sourceHomepageUrl: "https://www.gdeltproject.org",
        }),
      ),
    ).toBe("tier3");
  });

  it("grades strong and weak headlines deterministically", () => {
    expect(
      classifyHeadlineQuality(
        createCandidate({
          title: "SEC opens antitrust probe after chipmaker acquires rival in $8 billion deal",
        }),
      ),
    ).toBe("strong");

    expect(
      classifyHeadlineQuality(
        createCandidate({
          title: "Opinion: What to know about AI stocks after the latest market recap",
          summaryText: "A broad commentary roundup with no concrete action.",
        }),
      ),
    ).toBe("weak");
  });

  it("normalizes event types before downstream ranking", () => {
    expect(
      classifyEventType(
        createCandidate({
          title: "Company posts earnings beat and raises full-year guidance",
        }),
      ),
    ).toBe("earnings_financials");

    expect(
      classifyEventType(
        createCandidate({
          title: "Live updates: What to know about the latest AI summit",
        }),
      ),
    ).toBe("repetitive_followup_no_new_info");
  });

  it("recognizes institutional and public-interest event types", () => {
    expect(
      classifyEventType(
        createCandidate({
          title: "Over 1,000 TSA officers have quit amid shutdown",
          summaryText: "The shutdown is straining agency capacity.",
        }),
      ),
    ).toBe("government_capacity");

    expect(
      classifyEventType(
        createCandidate({
          title: "Purdue settlement victims face legal accountability deadline",
          summaryText: "The settlement affects victims after years of court review.",
        }),
      ),
    ).toBe("public_interest_legal_accountability");

    expect(
      classifyEventType(
        createCandidate({
          title: "EU tells Google to open up AI on Android",
          summaryText: "The intervention affects platform regulation and market access.",
        }),
      ),
    ).toBe("platform_regulation");

    expect(
      classifyEventType(
        createCandidate({
          title: "Payroll employment increases by 178,000 in March",
          summaryText: "The unemployment rate changed little in the BLS employment situation release.",
        }),
      ),
    ).toBe("macro_data_release");
  });

  it("passes a tier1 strong allowed event with explicit reasons", () => {
    const evaluation = evaluateArticleFilterCandidate(
      createCandidate({
        title: "Reuters says White House orders new chip export restrictions",
      }),
    );

    expect(evaluation.filterDecision).toBe("pass");
    expect(evaluation.filterReasons).toContain("passed_tier1_strong_event");
    expect(evaluation.filterReasons).toContain("passed_allowed_event_type");
  });

  it("rejects low-tier weak filler", () => {
    const evaluation = evaluateArticleFilterCandidate(
      createCandidate({
        sourceName: "GDELT Finance Monitor",
        url: "https://www.gdeltproject.org/story",
        sourceFeedUrl: "https://api.gdeltproject.org/api/v2/doc/doc?query=finance",
        sourceHomepageUrl: "https://www.gdeltproject.org",
        title: "Opinion: What to know from this week in markets",
        summaryText: "A commentary roundup and recap.",
      }),
    );

    expect(evaluation.filterDecision).toBe("reject");
    expect(evaluation.filterReasons).toContain("rejected_low_source_tier");
    expect(evaluation.filterReasons).toContain("rejected_weak_headline");
  });

  it("preserves important non-tier1 stories through fallback when pass volume is thin", () => {
    const results = applySignalFiltering([
      createCandidate({
        id: "pass-1",
        title: "Reuters reports Fed holds rates steady and signals inflation risk remains",
      }),
      createCandidate({
        id: "fallback-1",
        sourceName: "GDELT Geopolitics",
        url: "https://www.gdeltproject.org/story-1",
        sourceFeedUrl: "https://api.gdeltproject.org/api/v2/doc/doc?query=sanctions",
        sourceHomepageUrl: "https://www.gdeltproject.org",
        title: "Government sanctions logistics network after border escalation disrupts trade flows",
        topicName: "Geopolitics",
      }),
      createCandidate({
        id: "fallback-2",
        sourceName: "TechCrunch",
        url: "https://techcrunch.com/2026/04/17/cloud-vendor-launches-platform/",
        sourceFeedUrl: "https://techcrunch.com/feed/",
        sourceHomepageUrl: "https://techcrunch.com",
        title: "Cloud vendor launches enterprise AI platform for model deployment",
        topicName: "AI",
      }),
      createCandidate({
        id: "reject-1",
        sourceName: "Random Blog",
        url: "https://example.com/blog-post",
        title: "Opinion: Top 10 AI takes you need to know",
        summaryText: "A newsletter-style recap.",
      }),
    ]);

    const promoted = results.find((result) => result.id === "fallback-1");
    const stillBlocked = results.find((result) => result.id === "reject-1");

    expect(promoted?.filterDecision).toBe("pass");
    expect(promoted?.filterReasons).toContain("passed_fallback_low_pass_volume");
    expect(stillBlocked?.filterDecision).toBe("reject");
  });
});
