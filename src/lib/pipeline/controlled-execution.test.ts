import { describe, expect, it } from "vitest";

import {
  assertControlledPipelineCanExecute,
  buildControlledPipelineReport,
  resolveControlledPipelineConfig,
  type ControlledPipelineConfig,
} from "@/lib/pipeline/controlled-execution";
import type { DailyBriefing, SignalSelectionEligibilityTier } from "@/lib/types";

function buildConfig(overrides: Partial<ControlledPipelineConfig> = {}): ControlledPipelineConfig {
  return {
    mode: "dry_run",
    briefingDateOverride: null,
    testRunId: null,
    targetEnvironment: "local",
    allowProductionPipelineTest: false,
    cronDisabledConfirmed: false,
    artifactDir: ".pipeline-runs",
    ...overrides,
  };
}

function buildBriefing(): DailyBriefing {
  return {
    id: "briefing-test",
    briefingDate: "2026-04-27T12:00:00.000Z",
    title: "Daily Executive Briefing",
    intro: "Controlled test briefing.",
    readingWindow: "10 minutes",
    items: [],
  };
}

function buildItem(index: number, whyItMatters: string, tier: SignalSelectionEligibilityTier = "core_signal_eligible") {
  return {
    id: `candidate-${index}`,
    topicId: "topic-tech",
    topicName: "Tech",
    title: `Candidate ${index}`,
    whatHappened: `Candidate ${index} summary`,
    keyPoints: [`Candidate ${index} point`],
    whyItMatters,
    aiWhyItMatters: whyItMatters,
    sources: [{ title: "Source", url: `https://example.com/${index}` }],
    sourceCount: 1,
    estimatedMinutes: 4,
    read: false,
    priority: "normal" as const,
    matchedKeywords: ["tech"],
    importanceScore: 70 - index,
    rankingSignals: [`Ranking signal ${index}`],
    selectionEligibility: {
      tier,
      reasons: tier === "exclude_from_public_candidates" ? ["weak_consumer_content"] : [],
      warnings: [],
      filterDecision: tier === "exclude_from_public_candidates" ? "reject" : "pass",
      filterSeverity: tier === "exclude_from_public_candidates" ? "reject" : "pass",
      filterReasons: tier === "exclude_from_public_candidates" ? ["rejected_low_signal"] : ["passed_allowed_event_type"],
      sourceTier: "tier1",
      headlineQuality: "strong",
      eventType: "policy_regulation",
      structuralImportanceScore: 78,
      sourceQualityScore: 88,
      finalScore: 70 - index,
      scoreComponents: {
        credibility: 88,
        novelty: 70,
        urgency: 70,
        reinforcement: 70,
        trust_timeliness: 82,
        event_importance: 78,
        support_and_novelty: 70,
      },
      rankingProvider: "fns",
      diversityProvider: "fns",
    },
  };
}

describe("controlled pipeline execution config", () => {
  it("resolves dry_run as a write-safe run mode", () => {
    const config = resolveControlledPipelineConfig({
      PIPELINE_RUN_MODE: "dry_run",
    } as NodeJS.ProcessEnv);

    expect(config.mode).toBe("dry_run");
    expect(config.targetEnvironment).toBe("local");
    expect(() => assertControlledPipelineCanExecute(config)).not.toThrow();
  });

  it("refuses production draft_only runs without explicit safety guards", () => {
    const config = buildConfig({
      mode: "draft_only",
      briefingDateOverride: "2026-04-27",
      testRunId: "controlled-test",
      targetEnvironment: "production",
    });

    expect(() => assertControlledPipelineCanExecute(config)).toThrow(/ALLOW_PRODUCTION_PIPELINE_TEST/);
  });

  it("requires a briefing date, test run id, and cron-disabled confirmation for production draft_only", () => {
    const missingDate = buildConfig({
      mode: "draft_only",
      testRunId: "controlled-test",
      targetEnvironment: "production",
      allowProductionPipelineTest: true,
      cronDisabledConfirmed: true,
    });
    const missingRunId = buildConfig({
      mode: "draft_only",
      briefingDateOverride: "2026-04-27",
      targetEnvironment: "production",
      allowProductionPipelineTest: true,
      cronDisabledConfirmed: true,
    });
    const missingCronConfirmation = buildConfig({
      mode: "draft_only",
      briefingDateOverride: "2026-04-27",
      testRunId: "controlled-test",
      targetEnvironment: "production",
      allowProductionPipelineTest: true,
      cronDisabledConfirmed: false,
    });

    expect(() => assertControlledPipelineCanExecute(missingDate)).toThrow(/BRIEFING_DATE_OVERRIDE/);
    expect(() => assertControlledPipelineCanExecute(missingRunId)).toThrow(/PIPELINE_TEST_RUN_ID/);
    expect(() => assertControlledPipelineCanExecute(missingCronConfirmation)).toThrow(/PIPELINE_CRON_DISABLED_CONFIRMED/);
  });

  it("allows production draft_only only when every safety guard is present", () => {
    const config = buildConfig({
      mode: "draft_only",
      briefingDateOverride: "2026-04-27",
      testRunId: "controlled-test",
      targetEnvironment: "production",
      allowProductionPipelineTest: true,
      cronDisabledConfirmed: true,
    });

    expect(() => assertControlledPipelineCanExecute(config)).not.toThrow();
  });

  it("does not allow normal mode to accept test-run overrides", () => {
    const config = buildConfig({
      mode: "normal",
      briefingDateOverride: "2026-04-27",
      testRunId: "controlled-test",
    });

    expect(() => assertControlledPipelineCanExecute(config)).toThrow(/BRIEFING_DATE_OVERRIDE/);
  });
});

