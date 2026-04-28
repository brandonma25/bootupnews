import { describe, expect, it } from "vitest";

import type { SourceDefinition } from "@/lib/integration/subsystem-contracts";
import type { NormalizedArticle } from "@/lib/models/normalized-article";
import type { FeedArticle } from "@/lib/rss";
import {
  buildArticleSourceAccessibility,
  buildFailedSourceAccessibility,
  evaluateSourceAccessibilitySupport,
} from "@/lib/source-accessibility";
import type { SourceRole } from "@/lib/source-accessibility-types";

const longText = "Structural reporting shows the policy, market, and institutional consequences. ".repeat(20);
const partialText = "Substantial partial reporting connects the development to market structure and institutional effects. ".repeat(7);
const abstractText = "Detailed abstract explains downstream consequences for regulators, firms, and markets. ".repeat(11);

function source(overrides: Partial<SourceDefinition> = {}): SourceDefinition {
  return {
    sourceId: "source-authority",
    donor: "openclaw",
    source: "Authority Source",
    homepageUrl: "https://authority.example",
    topic: "Finance",
    credibility: 90,
    reliability: 0.9,
    sourceClass: "business_press",
    trustTier: "tier_1",
    provenance: "primary_reporting",
    status: "active",
    availability: "custom",
    sourceRole: "primary_authoritative",
    publicEligible: true,
    suppliedByManifest: true,
    fetch: {
      feedUrl: "https://authority.example/rss.xml",
      retryCount: 1,
    },
    adapterOwner: "openclaw",
    ...overrides,
  };
}

function article(
  sourceDefinition: SourceDefinition,
  overrides: Partial<FeedArticle> = {},
): NormalizedArticle {
  const feedArticle: FeedArticle = {
    title: "Central bank changes liquidity facility rules",
    url: "https://authority.example/story",
    summaryText: "Central bank changed market liquidity facility rules.",
    contentText: longText,
    sourceName: sourceDefinition.source,
    publishedAt: "2026-04-27T08:00:00.000Z",
    extractionMethod: "rss_content",
    ...overrides,
  };

  return {
    id: `${sourceDefinition.sourceId}-${feedArticle.url}`,
    title: feedArticle.title,
    source: feedArticle.sourceName,
    url: feedArticle.url,
    published_at: feedArticle.publishedAt,
    content: feedArticle.contentText ?? feedArticle.summaryText,
    entities: ["Central Bank"],
    normalized_entities: ["central bank"],
    keywords: ["central", "bank", "liquidity"],
    title_tokens: ["central", "bank"],
    content_tokens: ["liquidity", "facility"],
    source_metadata: sourceDefinition,
    source_accessibility: buildArticleSourceAccessibility(feedArticle, sourceDefinition),
  };
}

