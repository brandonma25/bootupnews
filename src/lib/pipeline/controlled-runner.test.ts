import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ControlledPipelineConfig } from "@/lib/pipeline/controlled-execution";
import { PUBLIC_SURFACE_SOURCE_MANIFEST } from "@/lib/source-manifest";
import type { SignalSelectionEligibilityTier } from "@/lib/types";

const generateDailyBriefing = vi.fn();
const persistSignalPostsForBriefing = vi.fn();

vi.mock("@/lib/data", () => ({
  generateDailyBriefing,
}));

vi.mock("@/lib/signals-editorial", () => ({
  persistSignalPostsForBriefing,
}));

function buildConfig(overrides: Partial<ControlledPipelineConfig> = {}): ControlledPipelineConfig {
  return {
    mode: "dry_run",
    briefingDateOverride: null,
    testRunId: "controlled-test",
    targetEnvironment: "local",
    allowProductionPipelineTest: false,
    cronDisabledConfirmed: false,
    draftTierAllowlist: null,
    draftMaxRows: null,
    artifactDir: ".pipeline-runs",
    replayArtifactPath: null,
    replayExpectedRunId: null,
    ...overrides,
  };
}

function buildItem(index: number, tier: SignalSelectionEligibilityTier = "core_signal_eligible") {
  const whyItMatters =
    index === 1
      ? "This changes how investors price rates, demand, or risk in rates and equities over"
      : "Anthropic's growth is now structurally tied to Google and Amazon's infrastructure, not independent of it. At scale, that's a dependency, not just a partnership.";

  return {
    id: `item-${index}`,
    topicId: "topic-tech",
    topicName: "Tech",
    title: `Generated signal ${index}`,
    whatHappened: `Generated summary ${index}`,
    keyPoints: [`Point ${index}`],
    whyItMatters,
    aiWhyItMatters: whyItMatters,
    sources: [{ title: "Source", url: `https://example.com/${index}` }],
    sourceCount: 1,
    estimatedMinutes: 4,
    read: false,
    priority: "normal" as const,
    matchedKeywords: ["tech"],
    importanceScore: 80 - index,
    rankingSignals: [`Ranking signal ${index}`],
    selectionEligibility: {
      tier,
      reasons: tier === "exclude_from_public_candidates" ? ["weak_entertainment_or_podcast_content"] : [],
      warnings: [],
      filterDecision: tier === "exclude_from_public_candidates" ? "reject" : "pass",
      filterSeverity: tier === "exclude_from_public_candidates" ? "reject" : "pass",
      filterReasons: tier === "exclude_from_public_candidates" ? ["rejected_low_signal"] : ["passed_allowed_event_type"],
      sourceTier: "tier1",
      headlineQuality: "strong",
      eventType: tier === "exclude_from_public_candidates" ? "culture_filler" : "policy_regulation",
      structuralImportanceScore: tier === "exclude_from_public_candidates" ? 30 : 78,
      sourceQualityScore: 88,
      finalScore: 80 - index,
      rankingProvider: "fns",
      diversityProvider: "fns",
    },
  };
}

function getPersistedItemIds() {
  const input = persistSignalPostsForBriefing.mock.calls[0]?.[0] as { items: Array<{ id: string }> } | undefined;

  return input?.items.map((item) => item.id) ?? [];
}