describe("controlled pipeline report", () => {
  it("reports validation status and failure reasons for proposed generated signals", () => {
    const valid =
      "Anthropic's growth is now structurally tied to Google and Amazon's infrastructure, not independent of it. At scale, that's a dependency, not just a partnership.";
    const invalid = "This changes how investors price rates, demand, or risk in rates and equities over";
    const publicRankedItems = [
      buildItem(1, invalid),
      buildItem(2, valid),
      buildItem(3, valid),
      buildItem(4, valid),
      buildItem(5, valid),
      buildItem(6, invalid, "depth_only"),
    ];
    const report = buildControlledPipelineReport({
      mode: "dry_run",
      testRunId: "report-test",
      briefing: {
        ...buildBriefing(),
        items: publicRankedItems.slice(0, 5),
      },
      publicRankedItems,
      pipelineRun: {
        run_id: "pipeline-test",
        num_clusters: 6,
      } as never,
    });

    expect(report.mode).toBe("dry_run");
    expect(report.runId).toBe("pipeline-test");
    expect(report.candidateCount).toBe(6);
    expect(report.proposedTopFive).toHaveLength(5);
    expect(report.proposedDepthRows).toHaveLength(1);
    expect(report.candidate_pool_insufficient).toBe(false);
    expect(report.selectionSummary.eligibleCoreCount).toBe(5);
    expect(report.proposedTopFive[0]).toMatchObject({
      eligibilityTier: "core_signal_eligible",
      filterDecision: "pass",
      structuralImportanceScore: 78,
      rankingProvider: "fns",
    });
    expect(report.proposedTopFive[0]).toMatchObject({
      validationStatus: "requires_human_rewrite",
      validationFailures: expect.arrayContaining(["incomplete_sentence", "template_placeholder_language"]),
    });
    expect(report.proposedTopFive[1]).toMatchObject({
      validationStatus: "passed",
      validationFailures: [],
      validationDetails: [],
    });
    expect(report.proposedDepthRows[0].validationStatus).toBe("requires_human_rewrite");
  });

  it("reports an insufficient candidate pool instead of filling weak Core slots", () => {
    const valid =
      "Anthropic's growth is now structurally tied to Google and Amazon's infrastructure, not independent of it. At scale, that's a dependency, not just a partnership.";
    const publicRankedItems = [
      buildItem(1, valid),
      buildItem(2, valid),
      buildItem(3, valid, "context_signal_eligible"),
      buildItem(4, valid, "depth_only"),
      buildItem(5, valid, "exclude_from_public_candidates"),
    ];
    const report = buildControlledPipelineReport({
      mode: "dry_run",
      testRunId: "insufficient-pool-test",
      briefing: {
        ...buildBriefing(),
        items: publicRankedItems.slice(0, 2),
      },
      publicRankedItems,
      pipelineRun: {
        run_id: "pipeline-test",
        num_clusters: 5,
        active_sources: [
          {
            source_id: "source-1",
            source: "Reuters World",
            donor: "horizon",
            source_class: "global_wire",
            trust_tier: "tier_1",
          },
        ],
        source_contributions: [
          {
            source_id: "source-1",
            source: "Reuters World",
            donor: "horizon",
            source_class: "global_wire",
            trust_tier: "tier_1",
            item_count: 5,
          },
        ],
        article_filter_evaluations: [
          {
            article_id: "article-1",
            title: "Policy story",
            source_name: "Reuters World",
            source_url: "https://example.com/policy",
            source_tier: "tier1",
            headline_quality: "strong",
            event_type: "policy_regulation",
            filter_decision: "pass",
            filter_severity: "pass",
            filter_reasons: ["passed_allowed_event_type"],
          },
        ],
      } as never,
    });

    expect(report.proposedTopFive).toHaveLength(2);
    expect(report.proposedContextRows).toHaveLength(1);
    expect(report.proposedDepthRows).toHaveLength(1);
    expect(report.excludedCandidates).toHaveLength(1);
    expect(report.candidate_pool_insufficient).toBe(true);
    expect(report.selectionSummary.selectionQualityWarnings).toContain("eligible_core_count_2_below_required_5");
    expect(report.selectionSummary.selectionQualityWarnings).toContain("source_pool_likely_constrained_selection");
    expect(report.selectionSummary.sourceScarcityLikely).toBe(true);
    expect(report.sourceDistribution).toEqual({
      "Reuters World": 1,
    });
    expect(report.categoryDistribution).toEqual({
      Tech: 5,
    });
    expect(report.articleCandidates[0]).toMatchObject({
      filterDecision: "pass",
      eventType: "policy_regulation",
    });
  });

  it("serializes manifest source-plan diagnostics and coverage warnings", () => {
    const valid =
      "Anthropic's growth is now structurally tied to Google and Amazon's infrastructure, not independent of it. At scale, that's a dependency, not just a partnership.";
    const publicRankedItems = [
      buildItem(1, valid),
      buildItem(2, valid, "context_signal_eligible"),
      buildItem(3, valid, "depth_only"),
    ];
    const report = buildControlledPipelineReport({
      mode: "dry_run",
      testRunId: "manifest-plan-test",
      briefing: {
        ...buildBriefing(),
        items: publicRankedItems,
      },
      publicRankedItems,
      sourcePlan: {
        plan: "public_manifest",
        surface: "public.home",
        suppliedByManifest: true,
        sourceCount: 3,
        sourceIds: ["source-ft", "source-bbc-world", "source-politico-congress"],
        warnings: [],
        sources: [
          {
            id: "source-ft",
            displayName: "Financial Times",
            category: "Finance",
            feedUrl: "https://www.ft.com/rss/home",
            homepageUrl: "https://www.ft.com",
            status: "active",
            sourceRole: "primary_authoritative",
            sourceTier: "tier1",
            publicEligible: true,
          },
          {
            id: "source-bbc-world",
            displayName: "BBC World News",
            category: "World",
            feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml",
            homepageUrl: "https://www.bbc.com/news/world",
            status: "active",
            sourceRole: "secondary_authoritative",
            sourceTier: "tier2",
            publicEligible: true,
          },
          {
            id: "source-politico-congress",
            displayName: "Politico Congress",
            category: "Politics",
            feedUrl: "https://rss.politico.com/congress.xml",
            homepageUrl: "https://www.politico.com/congress",
            status: "active",
            sourceRole: "secondary_authoritative",
            sourceTier: "tier2",
            publicEligible: true,
          },
        ],
      },
      pipelineRun: {
        run_id: "pipeline-test",
        num_clusters: 3,
        active_sources: [
          {
            source_id: "custom-source-ft",
            source: "Financial Times",
            donor: "openclaw",
            source_class: "business_press",
            trust_tier: "tier_2",
          },
          {
            source_id: "custom-source-bbc-world",
            source: "BBC World News",
            donor: "openclaw",
            source_class: "general_newswire",
            trust_tier: "tier_2",
          },
        ],
        source_contributions: [
          {
            source_id: "custom-source-ft",
            source: "Financial Times",
            donor: "openclaw",
            topic: "Finance",
            source_class: "business_press",
            trust_tier: "tier_2",
            source_tier: "tier1",
            source_role: "primary_authoritative",
            public_eligible: true,
            content_accessibility: "paywall_limited",
            accessible_text_length_max: 180,
            extraction_method: "rss_summary",
            fetch_status: "success",
            parse_status: "parsed",
            failure_reason: null,
            functional_for_core: false,
            functional_for_context: false,
            functional_for_depth: true,
            accessibility_warnings: ["source_accessibility_thin"],
            core_blocking_reasons: ["paywall_limited_uncorroborated"],
            item_count: 2,
          },
          {
            source_id: "custom-source-bbc-world",
            source: "BBC World News",
            donor: "openclaw",
            topic: "World",
            source_class: "general_newswire",
            trust_tier: "tier_2",
            source_tier: "tier2",
            source_role: "secondary_authoritative",
            public_eligible: true,
            content_accessibility: "fetch_failed",
            accessible_text_length_max: 0,
            extraction_method: "none",
            fetch_status: "failed",
            parse_status: "not_applicable",
            failure_reason: "network failure",
            functional_for_core: false,
            functional_for_context: false,
            functional_for_depth: false,
            accessibility_warnings: ["source_health_warning"],
            core_blocking_reasons: ["source_fetch_failed"],
            item_count: 0,
          },
        ],
        article_filter_evaluations: [
          {
            article_id: "article-1",
            title: "Rates story",
            source_name: "Financial Times",
            source_url: "https://example.com/rates",
            source_tier: "tier1",
            source_role: "primary_authoritative",
            content_accessibility: "paywall_limited",
            accessible_text_length: 180,
            summary_length: 180,
            content_length: 0,
            extraction_method: "rss_summary",
            fetch_status: "success",
            parse_status: "parsed",
            failure_reason: null,
            supplied_by_manifest: true,
            public_eligible: true,
            headline_quality: "strong",
            event_type: "macro_market_move",
            filter_decision: "pass",
            filter_severity: "pass",
            filter_reasons: ["passed_allowed_event_type"],
          },
          {
            article_id: "article-2",
            title: "World story",
            source_name: "BBC World News",
            source_url: "https://example.com/world",
            source_tier: "tier2",
            source_role: "secondary_authoritative",
            content_accessibility: "fetch_failed",
            accessible_text_length: 0,
            summary_length: 0,
            content_length: 0,
            extraction_method: "none",
            fetch_status: "failed",
            parse_status: "not_applicable",
            failure_reason: "network failure",
            supplied_by_manifest: true,
            public_eligible: true,
            headline_quality: "medium",
            event_type: "geopolitics",
            filter_decision: "suppress",
            filter_severity: "suppress",
            filter_reasons: ["suppressed_low_specificity"],
          },
        ],
      } as never,
    });

    expect(report.sourcePlan).toMatchObject({
      plan: "public_manifest",
      suppliedByManifest: true,
      sourceCount: 3,
      sourceIds: ["source-ft", "source-bbc-world", "source-politico-congress"],
    });
    expect(report.selectionSummary.manifestCoverageWarnings).toEqual([
      "active_source_count_2_below_manifest_source_count_3",
      "contributing_source_count_1_below_expected_minimum",
    ]);
    expect(report.sourceDistribution).toEqual({
      "Financial Times": 1,
      "BBC World News": 1,
    });
    expect(report.selectionSummary.categoryDistributionOfCandidates).toEqual({
      Tech: 3,
    });
    expect(report.articleCandidates[0]).toMatchObject({
      sourceRole: "primary_authoritative",
      contentAccessibility: "paywall_limited",
      accessibleTextLength: 180,
      extractionMethod: "rss_summary",
      fetchStatus: "success",
    });
    expect(report.selectionSummary.functionalSourceCoverageByCategory).toMatchObject({
      Finance: {
        active_sources: 1,
        core_capable_sources: 0,
        depth_capable_sources: 1,
      },
      World: {
        active_sources: 1,
        failed_sources: 1,
      },
    });
    expect(report.selectionSummary.sourceAccessibilityWarnings).toEqual(
      expect.arrayContaining(["source_accessibility_thin", "source_health_warning"]),
    );
    expect(report.selectionSummary.selectionQualityWarnings).toContain(
      "source_accessibility_likely_constrained_selection",
    );
  });
});