describe("source accessibility predicates", () => {
  it("keeps source role separate from content accessibility", () => {
    const ft = source({
      sourceId: "source-ft",
      source: "Financial Times",
      homepageUrl: "https://www.ft.com",
      fetch: {
        feedUrl: "https://www.ft.com/rss/home",
      },
      sourceRole: "primary_authoritative",
    });
    const diagnostics = buildArticleSourceAccessibility(
      {
        title: "Markets story",
        url: "https://www.ft.com/content/story",
        summaryText: "Short RSS abstract.",
        contentText: "",
        sourceName: "Financial Times",
        publishedAt: "2026-04-27T08:00:00.000Z",
        extractionMethod: "rss_summary",
      },
      ft,
    );

    expect(diagnostics.source_role).toBe("primary_authoritative");
    expect(diagnostics.content_accessibility).toBe("paywall_limited");
    expect(diagnostics.content_length).toBe(0);
  });

  it("blocks metadata-only tier1 sources from Core eligibility", () => {
    const support = evaluateSourceAccessibilitySupport([
      article(source(), {
        summaryText: "Central bank changes liquidity facility rules",
        contentText: "",
        extractionMethod: "metadata",
      }),
    ]);

    expect(support.coreSupported).toBe(false);
    expect(support.contextSupported).toBe(false);
    expect(support.coreBlockingReasons).toContain("metadata_only");
  });

  it("blocks abstract-only tier1 sources from Core unless substantial or corroborated", () => {
    const thinAbstract = evaluateSourceAccessibilitySupport([
      article(source(), {
        summaryText: "Short RSS abstract about policy.",
        contentText: "",
        extractionMethod: "rss_summary",
      }),
    ]);
    const substantialAbstract = evaluateSourceAccessibilitySupport([
      article(source(), {
        summaryText: abstractText,
        contentText: "",
        extractionMethod: "rss_summary",
      }),
    ]);

    expect(thinAbstract.coreSupported).toBe(false);
    expect(thinAbstract.coreBlockingReasons).toContain("abstract_only_uncorroborated");
    expect(substantialAbstract.coreSupported).toBe(true);
  });

  it("downgrades paywall-limited no-body sources", () => {
    const diagnostics = evaluateSourceAccessibilitySupport([
      article(source({
        sourceId: "source-ft",
        source: "Financial Times",
        homepageUrl: "https://www.ft.com",
        fetch: {
          feedUrl: "https://www.ft.com/rss/home",
        },
      }), {
        url: "https://www.ft.com/content/story",
        summaryText: "Short RSS abstract.",
        contentText: "",
        extractionMethod: "rss_summary",
      }),
    ]);

    expect(diagnostics.coreSupported).toBe(false);
    expect(diagnostics.coreBlockingReasons).toContain("paywall_limited_uncorroborated");
    expect(diagnostics.warnings).toContain("source_accessibility_thin");
  });

  it("treats rss retry exhaustion as zero Core authority", () => {
    const failed = buildFailedSourceAccessibility({
      source: source({ sourceId: "source-reuters-business", source: "Reuters Business" }),
      failureType: "rss_retry_exhausted",
      error: "Feed request retry exhausted for Reuters Business",
    });
    const support = evaluateSourceAccessibilitySupport([
      {
        ...article(source()),
        source_accessibility: failed,
      },
    ]);

    expect(support.coreSupported).toBe(false);
    expect(support.contextSupported).toBe(false);
    expect(support.coreBlockingReasons).toEqual(expect.arrayContaining(["source_fetch_failed", "rss_retry_exhausted"]));
  });

  it("allows full-text authoritative sources to support Core", () => {
    const support = evaluateSourceAccessibilitySupport([article(source())]);

    expect(support.coreSupported).toBe(true);
    expect(support.contextSupported).toBe(true);
    expect(support.depthSupported).toBe(true);
  });

  it("keeps abstract-only CNBC support out of Core by brand alone", () => {
    const support = evaluateSourceAccessibilitySupport([
      article(source({
        sourceId: "source-cnbc-finance",
        source: "CNBC Finance",
        homepageUrl: "https://www.cnbc.com/finance/",
        sourceRole: "secondary_authoritative",
        trustTier: "tier_2",
        fetch: {
          feedUrl: "https://www.cnbc.com/id/10000664/device/rss/rss.html",
        },
      }), {
        summaryText: "Markets moved after a policy signal but the RSS item only exposes a short abstract.",
        contentText: "",
        extractionMethod: "rss_summary",
      }),
    ]);

    expect(support.coreSupported).toBe(false);
    expect(support.depthSupported).toBe(false);
    expect(support.coreBlockingReasons).toContain("abstract_only_uncorroborated");
  });

  it("keeps MarketWatch as corroboration support instead of sole Core authority", () => {
    const support = evaluateSourceAccessibilitySupport([
      article(source({
        sourceId: "source-marketwatch",
        source: "MarketWatch",
        homepageUrl: "https://www.marketwatch.com",
        sourceRole: "corroboration_only",
        trustTier: "tier_2",
        fetch: {
          feedUrl: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
        },
      })),
    ]);

    expect(support.coreSupported).toBe(false);
    expect(support.contextSupported).toBe(true);
    expect(support.coreBlockingReasons).toContain("source_accessibility_insufficient");
  });

  it("allows substantial partial authoritative sources to support Context and Core", () => {
    const support = evaluateSourceAccessibilitySupport([
      article(source(), {
        summaryText: partialText,
        contentText: partialText,
      }),
    ]);

    expect(support.coreSupported).toBe(true);
    expect(support.contextSupported).toBe(true);
  });

  it("allows multiple independent partial authoritative sources to combine into Core support", () => {
    const first = source({ sourceId: "source-one", source: "Authority One" });
    const second = source({ sourceId: "source-two", source: "Authority Two" });
    const firstPartial = "Partial one gives policy and market context. ".repeat(9);
    const secondPartial = "Partial two confirms institutional consequences. ".repeat(9);
    const support = evaluateSourceAccessibilitySupport([
      article(first, { contentText: firstPartial, summaryText: firstPartial }),
      article(second, { contentText: secondPartial, summaryText: secondPartial }),
    ]);

    expect(support.coreSupported).toBe(true);
    expect(support.contextSupported).toBe(true);
  });

  it("does not let discovery-only full text support Core by itself", () => {
    const support = evaluateSourceAccessibilitySupport([
      article(source({
        sourceId: "source-discovery",
        sourceRole: "discovery_only" as SourceRole,
        trustTier: "tier_3",
      })),
    ]);

    expect(support.coreSupported).toBe(false);
    expect(support.coreBlockingReasons).toContain("source_role_not_public_evidence");
  });
});