function buildReplaySignal(
  index: number,
  tier: SignalSelectionEligibilityTier = "core_signal_eligible",
  overrides: Record<string, unknown> = {},
) {
  const whyItMatters =
    tier === "context_signal_eligible"
      ? "TSA attrition is rising during the shutdown, which matters because it shows whether public institutions can maintain basic services under staffing or funding pressure."
      : "Prediction-market violations are stacking up, which matters because it tests whether enforcement, settlements, or public oversight change accountability beyond the case itself.";

  return {
    id: `replay-${index}`,
    rank: index,
    title: `Replay signal ${index}`,
    sourceName: tier === "context_signal_eligible" ? "Politico Congress" : "Politico Politics News",
    sourceUrl: `https://example.com/replay-${index}`,
    sourceCount: 1,
    sourceTier: "tier2",
    sourceRole: "secondary_authoritative",
    contentAccessibility: "full_text_available",
    accessibleTextLength: 1200 + index,
    extractionMethod: "readability",
    fetchStatus: "success",
    parseStatus: "parsed",
    articleId: `article-${index}`,
    clusterId: `cluster-${index}`,
    articleCount: 1,
    sourceDiversity: 1,
    recency: 80,
    velocity: 70,
    category: "Politics",
    topic: "Politics",
    eventType: tier === "context_signal_eligible" ? "government_capacity" : "public_interest_legal_accountability",
    filterDecision: "pass",
    filterSeverity: "pass",
    filterReasons: ["passed_allowed_event_type"],
    eligibilityTier: tier,
    structuralImportanceScore: tier === "context_signal_eligible" ? 48 : 62,
    sourceQualityScore: 76,
    groupedScoreComponents: {
      trust_timeliness: 75,
      event_importance: 70,
      support_and_novelty: 65,
      importance_adjustment: 0,
    },
    legacyScoreComponents: {
      credibility: 75,
      novelty: 70,
      urgency: 65,
      reinforcement: 60,
    },
    finalScore: 80 - index,
    rankingProvider: "fns",
    diversityProvider: "fns",
    whyItMatters,
    validationStatus: "passed",
    validationFailures: [],
    validationDetails: [],
    selectionQualityWarnings: [],
    selectionEligibilityReasons: tier === "context_signal_eligible" ? ["structural_importance_below_core_threshold"] : [],
    calibratedReasonLabels: [],
    exclusionCause: null,
    sourceAccessibilityWarnings: [],
    coreBlockingReasons: [],
    ...overrides,
  };
}

function buildReplayArtifact(overrides: Record<string, unknown> = {}) {
  return {
    mode: "dry_run",
    testRunId: "source-dry-run",
    runId: "pipeline-replay-source",
    generatedBriefingDate: "2026-04-28",
    candidateCount: 3,
    clusterCount: 3,
    signalCount: 3,
    sourcePlan: {
      plan: "fallback",
      surface: null,
      suppliedByManifest: false,
      sourceCount: 0,
      sourceIds: [],
      sources: [],
      warnings: [],
    },
    activeSourceCount: 0,
    activeSources: [],
    sourceDistribution: {},
    categoryDistribution: {},
    articleCandidates: [],
    selectionSummary: {
      activeSourceCount: 0,
      activeSourceList: [],
      sourceDistributionOfIngestedCandidates: {},
      sourceDistributionOfProposedTopFive: {},
      categoryDistributionOfCandidates: {},
      sourcePlanWarnings: [],
      manifestCoverageWarnings: [],
      categoriesRepresented: [],
      eligibleCoreCount: 1,
      contextEligibleCount: 2,
      depthOnlyCount: 1,
      excludedWeakCandidateCount: 1,
      candidate_pool_insufficient: true,
      candidate_pool_insufficient_reason: "selection_quality",
      sourceScarcityLikely: true,
      sourceAccessibilityLikely: false,
      functionalSourceCoverageByCategory: {},
      sourceAccessibilityWarnings: [],
      selectionQualityWarnings: [],
    },
    candidate_pool_insufficient: true,
    candidate_pool_insufficient_reason: "selection_quality",
    proposedTopFive: [buildReplaySignal(1)],
    proposedContextRows: [
      buildReplaySignal(2, "context_signal_eligible"),
      buildReplaySignal(3, "context_signal_eligible"),
    ],
    proposedDepthRows: [buildReplaySignal(4, "depth_only")],
    excludedCandidates: [buildReplaySignal(5, "exclude_from_public_candidates")],
    persistence: null,
    ...overrides,
  };
}

async function writeReplayArtifact(artifact: unknown) {
  const dir = await mkdtemp(path.join(tmpdir(), "phase-b-replay-test-"));
  const artifactPath = path.join(dir, "artifact.json");
  await writeFile(artifactPath, `${JSON.stringify(artifact)}\n`, "utf8");

  return {
    artifactPath,
    async cleanup() {
      await rm(dir, { recursive: true, force: true });
    },
  };
}

describe("runControlledPipeline", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const items = [
      buildItem(1),
      buildItem(2),
      buildItem(3, "exclude_from_public_candidates"),
      buildItem(4),
      buildItem(5),
      buildItem(6, "context_signal_eligible"),
      buildItem(7, "depth_only"),
    ];
    generateDailyBriefing.mockResolvedValue({
      briefing: {
        id: "briefing-test",
        briefingDate: "2026-04-27T12:00:00.000Z",
        title: "Boot Up",
        intro: "Controlled test briefing.",
        readingWindow: "20 minutes",
        items: items.slice(0, 5),
      },
      publicRankedItems: items,
      pipelineRun: {
        run_id: "pipeline-test",
        num_clusters: 7,
      },
    });
    persistSignalPostsForBriefing.mockImplementation(async (input: { items: Array<{ id: string }> }) => ({
      ok: true,
      briefingDate: "2026-04-28",
      insertedCount: input.items.length,
      insertedPostIds: input.items.map((_, index) => `row-${index + 1}`),
      mode: "draft_only",
      message: "Persisted a new daily Top 5 snapshot for editorial review.",
    }));
  });

  it("dry_run generates a validation report without writing signal_posts", async () => {
    const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");
    const report = await runControlledPipeline(buildConfig({ mode: "dry_run" }));

    expect(generateDailyBriefing).toHaveBeenCalledTimes(1);
    const [, sources, options] = generateDailyBriefing.mock.calls[0]!;

    expect(sources.map((source: { id: string }) => source.id)).toEqual([
      ...PUBLIC_SURFACE_SOURCE_MANIFEST["public.home"],
    ]);
    expect(options).toEqual({
      suppliedByManifest: true,
      persistPipelineCandidates: false,
    });
    expect(persistSignalPostsForBriefing).not.toHaveBeenCalled();
    expect(report.persistence).toBeNull();
    expect(report.sourcePlan).toMatchObject({
      plan: "public_manifest",
      suppliedByManifest: true,
      sourceCount: PUBLIC_SURFACE_SOURCE_MANIFEST["public.home"].length,
    });
    expect(report.proposedTopFive[0]).toMatchObject({
      validationStatus: "requires_human_rewrite",
      validationFailures: expect.arrayContaining(["template_placeholder_language"]),
    });
  });

  it("draft_only keeps the default Core-only selection for the override briefing date", async () => {
    const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");
    const report = await runControlledPipeline(buildConfig({
      mode: "draft_only",
      briefingDateOverride: "2026-04-28",
      testRunId: "draft-test",
    }));

    expect(persistSignalPostsForBriefing).toHaveBeenCalledWith({
      briefingDate: "2026-04-28",
      items: [
        expect.objectContaining({ id: "item-1" }),
        expect.objectContaining({ id: "item-2" }),
        expect.objectContaining({ id: "item-4" }),
        expect.objectContaining({ id: "item-5" }),
      ],
      mode: "draft_only",
    });
    expect(getPersistedItemIds()).toEqual([
      "item-1",
      "item-2",
      "item-4",
      "item-5",
    ]);
    expect(report.generatedBriefingDate).toBe("2026-04-28");
    expect(report.persistence).toMatchObject({
      ok: true,
      insertedCount: 4,
      insertedPostIds: ["row-1", "row-2", "row-3", "row-4"],
      mode: "draft_only",
    });
  });

  it("draft_only can explicitly select Core and Context rows with a max-row cap", async () => {
    const items = [
      buildItem(1),
      buildItem(2, "context_signal_eligible"),
      buildItem(3, "context_signal_eligible"),
      buildItem(4, "depth_only"),
      buildItem(5, "exclude_from_public_candidates"),
    ];
    generateDailyBriefing.mockResolvedValueOnce({
      briefing: {
        id: "briefing-phase-b",
        briefingDate: "2026-04-27T12:00:00.000Z",
        title: "Boot Up",
        intro: "Controlled test briefing.",
        readingWindow: "20 minutes",
        items: [items[0]],
      },
      publicRankedItems: items,
      pipelineRun: {
        run_id: "pipeline-phase-b",
        num_clusters: 5,
      },
    });

    const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");
    await runControlledPipeline(buildConfig({
      mode: "draft_only",
      briefingDateOverride: "2026-04-28",
      testRunId: "phase-b-draft-test",
      draftTierAllowlist: ["core_signal_eligible", "context_signal_eligible"],
      draftMaxRows: 3,
    }));

    expect(persistSignalPostsForBriefing).toHaveBeenCalledWith({
      briefingDate: "2026-04-28",
      items: [
        expect.objectContaining({ id: "item-1" }),
        expect.objectContaining({ id: "item-2" }),
        expect.objectContaining({ id: "item-3" }),
      ],
      mode: "draft_only",
    });
    expect(getPersistedItemIds()).toEqual([
      "item-1",
      "item-2",
      "item-3",
    ]);
  });

  it("draft_only max rows cap limits the explicit Core and Context selection", async () => {
    const items = [
      buildItem(1),
      buildItem(2, "context_signal_eligible"),
      buildItem(3, "context_signal_eligible"),
    ];
    generateDailyBriefing.mockResolvedValueOnce({
      briefing: {
        id: "briefing-capped",
        briefingDate: "2026-04-27T12:00:00.000Z",
        title: "Boot Up",
        intro: "Controlled test briefing.",
        readingWindow: "20 minutes",
        items: [items[0]],
      },
      publicRankedItems: items,
      pipelineRun: {
        run_id: "pipeline-capped",
        num_clusters: 3,
      },
    });

    const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");
    await runControlledPipeline(buildConfig({
      mode: "draft_only",
      briefingDateOverride: "2026-04-28",
      testRunId: "phase-b-cap-test",
      draftTierAllowlist: ["core_signal_eligible", "context_signal_eligible"],
      draftMaxRows: 2,
    }));

    expect(persistSignalPostsForBriefing).toHaveBeenCalledWith({
      briefingDate: "2026-04-28",
      items: [
        expect.objectContaining({ id: "item-1" }),
        expect.objectContaining({ id: "item-2" }),
      ],
      mode: "draft_only",
    });
    expect(getPersistedItemIds()).toEqual([
      "item-1",
      "item-2",
    ]);
  });

  it("draft_only product-target cap selects five Core and two Context rows without Depth", async () => {
    const items = [
      buildItem(1),
      buildItem(2),
      buildItem(3),
      buildItem(4),
      buildItem(5),
      buildItem(6, "context_signal_eligible"),
      buildItem(7, "context_signal_eligible"),
      buildItem(8, "depth_only"),
      buildItem(9, "exclude_from_public_candidates"),
    ];
    generateDailyBriefing.mockResolvedValueOnce({
      briefing: {
        id: "briefing-product-target",
        briefingDate: "2026-04-27T12:00:00.000Z",
        title: "Boot Up",
        intro: "Controlled test briefing.",
        readingWindow: "20 minutes",
        items: items.slice(0, 5),
      },
      publicRankedItems: items,
      pipelineRun: {
        run_id: "pipeline-product-target",
        num_clusters: 9,
      },
    });

    const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");
    await runControlledPipeline(buildConfig({
      mode: "draft_only",
      briefingDateOverride: "2026-04-29",
      testRunId: "core-context-product-target",
      draftTierAllowlist: ["core_signal_eligible", "context_signal_eligible"],
      draftMaxRows: 7,
    }));

    expect(persistSignalPostsForBriefing).toHaveBeenCalledWith({
      briefingDate: "2026-04-29",
      items: [
        expect.objectContaining({ id: "item-1" }),
        expect.objectContaining({ id: "item-2" }),
        expect.objectContaining({ id: "item-3" }),
        expect.objectContaining({ id: "item-4" }),
        expect.objectContaining({ id: "item-5" }),
        expect.objectContaining({ id: "item-6" }),
        expect.objectContaining({ id: "item-7" }),
      ],
      mode: "draft_only",
    });
    expect(getPersistedItemIds()).toEqual([
      "item-1",
      "item-2",
      "item-3",
      "item-4",
      "item-5",
      "item-6",
      "item-7",
    ]);
    expect(getPersistedItemIds()).not.toContain("item-8");
    expect(getPersistedItemIds()).not.toContain("item-9");
  });

  it("draft_only product-target cap keeps Context rows when more than five Core rows rank first", async () => {
    const items = [
      buildItem(1),
      buildItem(2),
      buildItem(3),
      buildItem(4),
      buildItem(5),
      buildItem(6),
      buildItem(7),
      buildItem(8, "context_signal_eligible"),
      buildItem(9, "context_signal_eligible"),
      buildItem(10, "depth_only"),
    ];
    generateDailyBriefing.mockResolvedValueOnce({
      briefing: {
        id: "briefing-product-target-context-preserved",
        briefingDate: "2026-04-27T12:00:00.000Z",
        title: "Boot Up",
        intro: "Controlled test briefing.",
        readingWindow: "20 minutes",
        items: items.slice(0, 5),
      },
      publicRankedItems: items,
      pipelineRun: {
        run_id: "pipeline-product-target-context-preserved",
        num_clusters: 10,
      },
    });

    const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");
    const report = await runControlledPipeline(buildConfig({
      mode: "draft_only",
      briefingDateOverride: "2026-04-29",
      testRunId: "core-context-product-target-context-preserved",
      draftTierAllowlist: ["core_signal_eligible", "context_signal_eligible"],
      draftMaxRows: 7,
    }));

    expect(getPersistedItemIds()).toEqual([
      "item-1",
      "item-2",
      "item-3",
      "item-4",
      "item-5",
      "item-8",
      "item-9",
    ]);
    expect(getPersistedItemIds()).not.toContain("item-6");
    expect(getPersistedItemIds()).not.toContain("item-7");
    expect(getPersistedItemIds()).not.toContain("item-10");
    expect(report.proposedTopFive.map((row) => row.title)).toEqual([
      "Generated signal 1",
      "Generated signal 2",
      "Generated signal 3",
      "Generated signal 4",
      "Generated signal 5",
    ]);
    expect(report.proposedContextRows.map((row) => row.title)).toEqual([
      "Generated signal 8",
      "Generated signal 9",
    ]);
  });

  it("draft_only product-target cap never selects more than seven Core and Context rows", async () => {
    const items = [
      buildItem(1),
      buildItem(2),
      buildItem(3),
      buildItem(4),
      buildItem(5),
      buildItem(6, "context_signal_eligible"),
      buildItem(7, "context_signal_eligible"),
      buildItem(8, "context_signal_eligible"),
    ];
    generateDailyBriefing.mockResolvedValueOnce({
      briefing: {
        id: "briefing-product-target-capped",
        briefingDate: "2026-04-27T12:00:00.000Z",
        title: "Boot Up",
        intro: "Controlled test briefing.",
        readingWindow: "20 minutes",
        items: items.slice(0, 5),
      },
      publicRankedItems: items,
      pipelineRun: {
        run_id: "pipeline-product-target-capped",
        num_clusters: 8,
      },
    });

    const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");
    await runControlledPipeline(buildConfig({
      mode: "draft_only",
      briefingDateOverride: "2026-04-29",
      testRunId: "core-context-product-target-capped",
      draftTierAllowlist: ["core_signal_eligible", "context_signal_eligible"],
      draftMaxRows: 7,
    }));

    expect(getPersistedItemIds()).toEqual([
      "item-1",
      "item-2",
      "item-3",
      "item-4",
      "item-5",
      "item-6",
      "item-7",
    ]);
    expect(getPersistedItemIds()).not.toContain("item-8");
  });

  it("replays dry_run from a valid controlled artifact without live ingestion or writes", async () => {
    const { artifactPath, cleanup } = await writeReplayArtifact(buildReplayArtifact());

    try {
      const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");
      const report = await runControlledPipeline(buildConfig({
        mode: "dry_run",
        briefingDateOverride: "2026-04-28",
        testRunId: "replay-dry-run",
        draftTierAllowlist: ["core_signal_eligible", "context_signal_eligible"],
        draftMaxRows: 3,
        replayArtifactPath: artifactPath,
        replayExpectedRunId: "pipeline-replay-source",
      }));

      expect(generateDailyBriefing).not.toHaveBeenCalled();
      expect(persistSignalPostsForBriefing).not.toHaveBeenCalled();
      expect(report.runId).toBe("pipeline-replay-source");
      expect(report.persistence).toBeNull();
      expect(report.proposedTopFive).toHaveLength(1);
      expect(report.proposedContextRows).toHaveLength(2);
      expect(report.proposedDepthRows).toHaveLength(0);
      expect(report.excludedCandidates).toHaveLength(0);
    } finally {
      await cleanup();
    }
  });

  it("replay draft_only selection respects Core and Context allowlist without Depth or Excluded rows", async () => {
    const { artifactPath, cleanup } = await writeReplayArtifact(buildReplayArtifact());

    try {
      const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");
      await runControlledPipeline(buildConfig({
        mode: "draft_only",
        briefingDateOverride: "2026-04-28",
        testRunId: "replay-draft-only",
        draftTierAllowlist: ["core_signal_eligible", "context_signal_eligible"],
        draftMaxRows: 3,
        replayArtifactPath: artifactPath,
      }));

      expect(generateDailyBriefing).not.toHaveBeenCalled();
      expect(persistSignalPostsForBriefing).toHaveBeenCalledWith({
        briefingDate: "2026-04-28",
        items: [
          expect.objectContaining({ id: "replay-replay-1" }),
          expect.objectContaining({ id: "replay-replay-2" }),
          expect.objectContaining({ id: "replay-replay-3" }),
        ],
        mode: "draft_only",
      });
      expect(getPersistedItemIds()).toEqual([
        "replay-replay-1",
        "replay-replay-2",
        "replay-replay-3",
      ]);
    } finally {
      await cleanup();
    }
  });

  it("replay max rows cap limits selected Core and Context rows", async () => {
    const { artifactPath, cleanup } = await writeReplayArtifact(buildReplayArtifact());

    try {
      const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");
      await runControlledPipeline(buildConfig({
        mode: "draft_only",
        briefingDateOverride: "2026-04-28",
        testRunId: "replay-draft-only-capped",
        draftTierAllowlist: ["core_signal_eligible", "context_signal_eligible"],
        draftMaxRows: 2,
        replayArtifactPath: artifactPath,
      }));

      expect(getPersistedItemIds()).toEqual([
        "replay-replay-1",
        "replay-replay-2",
      ]);
    } finally {
      await cleanup();
    }
  });

  it("replay draft_only follows the seven-row Core/Context product-target cap without Depth", async () => {
    const { artifactPath, cleanup } = await writeReplayArtifact(buildReplayArtifact({
      proposedTopFive: [
        buildReplaySignal(1),
        buildReplaySignal(2),
        buildReplaySignal(3),
        buildReplaySignal(4),
        buildReplaySignal(5),
      ],
      proposedContextRows: [
        buildReplaySignal(6, "context_signal_eligible"),
        buildReplaySignal(7, "context_signal_eligible"),
      ],
      proposedDepthRows: [buildReplaySignal(8, "depth_only")],
    }));

    try {
      const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");
      await runControlledPipeline(buildConfig({
        mode: "draft_only",
        briefingDateOverride: "2026-04-29",
        testRunId: "replay-product-target-draft-only",
        draftTierAllowlist: ["core_signal_eligible", "context_signal_eligible"],
        draftMaxRows: 7,
        replayArtifactPath: artifactPath,
      }));

      expect(getPersistedItemIds()).toEqual([
        "replay-replay-1",
        "replay-replay-2",
        "replay-replay-3",
        "replay-replay-4",
        "replay-replay-5",
        "replay-replay-6",
        "replay-replay-7",
      ]);
      expect(getPersistedItemIds()).not.toContain("replay-replay-8");
    } finally {
      await cleanup();
    }
  });

  it("replay draft_only preserves WITM validation metadata from the source artifact", async () => {
    const { artifactPath, cleanup } = await writeReplayArtifact(buildReplayArtifact({
      proposedTopFive: [
        buildReplaySignal(1, "core_signal_eligible", {
          title: "Economic Letter Countdown: Most Read Topics from 2025",
          whyItMatters:
            "Economic Letter Countdown: Most Read Topics from 2025, which matters because it shows which inflation, labor, and growth questions dominated institutional attention.",
          validationStatus: "requires_human_rewrite",
          validationFailures: ["unsupported_structural_claim"],
          validationDetails: [
            "unsupported_structural_claim: Core WITM is attached to a retrospective or meta-story that needs selection review before publication.",
          ],
        }),
      ],
      proposedContextRows: [buildReplaySignal(2, "context_signal_eligible")],
      proposedDepthRows: [buildReplaySignal(3, "depth_only")],
    }));

    try {
      const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");
      const report = await runControlledPipeline(buildConfig({
        mode: "draft_only",
        briefingDateOverride: "2026-04-29",
        testRunId: "replay-metadata-draft-only",
        draftTierAllowlist: ["core_signal_eligible", "context_signal_eligible"],
        draftMaxRows: 2,
        replayArtifactPath: artifactPath,
      }));

      expect(persistSignalPostsForBriefing).toHaveBeenCalledWith({
        briefingDate: "2026-04-29",
        items: [
          expect.objectContaining({
            id: "replay-replay-1",
            whyItMattersValidation: {
              passed: false,
              failures: ["unsupported_structural_claim"],
              failureDetails: [
                "unsupported_structural_claim: Core WITM is attached to a retrospective or meta-story that needs selection review before publication.",
              ],
              recommendedAction: "requires_human_rewrite",
            },
          }),
          expect.objectContaining({
            id: "replay-replay-2",
            whyItMattersValidation: {
              passed: true,
              failures: [],
              failureDetails: [],
              recommendedAction: "approve",
            },
          }),
        ],
        mode: "draft_only",
      });
      expect(report.proposedTopFive[0].validationStatus).toBe("requires_human_rewrite");
      expect(report.proposedTopFive[0].validationFailures).toEqual(["unsupported_structural_claim"]);
      expect(report.proposedTopFive[0].validationDetails).toEqual([
        "unsupported_structural_claim: Core WITM is attached to a retrospective or meta-story that needs selection review before publication.",
      ]);
      expect(report.proposedDepthRows).toHaveLength(0);
    } finally {
      await cleanup();
    }
  });

  it("replay fails closed for missing artifacts", async () => {
    const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");

    await expect(runControlledPipeline(buildConfig({
      mode: "dry_run",
      replayArtifactPath: "/tmp/missing-phase-b-replay-artifact.json",
    }))).rejects.toThrow(/could not be read/);
  });

  it("replay fails closed for malformed artifacts", async () => {
    const { artifactPath, cleanup } = await writeReplayArtifact({
      mode: "dry_run",
      runId: "pipeline-bad",
      persistence: null,
    });

    try {
      const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");

      await expect(runControlledPipeline(buildConfig({
        mode: "dry_run",
        replayArtifactPath: artifactPath,
      }))).rejects.toThrow(/proposedTopFive/);
    } finally {
      await cleanup();
    }
  });

  it("replay fails closed when selected artifact tiers are outside the allowlist", async () => {
    const { artifactPath, cleanup } = await writeReplayArtifact(buildReplayArtifact());

    try {
      const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");

      await expect(runControlledPipeline(buildConfig({
        mode: "dry_run",
        draftTierAllowlist: ["core_signal_eligible"],
        draftMaxRows: 3,
        replayArtifactPath: artifactPath,
      }))).rejects.toThrow(/outside PIPELINE_DRAFT_TIER_ALLOWLIST/);
    } finally {
      await cleanup();
    }
  });

  it("keeps replay unavailable unless the explicit replay artifact config is set", async () => {
    const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");
    await runControlledPipeline(buildConfig({ mode: "dry_run" }));

    expect(generateDailyBriefing).toHaveBeenCalledTimes(1);
  });

  it("refuses normal mode from the controlled test runner", async () => {
    const { runControlledPipeline } = await import("@/lib/pipeline/controlled-runner");

    await expect(runControlledPipeline(buildConfig({ mode: "normal", testRunId: null }))).rejects.toThrow(
      /limited to dry_run and draft_only/i,
    );
  });
});
